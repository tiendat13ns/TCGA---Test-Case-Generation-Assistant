"""
Sinh Bug Report Markdown (kiểu vé Jira) từ 1 Test Case bị FAIL — dùng ở Tester Studio khi
QA đánh dấu execution_status="Fail" và nhập actual_result. Gọi LLM một lần duy nhất, không
qua RAG/agent — chỉ cần dữ liệu của chính test case đó làm input.
"""

import logging
from typing import Dict, Any

from app.services.agent.workflow_service import get_llm
from langchain_core.messages import SystemMessage, HumanMessage

logger = logging.getLogger(__name__)

BUG_REPORT_PROMPT = """Bạn là một chuyên gia QA (Quality Assurance) dày dặn kinh nghiệm.
Nhiệm vụ của bạn là viết một báo cáo lỗi (Bug Report) chuyên nghiệp dựa trên kết quả thực thi Test Case bị FAIL.

Báo cáo phải viết bằng định dạng Markdown, bao gồm các mục chuẩn của một vé Jira Bug:
1. **Title**: Viết ngắn gọn, rõ ràng về lỗi xảy ra.
2. **Environment**: Giả định môi trường (nếu không rõ, ghi: N/A).
3. **Pre-conditions**: (Lấy từ dữ liệu cung cấp).
4. **Steps to Reproduce**: (Lấy từ dữ liệu cung cấp).
5. **Expected Result**: (Lấy từ dữ liệu cung cấp).
6. **Actual Result**: (Lấy từ dữ liệu cung cấp).
7. **Severity & Priority**: Ước lượng mức độ nghiêm trọng dựa trên phân tích lỗi.
8. **Logs/Attachments**: (Giữ phần placeholder).

Yêu cầu định dạng:
- Viết bằng ngôn ngữ theo đúng nội dung Test Case truyền vào (nếu TC tiếng Việt thì viết tiếng Việt).
- KHÔNG CẦN lời chào hay kết luận, chỉ trả về nội dung báo cáo Bug Report.
"""

def generate_bug_report(test_case_data: Dict[str, Any], actual_result: str) -> str:
    """
    Gọi LLM để tự động sinh văn bản Bug Report.
    """
    llm = get_llm()
    
    # Chuẩn bị context
    context = f"""
    -- THÔNG TIN TEST CASE --
    Title: {test_case_data.get('title', 'N/A')}
    Pre-conditions: {test_case_data.get('preconditions', 'N/A')}
    Steps:
    """
    steps = test_case_data.get('test_steps') or []
    for i, step in enumerate(steps, 1):
        context += f"{i}. {step}\n    "
        
    context += f"""
    Expected Result: {test_case_data.get('expected_result', 'N/A')}
    
    -- KẾT QUẢ THỰC TẾ (LỖI GẶP PHẢI) --
    Actual Result: {actual_result}
    """
    
    messages = [
        SystemMessage(content=BUG_REPORT_PROMPT),
        HumanMessage(content=context)
    ]
    
    logger.info("Calling LLM to generate bug report...")
    response = llm.invoke(messages)
    return response.content
