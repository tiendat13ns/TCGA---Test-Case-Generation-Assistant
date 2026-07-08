import os
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker

BACKEND_DIR = Path(__file__).resolve().parents[1]
load_dotenv(BACKEND_DIR / ".env")

DATABASE_URL = os.getenv("DATABASE_URL", "").strip()
PLACEHOLDER_VALUES = {"", "postgresql://postgres:password@host:5432/postgres"}

Base = declarative_base()

engine = None
SessionLocal = None

if DATABASE_URL not in PLACEHOLDER_VALUES:
    engine = create_engine(DATABASE_URL, pool_pre_ping=True)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def is_database_configured() -> bool:
    return engine is not None and SessionLocal is not None


def init_db() -> None:
    if not is_database_configured():
        return

    from app import models  # noqa: F401

    Base.metadata.create_all(bind=engine)
    _ensure_document_columns()
    _ensure_requirement_columns()
    _ensure_agent_log_columns()
    _ensure_test_case_columns()


def _ensure_test_case_columns() -> None:
    add_column_statements = [
        "ALTER TABLE test_cases ADD COLUMN IF NOT EXISTS document_id UUID",
        "ALTER TABLE test_cases ADD COLUMN IF NOT EXISTS scenario TEXT",
        "ALTER TABLE test_cases ADD COLUMN IF NOT EXISTS preconditions TEXT",
        "ALTER TABLE test_cases ADD COLUMN IF NOT EXISTS test_steps JSON",
        "ALTER TABLE test_cases ADD COLUMN IF NOT EXISTS test_data TEXT",
        "ALTER TABLE test_cases ADD COLUMN IF NOT EXISTS severity TEXT",
        "ALTER TABLE test_cases ADD COLUMN IF NOT EXISTS test_type TEXT",
        "ALTER TABLE test_cases ADD COLUMN IF NOT EXISTS automation_candidate BOOLEAN NOT NULL DEFAULT FALSE",
        "ALTER TABLE test_cases ADD COLUMN IF NOT EXISTS execution_type TEXT NOT NULL DEFAULT 'Manual'",
        "ALTER TABLE test_cases ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1",
        "ALTER TABLE test_cases ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE",
    ]
    # Fix legacy columns whose types differ from our model
    fix_type_statements = [
        # Old schema had test_data as JSON; convert to TEXT so plain strings can be stored
        "ALTER TABLE test_cases ALTER COLUMN test_data TYPE TEXT USING test_data::TEXT",
    ]

    with engine.begin() as connection:
        for statement in add_column_statements:
            connection.execute(text(statement))
        for statement in fix_type_statements:
            connection.execute(text(statement))


def _ensure_document_columns() -> None:
    statements = [
        "ALTER TABLE documents ADD COLUMN IF NOT EXISTS extracted_text TEXT",
        "ALTER TABLE documents ADD COLUMN IF NOT EXISTS error_message TEXT",
        "ALTER TABLE documents ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE",
    ]

    with engine.begin() as connection:
        for statement in statements:
            connection.execute(text(statement))


def _ensure_requirement_columns() -> None:
    statements = [
        "ALTER TABLE requirements ADD COLUMN IF NOT EXISTS project_id UUID",
        "ALTER TABLE requirements ADD COLUMN IF NOT EXISTS functional_requirement TEXT",
        "ALTER TABLE requirements ADD COLUMN IF NOT EXISTS validation_rule JSON",
        "ALTER TABLE requirements ADD COLUMN IF NOT EXISTS permission JSON",
        "ALTER TABLE requirements ADD COLUMN IF NOT EXISTS workflow JSON",
        "ALTER TABLE requirements ADD COLUMN IF NOT EXISTS state JSON",
        "ALTER TABLE requirements ADD COLUMN IF NOT EXISTS error_handling JSON",
        "ALTER TABLE requirements ADD COLUMN IF NOT EXISTS module_name TEXT",
        "ALTER TABLE requirements ADD COLUMN IF NOT EXISTS feature_name TEXT",
        "ALTER TABLE requirements ADD COLUMN IF NOT EXISTS actor TEXT",
        "ALTER TABLE requirements ADD COLUMN IF NOT EXISTS business_rules JSON",
        "ALTER TABLE requirements ADD COLUMN IF NOT EXISTS inputs JSON",
        "ALTER TABLE requirements ADD COLUMN IF NOT EXISTS outputs JSON",
        "ALTER TABLE requirements ADD COLUMN IF NOT EXISTS preconditions JSON",
        "ALTER TABLE requirements ADD COLUMN IF NOT EXISTS validation_rules JSON",
        "ALTER TABLE requirements ADD COLUMN IF NOT EXISTS exception_flows JSON",
        "ALTER TABLE requirements ADD COLUMN IF NOT EXISTS source_reference TEXT",
        "ALTER TABLE requirements ADD COLUMN IF NOT EXISTS confidence_score DOUBLE PRECISION",
        "ALTER TABLE requirements ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1",
        "ALTER TABLE requirements ADD COLUMN IF NOT EXISTS created_by UUID",
        "ALTER TABLE requirements ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE",
    ]

    with engine.begin() as connection:
        for statement in statements:
            connection.execute(text(statement))


def _ensure_agent_log_columns() -> None:
    statements = [
        "ALTER TABLE agent_logs ADD COLUMN IF NOT EXISTS task_type TEXT",
        "ALTER TABLE agent_logs ADD COLUMN IF NOT EXISTS provider TEXT",
        "ALTER TABLE agent_logs ADD COLUMN IF NOT EXISTS model TEXT",
        "ALTER TABLE agent_logs ADD COLUMN IF NOT EXISTS status TEXT",
        "ALTER TABLE agent_logs ADD COLUMN IF NOT EXISTS input_reference_id UUID",
        "ALTER TABLE agent_logs ADD COLUMN IF NOT EXISTS input_type TEXT",
        "ALTER TABLE agent_logs ADD COLUMN IF NOT EXISTS prompt_preview TEXT",
        "ALTER TABLE agent_logs ADD COLUMN IF NOT EXISTS raw_output TEXT",
        "ALTER TABLE agent_logs ADD COLUMN IF NOT EXISTS error_message TEXT",
        "ALTER TABLE agent_logs ADD COLUMN IF NOT EXISTS execution_time_ms INTEGER",
    ]

    with engine.begin() as connection:
        for statement in statements:
            connection.execute(text(statement))


def check_database_connection() -> tuple[bool, str | None]:
    if not is_database_configured():
        return False, "DATABASE_URL is not configured"

    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        return True, None
    except Exception as exc:
        return False, str(exc)
