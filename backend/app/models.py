import uuid

from sqlalchemy import BigInteger, Column, DateTime, Float, ForeignKey, Integer, JSON, Text
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


class Requirement(Base):
    __tablename__ = "requirements"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), nullable=True)
    document_id = Column(UUID(as_uuid=True), ForeignKey("documents.id"), nullable=False)
    title = Column(Text, nullable=False)
    description = Column(Text, nullable=False)
    functional_requirement = Column(Text, nullable=True)
    validation_rule = Column(JSON, nullable=True)
    permission = Column(JSON, nullable=True)
    workflow = Column(JSON, nullable=True)
    state = Column(JSON, nullable=True)
    error_handling = Column(JSON, nullable=True)
    module_name = Column(Text, nullable=True)
    feature_name = Column(Text, nullable=True)
    actor = Column(Text, nullable=True)
    business_rules = Column(JSON, nullable=True)
    inputs = Column(JSON, nullable=True)
    outputs = Column(JSON, nullable=True)
    preconditions = Column(JSON, nullable=True)
    validation_rules = Column(JSON, nullable=True)
    exception_flows = Column(JSON, nullable=True)
    source_reference = Column(Text, nullable=True)
    confidence_score = Column(Float, nullable=True)
    status = Column(Text, nullable=False, default="ai_generated")
    version = Column(Integer, nullable=False, default=1)
    created_by = Column(UUID(as_uuid=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=True)


class AgentLog(Base):
    __tablename__ = "agent_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    task_type = Column(Text, nullable=False)
    provider = Column(Text, nullable=False)
    model = Column(Text, nullable=False)
    status = Column(Text, nullable=False)
    input_reference_id = Column(UUID(as_uuid=True), nullable=True)
    input_type = Column(Text, nullable=True)
    prompt_preview = Column(Text, nullable=True)
    raw_output = Column(Text, nullable=True)
    error_message = Column(Text, nullable=True)
    execution_time_ms = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
