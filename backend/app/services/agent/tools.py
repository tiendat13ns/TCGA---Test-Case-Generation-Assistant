from typing import List, Any
from uuid import UUID
from langchain_core.tools import tool
from app.database import SessionLocal
from app.models import Requirement, Document
from app.services.requirement_generation_service import generate_requirements_from_document
from app.services.test_case_generation_service import generate_test_cases_from_requirement

def create_agent_tools(document_id: str) -> List[Any]:
    
    @tool
    def get_document_content() -> str:
        """Đọc toàn bộ nội dung văn bản của tài liệu đang được phân tích. Dùng tool này khi cần trả lời câu hỏi về nghiệp vụ hoặc trước khi sinh requirement."""
        with SessionLocal() as db:
            try:
                doc = db.query(Document).filter(Document.id == UUID(document_id)).first()
                if not doc:
                    return "Lỗi: Không tìm thấy tài liệu."
                return doc.extracted_text or "Tài liệu chưa được trích xuất văn bản."
            except Exception as e:
                return f"Lỗi khi đọc tài liệu: {str(e)}"

    @tool
    def list_existing_requirements() -> str:
        """Liệt kê các requirements (kể cả draft) đã được tạo cho tài liệu hiện tại."""
        with SessionLocal() as db:
            try:
                reqs = db.query(Requirement).filter(Requirement.document_id == UUID(document_id)).all()
                if not reqs:
                    return "Chưa có requirement nào được tạo."
                result = []
                for r in reqs:
                    result.append(f"REQ ID: {r.id} | Tiêu đề: {r.title} | Trạng thái: {r.status}\nMô tả: {r.description}\n")
                return "\n".join(result)
            except Exception as e:
                return f"Lỗi: {str(e)}"

    @tool
    async def generate_and_save_requirements() -> str:
        """Phân tích tài liệu và sinh ra danh sách requirements, tự động lưu vào DB dưới dạng draft.
        Chỉ gọi hàm này khi người dùng yêu cầu tạo mới requirements.
        """
        try:
            res = await generate_requirements_from_document(document_id)
            return f"Đã sinh thành công {res.total_requirements} requirements và lưu vào DB. Sử dụng list_existing_requirements để xem danh sách chi tiết các requirement ID nếu cần."
        except Exception as e:
            return f"Lỗi khi sinh requirements: {str(e)}"

    @tool
    async def generate_and_save_test_cases(requirement_id: str) -> str:
        """Sinh ra các test cases (dạng draft) cho một requirement cụ thể và tự động lưu vào DB.
        Cần truyền vào requirement_id (UUID string) hợp lệ. 
        """
        try:
            res = await generate_test_cases_from_requirement(requirement_id)
            return f"Đã sinh thành công {res.total_test_cases} test cases cho requirement {requirement_id} và lưu vào DB."
        except Exception as e:
            return f"Lỗi khi sinh test cases: {str(e)}"
            
    return [
        get_document_content,
        list_existing_requirements,
        generate_and_save_requirements,
        generate_and_save_test_cases,
    ]
