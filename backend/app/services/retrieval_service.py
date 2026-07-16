import asyncio
import concurrent.futures
import logging
from uuid import UUID

from sqlalchemy.orm import Session

from app.models import DocumentChunk
from app.services.embedding_service import EmbeddingService

logger = logging.getLogger(__name__)


async def retrieve_relevant_chunks_async(
    db: Session,
    query: str,
    top_k: int = 5,
    document_id: str | None = None,
    project_id: str | None = None,
) -> list[str]:
    """
    Async: nhúng query thành vector, tìm top_k chunks có Cosine distance thấp nhất.

    Chiến lược tối ưu hoá:
    1. Filter B-Tree Index trước (project_id hoặc document_id) để thu hẹp không gian tìm kiếm.
    2. Sau đó mới áp dụng HNSW vector search trên tập data đã lọc.
    Điều này tránh tính cosine distance trên toàn bộ bảng.

    Args:
        db: SQLAlchemy Session
        query: Câu truy vấn ngữ nghĩa
        top_k: Số chunk trả về
        document_id: Nếu có — chỉ search trong document cụ thể (ưu tiên cao nhất)
        project_id: Nếu có — chỉ search trong toàn bộ documents của project
    """
    embed_service = EmbeddingService()
    vectors = await embed_service.get_embeddings([query])
    if not vectors:
        return []

    query_vector = vectors[0]

    # Bắt đầu với query base
    q = db.query(DocumentChunk).filter(DocumentChunk.embedding.isnot(None))

    # --- Pre-filter bằng B-Tree Index trước khi tính vector distance ---
    if document_id:
        # Ưu tiên: scope vào một document cụ thể (hẹp nhất, nhanh nhất)
        doc_uuid = UUID(document_id)
        q = q.filter(DocumentChunk.document_id == doc_uuid)
        scope_label = f"document={document_id}"
    elif project_id:
        # Scope vào toàn bộ project (rộng hơn document nhưng vẫn cô lập với project khác)
        proj_uuid = UUID(project_id)
        q = q.filter(DocumentChunk.project_id == proj_uuid)
        scope_label = f"project={project_id}"
    else:
        scope_label = "global (no filter)"

    # --- HNSW vector search trên tập đã filter ---
    chunks = (
        q
        .order_by(DocumentChunk.embedding.cosine_distance(query_vector))
        .limit(top_k)
        .all()
    )

    logger.info(
        "RAG semantic search [%s] query='%s...' → %d chunks found",
        scope_label,
        query[:60],
        len(chunks),
    )
    return [chunk.content for chunk in chunks]


def retrieve_relevant_chunks(
    db: Session,
    query: str,
    top_k: int = 5,
    document_id: str | None = None,
    project_id: str | None = None,
) -> list[str]:
    """
    Sync wrapper — an toàn để gọi từ LangChain Tool đang chạy trong Uvicorn event loop.

    Kỹ thuật: dùng ThreadPoolExecutor để chạy asyncio.run() trong thread RIÊNG,
    tránh conflict/deadlock với event loop của FastAPI/Uvicorn đang chạy ở thread chính.
    """
    with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
        future = pool.submit(
            asyncio.run,
            retrieve_relevant_chunks_async(
                db, query, top_k,
                document_id=document_id,
                project_id=project_id,
            ),
        )
        return future.result(timeout=30)
