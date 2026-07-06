import json
import re
import zipfile
from io import BytesIO
from datetime import datetime
from pathlib import Path
from uuid import uuid4

from fastapi import UploadFile

from app.schemas.document_schema import DocumentMetadata

BASE_DIR = Path(__file__).resolve().parents[2]
UPLOAD_DIR = BASE_DIR / "uploads"
METADATA_FILE = UPLOAD_DIR / "documents.json"
MAX_FILE_SIZE = 10 * 1024 * 1024
ALLOWED_EXTENSIONS = {"pdf", "docx", "txt", "md", "xlsx", "csv", "dbml"}
ZIP_EXTENSION = "zip"


def _ensure_storage() -> None:
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    if not METADATA_FILE.exists():
        METADATA_FILE.write_text("[]", encoding="utf-8")


def _read_metadata() -> list[dict]:
    _ensure_storage()
    try:
        return json.loads(METADATA_FILE.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return []


def _write_metadata(documents: list[dict]) -> None:
    _ensure_storage()
    METADATA_FILE.write_text(
        json.dumps(documents, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def _safe_filename(filename: str) -> str:
    name = Path(filename).name.strip()
    return re.sub(r"[^A-Za-z0-9._-]", "_", name)


def _file_type(filename: str) -> str:
    return Path(filename).suffix.lower().lstrip(".")


def _validate_content(filename: str, content: bytes, allowed_extensions: set[str]) -> str:
    file_type = _file_type(filename)

    if not file_type:
        raise ValueError(f"File type is required: {filename}")

    if file_type not in allowed_extensions:
        allowed = ", ".join(sorted(allowed_extensions))
        raise ValueError(f"Invalid file type for {filename}. Allowed types: {allowed}")

    if len(content) == 0:
        raise ValueError(f"File is empty: {filename}")

    if len(content) > MAX_FILE_SIZE:
        raise ValueError(f"File exceeds maximum size of 10MB: {filename}")

    return file_type


def _save_document(original_filename: str, content: bytes) -> DocumentMetadata:
    safe_original_filename = _safe_filename(original_filename)
    file_type = _validate_content(safe_original_filename, content, ALLOWED_EXTENSIONS)
    document_id = str(uuid4())
    stored_filename = f"{document_id}_{safe_original_filename}"
    destination = UPLOAD_DIR / stored_filename
    destination.write_bytes(content)

    return DocumentMetadata(
        id=document_id,
        original_filename=original_filename,
        stored_filename=stored_filename,
        file_type=file_type,
        file_size=len(content),
        file_path=f"uploads/{stored_filename}",
        status="uploaded",
        uploaded_at=datetime.now().isoformat(timespec="seconds"),
    )


def _save_zip_documents(original_filename: str, content: bytes) -> list[DocumentMetadata]:
    _validate_content(original_filename, content, {ZIP_EXTENSION})

    try:
        archive = zipfile.ZipFile(BytesIO(content))
    except zipfile.BadZipFile as exc:
        raise ValueError(f"Invalid zip file: {original_filename}") from exc

    documents: list[DocumentMetadata] = []

    with archive:
        for entry in archive.infolist():
            if entry.is_dir():
                continue

            entry_name = Path(entry.filename).name
            if not entry_name:
                continue

            if Path(entry.filename).is_absolute() or ".." in Path(entry.filename).parts:
                raise ValueError(f"Invalid file path inside zip: {entry.filename}")

            safe_entry_name = _safe_filename(entry_name)
            entry_content = archive.read(entry)
            _validate_content(safe_entry_name, entry_content, ALLOWED_EXTENSIONS)
            documents.append(_save_document(safe_entry_name, entry_content))

    if not documents:
        raise ValueError("Zip file does not contain any supported documents")

    return documents


def list_documents() -> list[DocumentMetadata]:
    documents = _read_metadata()
    return [DocumentMetadata(**document) for document in reversed(documents)]


def clear_upload_history() -> None:
    _ensure_storage()

    for file_path in UPLOAD_DIR.iterdir():
        if file_path.name in {".gitkeep", "documents.json"}:
            continue

        if file_path.is_file():
            file_path.unlink()

    _write_metadata([])


async def save_upload_file(file: UploadFile) -> list[DocumentMetadata]:
    if not file or not file.filename:
        raise ValueError("File is required")

    content = await file.read()
    original_filename = _safe_filename(file.filename)
    upload_type = _file_type(original_filename)

    if not upload_type:
        raise ValueError(f"File type is required: {file.filename}")

    if upload_type == ZIP_EXTENSION:
        uploaded_documents = _save_zip_documents(original_filename, content)
    elif upload_type in ALLOWED_EXTENSIONS:
        uploaded_documents = [_save_document(file.filename, content)]
    else:
        allowed = ", ".join(sorted(ALLOWED_EXTENSIONS | {ZIP_EXTENSION}))
        raise ValueError(f"Invalid file type for {file.filename}. Allowed types: {allowed}")

    documents = _read_metadata()
    documents.extend(document.model_dump() for document in uploaded_documents)
    _write_metadata(documents)

    return uploaded_documents


async def save_upload_files(files: list[UploadFile]) -> list[DocumentMetadata]:
    if not files:
        raise ValueError("At least one file is required")

    uploaded_documents: list[DocumentMetadata] = []
    for file in files:
        uploaded_documents.extend(await save_upload_file(file))

    return uploaded_documents
