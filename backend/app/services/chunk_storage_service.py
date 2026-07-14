import asyncio
import logging
from uuid import UUID

from sqlalchemy.orm import Session

from app.models import DocumentChunk
from app.services.embedding_service import EmbeddingService

logger = logging.getLogger(__name__)


async def _async_process_chunks(
    db: Session, document_id: str, extracted_text: str
) -> int:
    """
    Phiên bản async: chia text → gọi embedding API → lưu vào document_chunks.
    Được gọi nội bộ từ hàm sync process_and_store_document_chunks().
    """
    doc_uuid = UUID(document_id)

    # 1. Xóa các chunks cũ (tránh trùng lặp nếu extract lại)
    db.query(DocumentChunk).filter(DocumentChunk.document_id == doc_uuid).delete()
    db.commit()

    # 2. Chia text thành chunks
    embed_service = EmbeddingService()
    chunks = embed_service.split_text(extracted_text)
    if not chunks:
        logger.warning("No chunks generated for document %s", document_id)
        return 0

    logger.info(
        "Generated %d chunks for document %s, starting embedding...",
        len(chunks),
        document_id,
    )

    # 3. Gọi API Embedding theo batch (20 chunks/batch để tránh payload lớn)
    batch_size = 20
    total_stored = 0
    for i in range(0, len(chunks), batch_size):
        batch_texts = chunks[i : i + batch_size]
        batch_embeddings = await embed_service.get_embeddings(batch_texts)

        db_chunks = [
            DocumentChunk(
                document_id=doc_uuid,
                chunk_index=i + idx,
                content=text,
                token_count=len(text.split()),  # Ước tính nhanh (word count)
                embedding=embedding,
            )
            for idx, (text, embedding) in enumerate(zip(batch_texts, batch_embeddings))
        ]
        db.add_all(db_chunks)
        db.commit()
        total_stored += len(db_chunks)

    logger.info("Stored %d chunks for document %s", total_stored, document_id)
    return total_stored


def process_and_store_document_chunks(
    db: Session, document_id: str, extracted_text: str
) -> int:
    """
    Sync wrapper — an toàn để gọi từ FastAPI BackgroundTasks (sync context).
    Tạo event loop mới trong thread hiện tại để chạy coroutine embedding.

    Lưu ý: asyncio.run() tạo loop MỚI nên không conflict với Uvicorn's event loop
    vì BackgroundTasks chạy trong thread pool riêng.
    """
    try:
        return asyncio.run(_async_process_chunks(db, document_id, extracted_text))
    except Exception as exc:
        logger.error(
            "Failed to process chunks for document %s: %s", document_id, str(exc)
        )
        raise
