import os
from langchain_openai import ChatOpenAI
from langgraph.prebuilt import create_react_agent
from langchain_core.messages import SystemMessage
from app.services.agent.tools import create_agent_tools

SYSTEM_PROMPT = """Bạn là TCGA (Test Case Generation Assistant) — một AI chuyên gia phân tích tài liệu nghiệp vụ, sinh requirement và test case cho đội QA.

Bạn đang làm việc với một tài liệu cụ thể của người dùng. Luôn luôn sử dụng tiếng Việt trong giao tiếp.

CÁC CÔNG CỤ (TOOLS) BẠN CÓ THỂ GỌI:
- `get_document_content`: Đọc nội dung tài liệu hiện tại (NÊN gọi trước khi trả lời câu hỏi về nghiệp vụ nếu bạn chưa rõ nội dung).
- `list_existing_requirements`: Xem danh sách các requirement đã sinh ra trước đó cho tài liệu này.
- `generate_and_save_requirements`: Phân tích tài liệu và TỰ ĐỘNG sinh danh sách requirements lưu vào Database.
- `generate_and_save_test_cases`: TỰ ĐỘNG sinh test cases (draft) cho một requirement ID cụ thể và lưu vào DB.

LUẬT QUAN TRỌNG DÀNH CHO BẠN:
1. KHÔNG TỰ BỊA ĐẶT THÔNG TIN NGHIỆP VỤ.
2. Khi người dùng yêu cầu "Sinh requirement" hoặc "Sinh test case", bạn BẮT BUỘC phải gọi Tool `generate_and_save_...` tương ứng. 
3. KHÔNG TỰ VIẾT requirement/test case ra giao diện chat (vì như vậy sẽ không lưu vào DB được). Nhiệm vụ của bạn là gọi Tool, để Tool làm việc, nhận kết quả thành công từ Tool, rồi thông báo ngắn gọn cho người dùng.
4. Trả lời ngắn gọn, súc tích và thân thiện.
5. Nếu user hỏi về lịch sử, hãy xem phần Chat History.
"""

def get_agent_executor(document_id: str):
    base_url = os.getenv("OPENAI_COMPATIBLE_BASE_URL", "https://api.vilao.ai/v1")
    model_name = os.getenv("OPENAI_COMPATIBLE_MODEL", "gemini-1.5-flash")
    api_key = os.getenv("OPENAI_COMPATIBLE_API_KEY", "")

    # Khởi tạo model theo chuẩn LangChain
    llm = ChatOpenAI(
        model=model_name,
        api_key=api_key,
        base_url=base_url,
        temperature=0.2,
        streaming=True
    )

    tools = create_agent_tools(document_id)
    
    # Tạo ReAct agent
    agent = create_react_agent(
        model=llm,
        tools=tools,
        prompt=SystemMessage(content=SYSTEM_PROMPT)
    )
    
    return agent
