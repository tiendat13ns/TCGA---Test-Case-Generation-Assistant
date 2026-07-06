from fastapi import APIRouter, File, HTTPException, UploadFile

from app.schemas.document_schema import DocumentMetadata
from app.services.file_service import clear_upload_history, list_documents, save_upload_files

router = APIRouter(prefix="/api/documents", tags=["documents"])


@router.post("/upload", response_model=list[DocumentMetadata])
async def upload_document(files: list[UploadFile] = File(...)):
    try:
        return await save_upload_files(files)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except OSError as exc:
        raise HTTPException(status_code=500, detail="Could not save uploaded file") from exc


@router.get("", response_model=list[DocumentMetadata])
def get_documents():
    return list_documents()


@router.delete("")
def delete_documents():
    try:
        clear_upload_history()
    except OSError as exc:
        raise HTTPException(status_code=500, detail="Could not clear upload history") from exc

    return {"status": "cleared"}
