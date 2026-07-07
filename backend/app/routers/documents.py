from fastapi import APIRouter, File, HTTPException, UploadFile
from sqlalchemy.exc import SQLAlchemyError

from app.schemas.document_schema import DocumentDeleteRequest, DocumentDetail, DocumentExtractResponse, DocumentMetadata
from app.services.file_service import (
    clear_upload_history,
    delete_documents_by_ids,
    list_documents,
    save_upload_files,
)
from app.services.document_text_service import extract_document_text, get_document_detail

router = APIRouter(prefix="/api/documents", tags=["documents"])


@router.post("/upload", response_model=list[DocumentMetadata])
async def upload_document(files: list[UploadFile] = File(...)):
    try:
        return await save_upload_files(files)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except OSError as exc:
        raise HTTPException(status_code=500, detail="Could not save uploaded file") from exc
    except SQLAlchemyError as exc:
        raise HTTPException(status_code=500, detail="Database error while saving document") from exc


@router.get("", response_model=list[DocumentMetadata])
def get_documents():
    try:
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
