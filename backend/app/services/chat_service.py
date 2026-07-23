import logging
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage

from app.schemas.chat_schema import ChatRequest, ChatResponse
from app.services.agent.chat_agent import get_chat_agent

logger = logging.getLogger(__name__)

async def process_chat_message(request: ChatRequest) -> ChatResponse:
    # 1. Build Langchain Message History
    history = []
    for msg in request.chat_history:
        if msg.role == "user":
            history.append(HumanMessage(content=msg.content))
        elif msg.role == "ai":
            history.append(AIMessage(content=msg.content))
        elif msg.role == "system":
            history.append(SystemMessage(content=msg.content))
            
    # Add current user message with explicit instruction to use documents if needed
    context_instruction = f"\n\n[Hệ thống: Người dùng đã chọn các tài liệu có ID: {request.document_ids}. Nếu cần tìm thông tin, hãy gọi search_documents_tool với các ID này.]" if request.document_ids else ""
    history.append(HumanMessage(content=request.message + context_instruction))
    
    # 2. Call ReAct Agent
    agent = get_chat_agent()
    
    # Run agent asynchronously
    result = await agent.ainvoke({"messages": history})
    
    # The last message in the state is the AI's final response
    final_response = result["messages"][-1].content
    
    return ChatResponse(
        response=str(final_response)
    )
