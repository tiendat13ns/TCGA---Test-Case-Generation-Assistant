import uuid

from sqlalchemy import BigInteger, Column, DateTime, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from app.database import Base


class Document(Base):
    __tablename__ = "documents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    original_filename = Column(Text, nullable=False)
    stored_filename = Column(Text, nullable=False)
    file_type = Column(Text, nullable=False)
    file_size = Column(BigInteger, nullable=False)
    file_path = Column(Text, nullable=False)
    extracted_text = Column(Text, nullable=True)
    error_message = Column(Text, nullable=True)
    status = Column(Text, nullable=False, default="uploaded")
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=True)
