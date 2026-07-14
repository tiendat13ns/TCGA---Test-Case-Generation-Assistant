import logging
from uuid import UUID

from app.database import SessionLocal
from app.services.retrieval_service import retrieve_relevant_chunks

logger = logging.getLogger(__name__)


def create_agent_tools(document_id: str):
    """Trả về danh sách LangChain Tools cho ReAct Agent, bound với document_id cụ thể."""
    from langchain_core.tools import tool

    @tool
    def search_document_knowledge(query: str) -> str:
        """
        Tìm kiếm ngữ nghĩa (Semantic Search) trong tài liệu để trích xuất các đoạn văn
        chứa thông tin liên quan nhất đến câu hỏi hoặc từ khóa (`query`).
        GỌI tool này khi cần trả lời câu hỏi nghiệp vụ, tìm chi tiết tính năng,
        hoặc kiểm tra thông tin cụ thể trong tài liệu dài.
        """
        with SessionLocal() as db:
            chunks = retrieve_relevant_chunks(db, document_id, query, top_k=5)

        if not chunks:
            return "Không tìm thấy thông tin liên quan trong tài liệu."

        separator = "\n\n--- [Đoạn tài liệu liên quan] ---\n\n"
        return separator.join(chunks)

    @tool
    def get_document_overview() -> str:
        """
        Lấy thông tin tổng quan về tài liệu đang được phân tích (tên file, loại file,
        độ dài text, trạng thái). Gọi khi cần biết metadata tài liệu.
        """
        with SessionLocal() as db:
            from app.models import Document

            doc = db.get(Document, UUID(document_id))
            if not doc:
                return "Không tìm thấy tài liệu."
            text_len = len(doc.extracted_text or "")
            return (
                f"Tài liệu: {doc.original_filename}\n"
                f"Loại file: {doc.file_type}\n"
                f"Độ dài text: {text_len:,} ký tự\n"
                f"Trạng thái: {doc.status}"
            )

    return [search_document_knowledge, get_document_overview]
