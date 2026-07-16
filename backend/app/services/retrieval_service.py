import asyncio
import concurrent.futures
import logging
from uuid import UUID

from sqlalchemy.orm import Session

from app.models import DocumentChunk
from app.services.embedding_service import EmbeddingService

logger = logging.getLogger(__name__)


async def retrieve_relevant_chunks_async(
    db: Session, document_id: str, query: str, top_k: int = 5
) -> list[str]:
    """
    Async: nhúng query thành vector, tìm top_k chunks có Cosine distance thấp nhất.
    """
    embed_service = EmbeddingService()
    vectors = await embed_service.get_embeddings([query])
    if not vectors:
        return []

    query_vector = vectors[0]
    doc_uuid = UUID(document_id)

    # pgvector cosine_distance: nhỏ hơn = tương đồng cao hơn
    chunks = (
        db.query(DocumentChunk)
        .filter(DocumentChunk.document_id == doc_uuid)
        .filter(DocumentChunk.embedding.isnot(None))
        .order_by(DocumentChunk.embedding.cosine_distance(query_vector))
        .limit(top_k)
        .all()
    )

    logger.info(
        "Semantic search for document %s query='%s' → %d chunks found",
        document_id,
        query[:60],
        len(chunks),
    )
    return [chunk.content for chunk in chunks]


def retrieve_relevant_chunks(
    db: Session, document_id: str, query: str, top_k: int = 5
) -> list[str]:
    """
    Sync wrapper — an toàn để gọi từ LangChain Tool đang chạy trong Uvicorn event loop.

    Kỹ thuật: dùng ThreadPoolExecutor để chạy asyncio.run() trong thread RIÊNG,
    tránh conflict/deadlock với event loop của FastAPI/Uvicorn đang chạy ở thread chính.
    """
    with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
        future = pool.submit(
            asyncio.run,
            retrieve_relevant_chunks_async(db, document_id, query, top_k),
        )
        return future.result(timeout=30)
