import logging
import time
from datetime import datetime
from pathlib import Path
from uuid import UUID

from app.database import SessionLocal, is_database_configured
from app.models import Document
from app.schemas.document_schema import DocumentDetail, DocumentExtractResponse
from app.services.extractors.extractor_factory import ExtractorFactory

logger = logging.getLogger(__name__)

BASE_DIR = Path(__file__).resolve().parents[2]


def _format_datetime(value) -> str | None:
    return value.isoformat(timespec="seconds") if value else None


def _resolve_upload_path(file_path: str) -> Path:
    path = Path(file_path)

    if path.is_absolute():
        return path

    return BASE_DIR / path


def _delete_source_file(upload_path: Path) -> None:
    if upload_path.exists() and upload_path.is_file():
        upload_path.unlink()


def _document_to_detail(document: Document) -> DocumentDetail:
    extracted_text = document.extracted_text or ""

    return DocumentDetail(
        id=str(document.id),
        original_filename=document.original_filename,
        stored_filename=document.stored_filename,
        file_type=document.file_type,
        file_size=document.file_size,
        file_path=document.file_path,
        status=document.status,
        uploaded_at=_format_datetime(document.uploaded_at) or "",
        error_message=document.error_message,
        updated_at=_format_datetime(document.updated_at),
        text_length=len(extracted_text),
        preview=extracted_text[:5000] if extracted_text else None,
    )


def get_document_detail(document_id: str) -> DocumentDetail | None:
    if not is_database_configured():
        raise RuntimeError("Database is not configured")

    try:
        document_uuid = UUID(document_id)
    except ValueError:
        return None

    with SessionLocal() as db:
        document = db.get(Document, document_uuid)

        if document is None:
            return None

        return _document_to_detail(document)


def extract_document_text(document_id: str) -> DocumentExtractResponse | None:
    if not is_database_configured():
        raise RuntimeError("Database is not configured")

    try:
        document_uuid = UUID(document_id)
    except ValueError:
        return None

    with SessionLocal() as db:
        document = db.get(Document, document_uuid)

        if document is None:
            return None

        if document.status == "archived":
            raise ValueError("Archived documents cannot be extracted")

        if document.extracted_text and not document.file_path:
            return DocumentExtractResponse(
                document_id=str(document.id),
                status=document.status,
                text_length=len(document.extracted_text),
                error_message=document.error_message,
            )

        upload_path = _resolve_upload_path(document.file_path)

        if not upload_path.exists() or not upload_path.is_file():
            document.status = "failed"
            document.error_message = "Uploaded file does not exist"
            document.updated_at = datetime.now()
            db.commit()
            raise FileNotFoundError(document.error_message)

        extractor = ExtractorFactory.get_extractor(str(upload_path))
        extractor_name = extractor.__class__.__name__
        started_at = time.perf_counter()

        document.status = "processing"
        document.error_message = None
        document.updated_at = datetime.now()
        db.commit()

        try:
            extracted_text = extractor.extract(str(upload_path))

            if not extracted_text.strip():
                raise ValueError("Extracted text is empty")

            document.extracted_text = extracted_text
            document.status = "completed"
            document.error_message = None
            _delete_source_file(upload_path)
            document.file_path = ""
            document.updated_at = datetime.now()
            db.commit()
            db.refresh(document)

            elapsed = time.perf_counter() - started_at
            logger.info(
                "document_text_extraction document_id=%s filename=%s extractor=%s elapsed=%.3fs chars=%s status=%s",
                document.id,
                document.original_filename,
                extractor_name,
                elapsed,
                len(extracted_text),
                document.status,
            )

            return DocumentExtractResponse(
                document_id=str(document.id),
                status=document.status,
                text_length=len(extracted_text),
                error_message=None,
            )
        except Exception as exc:
            document.status = "failed"
            document.error_message = str(exc)
            _delete_source_file(upload_path)
            document.file_path = ""
            document.updated_at = datetime.now()
            db.commit()

            elapsed = time.perf_counter() - started_at
            logger.info(
                "document_text_extraction document_id=%s filename=%s extractor=%s elapsed=%.3fs chars=%s status=%s",
                document.id,
                document.original_filename,
                extractor_name,
                elapsed,
                0,
                document.status,
            )

            return DocumentExtractResponse(
                document_id=str(document.id),
                status=document.status,
                text_length=0,
                error_message=document.error_message,
            )
