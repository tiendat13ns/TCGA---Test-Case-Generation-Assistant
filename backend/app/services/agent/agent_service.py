import os
from pathlib import Path

from dotenv import load_dotenv
from langchain_core.messages import SystemMessage
from langchain_openai import ChatOpenAI
from langgraph.prebuilt import create_react_agent

from app.services.agent.tools import create_agent_tools

BACKEND_DIR = Path(__file__).resolve().parents[4]
load_dotenv(BACKEND_DIR / ".env")

SYSTEM_PROMPT = """Bạn là TCGA (Test Case Generation Assistant) — AI chuyên phân tích tài liệu nghiệp vụ và trả lời câu hỏi cho đội QA. Luôn dùng tiếng Việt.

CÔNG CỤ BẠN CÓ:
- `search_document_knowledge(query)`: Tìm kiếm ngữ nghĩa trong tài liệu. ƯU TIÊN GỌI tool này khi cần trả lời câu hỏi về nghiệp vụ, tính năng, hoặc chi tiết cụ thể trong tài liệu.
- `get_document_overview()`: Xem metadata tài liệu (tên file, độ dài, trạng thái).

LUẬT:
1. KHÔNG bịa đặt thông tin nghiệp vụ. Luôn search tài liệu trước khi trả lời câu hỏi nghiệp vụ.
2. Trả lời ngắn gọn, súc tích và thân thiện.
3. Nếu không tìm thấy thông tin trong tài liệu, hãy thành thật nói rõ.
"""


def get_agent_executor(document_id: str):
    """Khởi tạo LangGraph ReAct Agent cho một document_id cụ thể."""
    llm = ChatOpenAI(
        model=os.getenv("OPENAI_COMPATIBLE_MODEL", "gemini-1.5-flash"),
        api_key=os.getenv("OPENAI_COMPATIBLE_API_KEY", ""),
        base_url=os.getenv("OPENAI_COMPATIBLE_BASE_URL", "https://api.vilao.ai/v1"),
        temperature=0.2,
        streaming=True,
    )
    tools = create_agent_tools(document_id)
    return create_react_agent(
        model=llm,
        tools=tools,
        prompt=SystemMessage(content=SYSTEM_PROMPT),
    )
