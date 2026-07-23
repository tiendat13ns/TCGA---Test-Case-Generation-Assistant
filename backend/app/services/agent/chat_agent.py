import logging
from typing import List, Dict


def _format_test_cases_as_markdown_table(req_id: str, res) -> str:
    """
    Build bảng Markdown đầy đủ 6 cột theo yêu cầu:
    TC ID | Mục đích kiểm thử | Pre-condition | Các bước thực hiện | Test Data | Kết quả mong muốn
    """
    tc_list = res.test_cases
    total = res.total_test_cases

    lines = []
    lines.append(f"**Tổng hợp {total} Test Case** cho Requirement `{req_id}`\n")

    # Header bảng
    lines.append("| Mã THKT | Mục đích kiểm thử | Environment / Pre-condition | Các bước thực hiện | Test Data | Kết quả mong muốn |")
    lines.append("|---------|-------------------|----------------------------|-------------------|-----------|-------------------|")

    for i, tc in enumerate(tc_list, start=1):
        tc_id = f"TC-{i:02d}"

        # Mục đích = title + (test_type, priority)
        title = (tc.title or "").replace("|", "/").replace("\n", " ")
        test_type = tc.test_type or ""
        priority = tc.priority or ""
        test_item = f"{title}<br/>*({test_type} · {priority})*" if test_type or priority else title

        # Pre-condition
        precond = (tc.preconditions or "").replace("|", "/").replace("\n", " ")

        # Test steps — join thành chuỗi đánh số, dùng <br/> để xuống dòng trong ô bảng
        steps = tc.test_steps or []
        steps_str = "<br/>".join(f"{j}. {s.replace('|', '/').replace(chr(10), ' ')}" for j, s in enumerate(steps, start=1))
        if not steps_str:
            steps_str = "(none)"

        # Test data
        test_data = (tc.test_data or "").replace("|", "/").replace("\n", " ")

        # Expected result
        expected = (tc.expected_result or "").replace("|", "/").replace("\n", " ")

        lines.append(f"| {tc_id} | {test_item} | {precond} | {steps_str} | {test_data} | {expected} |")

    return "\n".join(lines)


from langchain_core.messages import BaseMessage
from langchain_core.tools import tool
from langgraph.prebuilt import create_react_agent

from app.database import SessionLocal
from app.models import Requirement, TestCase
from app.services.agent.workflow_service import get_llm
from app.services.retrieval_service import retrieve_relevant_chunks_async
from app.prompts.chat_prompt import SYSTEM_PROMPT

from app.services.requirement_generation_service import generate_requirements_from_document, list_requirements_by_document
from app.services.test_case_generation_service import generate_test_cases_from_requirement

logger = logging.getLogger(__name__)

# Note: In a real async environment with LangGraph, tools need to be carefully structured.
# Since retrieve_relevant_chunks_async is async, we use an async tool.

@tool
async def search_documents_tool(query: str, document_ids: List[str]) -> str:
    """
    Tìm kiếm thông tin trong các tài liệu (SRS, tài liệu nghiệp vụ) dựa trên câu truy vấn của người dùng.
    Chỉ tìm kiếm trong danh sách document_ids được chỉ định.
    
    Args:
        query: Câu hỏi hoặc từ khóa cần tìm kiếm.
        document_ids: Danh sách ID của các tài liệu cần tìm.
    """
    logger.info(f"Running search_documents_tool for query: {query}")
    all_chunks = []
    db = SessionLocal()
    try:
        for doc_id in document_ids:
            chunks = await retrieve_relevant_chunks_async(
                db=db, 
                query=query, 
                top_k=5, 
                document_id=doc_id
            )
            all_chunks.extend(chunks)
    finally:
        db.close()
        
    if not all_chunks:
        return "Không tìm thấy dữ liệu liên quan."
        
    context_text = "\n\n---\n\n".join([chunk for chunk in all_chunks[:10]])
    return context_text

@tool
def update_requirement_tool(requirement_id: str, updates: Dict[str, str]) -> str:
    """
    Cập nhật dữ liệu của một Requirement cụ thể trong Database.
    
    Args:
        requirement_id: ID của Requirement cần cập nhật.
        updates: Dictionary chứa các trường cần cập nhật. (Ví dụ: {"title": "Tên mới", "status": "approved"})
    """
    logger.info(f"Running update_requirement_tool for req_id: {requirement_id}")
    db = SessionLocal()
    try:
        req = db.query(Requirement).filter(Requirement.id == requirement_id).first()
        if not req:
            return f"Lỗi: Không tìm thấy Requirement có ID {requirement_id}."
            
        for key, value in updates.items():
            if hasattr(req, key):
                setattr(req, key, value)
                
        db.commit()
        return f"Cập nhật thành công các trường: {list(updates.keys())}"
    except Exception as e:
        db.rollback()
        return f"Lỗi khi cập nhật Requirement: {str(e)}"
    finally:
        db.close()

