from pydantic import BaseModel


class DocumentMetadata(BaseModel):
    id: str
    original_filename: str
    stored_filename: str
    file_type: str
    file_size: int
    file_path: str
    status: str
    uploaded_at: str
