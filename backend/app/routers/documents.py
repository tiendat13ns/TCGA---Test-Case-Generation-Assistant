from fastapi import APIRouter, Depends, File, HTTPException, Query, Request, UploadFile
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.schemas.document_schema import DocumentDeleteRequest, DocumentDetail, DocumentExtractResponse, DocumentMetadata
from app.services.documents.file_service import (
    clear_upload_history,
    delete_documents_by_ids,
    list_documents,
    list_documents_by_project,
    save_upload_files,
)
from app.services.documents.document_text_service import extract_document_text, get_document_detail
from app.services.credit_service import deduct_user_credits, check_document_upload_quota
from app.database import SessionLocal

router = APIRouter(prefix="/api/documents", tags=["documents"])


def _get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _try_get_user(request: Request, db: Session):
    """Lấy user từ Bearer token. Trả về None nếu không có auth header (graceful fallback)."""
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return None
    try:
        from app.core.auth import get_current_user_from_token
        return get_current_user_from_token(auth[7:], db)
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning("Failed to get user from token in upload: %s", e)
        return None


@router.post("/upload", response_model=list[DocumentMetadata])
async def upload_document(
    request: Request,
    files: list[UploadFile] = File(...),
    project_id: str | None = Query(default=None, description="ID của project để gắn tài liệu. Nếu không truyền, document sẽ không thuộc project nào."),
    db: Session = Depends(_get_db),
):
    # Kiểm tra quota và trừ credit nếu user đã đăng nhập
    user = _try_get_user(request, db)
    if user:
        check_document_upload_quota(db, user, num_new_files=len(files))
        # Trừ 2 Credits cho mỗi file upload
        for f in files:
            deduct_user_credits(db, user, "DOCUMENT_INGESTION", target_name=f.filename)

    try:
        result = await save_upload_files(files, project_id=project_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except OSError as exc:
        raise HTTPException(status_code=500, detail="Could not save uploaded file") from exc
    except SQLAlchemyError as exc:
        raise HTTPException(status_code=500, detail="Database error while saving document") from exc

    if user and result:
        # Cộng dồn theo số document THẬT SỰ được tạo (1 file zip có thể sinh nhiều document)
        # để lần kiểm tra quota tiếp theo chính xác, không phụ thuộc số document còn tồn tại.
        user.documents_uploaded_total = (user.documents_uploaded_total or 0) + len(result)
        db.add(user)
        db.commit()

    return result


@router.get("", response_model=list[DocumentMetadata])
def get_documents(
    project_id: str | None = Query(default=None, description="Lọc documents theo project_id. Nếu không truyền, trả về tất cả documents."),
):
    try:
        if project_id:
            return list_documents_by_project(project_id)
        return list_documents()
    except SQLAlchemyError as exc:
        raise HTTPException(status_code=500, detail="Database error while loading documents") from exc


@router.get("/{document_id}", response_model=DocumentDetail)
def get_document(document_id: str):
    try:
        document = get_document_detail(document_id)
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    except SQLAlchemyError as exc:
        raise HTTPException(status_code=500, detail="Database error while loading document") from exc

    if document is None:
        raise HTTPException(status_code=404, detail="Document not found")

    return document


@router.post("/{document_id}/extract-text", response_model=DocumentExtractResponse)
def post_extract_text(document_id: str):
    try:
        result = extract_document_text(document_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except FileNotFoundError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    except SQLAlchemyError as exc:
        raise HTTPException(status_code=500, detail="Database error while extracting text") from exc

    if result is None:
        raise HTTPException(status_code=404, detail="Document not found")

    return result


@router.delete("")
def delete_documents():
    try:
        clear_upload_history()
    except OSError as exc:
        raise HTTPException(status_code=500, detail="Could not clear upload history") from exc
    except SQLAlchemyError as exc:
        raise HTTPException(status_code=500, detail="Database error while clearing upload history") from exc

    return {"status": "cleared"}


@router.delete("/selected")
def delete_selected_documents(payload: DocumentDeleteRequest):
    try:
        deleted_count = delete_documents_by_ids(payload.ids)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except OSError as exc:
        raise HTTPException(status_code=500, detail="Could not delete selected uploaded files") from exc
    except SQLAlchemyError as exc:
        raise HTTPException(status_code=500, detail="Database error while deleting selected documents") from exc

    return {"status": "deleted", "deleted_count": deleted_count}
