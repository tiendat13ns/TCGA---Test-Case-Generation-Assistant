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


def _ensure_document_columns() -> None:
    statements = [
        "ALTER TABLE documents ADD COLUMN IF NOT EXISTS extracted_text TEXT",
        "ALTER TABLE documents ADD COLUMN IF NOT EXISTS error_message TEXT",
        "ALTER TABLE documents ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE",
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