@tool
async def extract_requirement_tool(document_ids: List[str]) -> str:
    """
    Sử dụng tool này khi người dùng yêu cầu tạo requirement, trích xuất requirement từ tài liệu.
    Nó sẽ phân tích tài liệu và tạo các requirement trong cơ sở dữ liệu.
    Kết quả trả về là JSON chứa chi tiết các Requirement vừa tạo. BẠN PHẢI FORMAT JSON NÀY THÀNH MARKDOWN CHI TIẾT (bao gồm tiêu đề, mô tả, luồng nghiệp vụ, validation, v.v.) để hiển thị cho người dùng.
    
    Args:
        document_ids: Danh sách ID của các tài liệu cần phân tích.
    """
    logger.info(f"Running extract_requirement_tool for docs: {document_ids}")
    results = []
    try:
        for doc_id in document_ids:
            res = await generate_requirements_from_document(doc_id)
            results.append(f"Kết quả cho tài liệu {doc_id}:\n" + res.model_dump_json(indent=2))
        return "\n\n".join(results)
    except Exception as e:
        logger.error(f"Error in extract_requirement_tool: {e}")
        return f"Lỗi khi tạo requirement: {str(e)}"

@tool
def list_requirements_tool(document_id: str) -> str:
    """
    Lấy danh sách và CHI TIẾT các requirement đã được tạo cho một tài liệu cụ thể.
    Sử dụng tool này để xem lại requirement hoặc biết ID của requirement trước khi tạo Test Case.
    Kết quả trả về đã được format sẵn — KHÔNG cần xử lý thêm, chỉ cần lấy các requirement_id từ danh sách để truyền vào generate_test_case_tool.
    
    Args:
        document_id: ID của tài liệu.
    """
    try:
        res = list_requirements_by_document(document_id)
        if not res.requirements:
            return f"Tài liệu {document_id} chưa có requirement nào. Bạn cần tạo requirement trước."

        lines = [f"Tìm thấy {len(res.requirements)} requirement cho tài liệu `{document_id}`:\n"]
        for i, req in enumerate(res.requirements, start=1):
            lines.append(f"{i}. **{req.title}**")
            lines.append(f"   - ID: `{req.id}`")
            lines.append(f"   - Trạng thái: {req.status}")
            if req.description:
                lines.append(f"   - Mô tả: {req.description[:150]}{'...' if len(req.description or '') > 150 else ''}")
            lines.append("")
        return "\n".join(lines)
    except Exception as e:
        return f"Lỗi khi lấy danh sách requirement: {str(e)}"

@tool
async def generate_test_case_tool(requirement_ids: List[str]) -> str:
    """
    Sử dụng tool này khi người dùng yêu cầu tạo Test Case từ Requirement.
    Nó sẽ sinh Test Case (tuân thủ ISTQB) và lưu vào cơ sở dữ liệu.
    Kết quả trả về ĐÃ ĐƯỢC FORMAT SẴN thành Markdown table — KHÔNG cần xử lý hay format lại.
    Chỉ cần hiển thị nguyên văn kết quả này cho người dùng.

    Args:
        requirement_ids: Danh sách ID của các Requirement cần tạo Test Case.
    """
    logger.info(f"Running generate_test_case_tool for reqs: {requirement_ids}")
    results = []
    try:
        for req_id in requirement_ids:
            from app.services.test_case_generation_service import generate_test_cases_from_requirement
            res = await generate_test_cases_from_requirement(req_id)
            # Format thành Markdown table ngay tại đây — AI không cần xử lý thêm
            markdown_output = _format_test_cases_as_markdown_table(req_id, res)
            results.append(markdown_output)
        return "\n\n".join(results)
    except Exception as e:
        logger.error(f"Error in generate_test_case_tool: {e}")
        return f"Lỗi khi tạo test case: {str(e)}"

def get_chat_agent():
    """Khởi tạo ReAct Agent với các công cụ cần thiết."""
    llm = get_llm()
    tools = [
        search_documents_tool, 
        update_requirement_tool,
        extract_requirement_tool,
        list_requirements_tool,
        generate_test_case_tool
    ]
    
    # create_react_agent manages the tool calling loop automatically
    agent = create_react_agent(
        llm, 
        tools=tools,
        prompt=SYSTEM_PROMPT
    )
    return agent
