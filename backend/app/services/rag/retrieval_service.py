"""
Semantic search (retrieval) trên bảng document_chunks — nửa "R" trong RAG.

Embed câu query, tìm top_k chunk gần nhất bằng cosine distance (pgvector HNSW index),
lọc theo document_id/project_id để không lẫn dữ liệu giữa các tài liệu/project khác nhau.
Được dùng bởi: chat_service.py (trả lời câu hỏi), requirement_generation_service.py và
test_case_generation_service.py (lấy context liên quan trước khi gọi LLM sinh nội dung).

Có 2 bản: retrieve_relevant_chunks_async() cho code async (routers/services chạy trong
event loop FastAPI), và retrieve_relevant_chunks() (sync wrapper) cho LangChain Tool cũ
chạy đồng bộ — xem docstring của từng hàm để biết lý do cần cả 2.
"""

import asyncio
import concurrent.futures
import logging
import os
from uuid import UUID

from sqlalchemy.orm import Session

from app.models import DocumentChunk
from app.services.rag.embedding_service import EmbeddingService

logger = logging.getLogger(__name__)

# Cosine distance tối đa (0 = giống hệt, 2 = đối lập hoàn toàn) để một chunk được coi
# là "liên quan". TẮT theo mặc định (2.0 = không lọc gì) vì baseline distance thực tế
# phụ thuộc nặng vào embedding model đang dùng qua proxy — thử nghiệm với
# text-embedding qua api.vilao.ai cho thấy ngay cả 3 chunk gần nhất của đúng tài liệu
# cũng có distance > 0.8 với truy vấn hợp lệ ("phân tích tài liệu này"), nên một
# ngưỡng đoán mò dễ lọc mất hết context hợp lệ hơn là lọc được nhiễu. Chỉ bật qua env
# RAG_MAX_COSINE_DISTANCE sau khi đã quan sát log "raw distances" bên dưới để biết
# khoảng cách thực tế của chunk liên quan vs không liên quan trên dữ liệu của bạn.
_MAX_COSINE_DISTANCE = float(os.getenv("RAG_MAX_COSINE_DISTANCE", "2.0"))


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
    distance_expr = DocumentChunk.embedding.cosine_distance(query_vector)
    rows = (
        q
        .add_columns(distance_expr.label("distance"))
        .order_by(distance_expr)
        .limit(top_k)
        .all()
    )

    # Loại các chunk có cosine distance vượt ngưỡng (mặc định TẮT, xem comment ở
    # _MAX_COSINE_DISTANCE). "Gần nhất trong top_k" không có nghĩa là "liên quan" khi
    # tài liệu không chứa thông tin phù hợp, nhưng ngưỡng đoán mò còn nguy hiểm hơn.
    relevant_rows = [(chunk, distance) for chunk, distance in rows if distance <= _MAX_COSINE_DISTANCE]
    dropped = len(rows) - len(relevant_rows)
    distances = [round(d, 3) for _chunk, d in rows]

    logger.info(
        "RAG semantic search [%s] query='%s...' → %d/%d chunks within distance<=%.2f (dropped %d) raw_distances=%s",
        scope_label,
        query[:60],
        len(relevant_rows),
        len(rows),
        _MAX_COSINE_DISTANCE,
        dropped,
        distances,
    )
    return [chunk.content for chunk, _distance in relevant_rows]


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
