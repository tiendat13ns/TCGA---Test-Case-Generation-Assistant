import logging
import re
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage

from app.schemas.chat_schema import ChatRequest, ChatResponse
from app.services.agent.chat_agent import get_chat_agent
from app.services.agent.workflow_service import get_llm
from app.services.retrieval_service import retrieve_relevant_chunks_async
from app.database import SessionLocal
from app.prompts.chat_prompt import (
    FAST_SYSTEM_PROMPT,
    INTENT_CLASSIFICATION_PROMPT,
)

logger = logging.getLogger(__name__)

# ── Keyword-based pre-filter (O(1), không cần LLM call) ─────────────────────
_TOOL_KEYWORDS = re.compile(
    r"(tạo|sinh|generate|tao|extract|create|cập nhật|update)\s+"
    r"(requirement|test case|testcase|yêu cầu|tc|req)",
    re.IGNORECASE | re.UNICODE,
)


def _keyword_classify(message: str) -> str | None:
    """
    Phân loại nhanh bằng regex — không tốn LLM token.
    Trả về 'execute_tool' nếu khớp keyword, None nếu không chắc chắn.
    """
    if _TOOL_KEYWORDS.search(message):
        return "execute_tool"
    return None


async def _llm_classify_intent(message: str) -> str:
    """
    Dùng LLM call nhẹ (không tool) để phân loại ý định.
    Chỉ gọi khi keyword-based filter không chắc chắn.
    """
    llm = get_llm()
    messages = [
        SystemMessage(content=INTENT_CLASSIFICATION_PROMPT),
        HumanMessage(content=message),
    ]
    response = await llm.ainvoke(messages)
    label = response.content.strip().lower()
    # Chỉ chấp nhận 3 nhãn hợp lệ; fallback về general_chat nếu model trả ra gì khác
    if label not in ("execute_tool", "general_chat", "small_talk"):
        logger.warning("Intent classifier returned unexpected label '%s', defaulting to general_chat", label)
        return "general_chat"
    logger.info("Intent classified as: %s", label)
    return label


async def _fast_response(request: ChatRequest, use_rag: bool = True) -> str:
    """
    Luồng NHANH: Lấy chunk liên quan nhất từ Vector DB (Direct RAG) nếu use_rag=True → gọi LLM một lần duy nhất.
    Không nạp Tools, không có ReAct loop.
    """
    context_chunks: list[str] = []
    
    # 1. Direct RAG — lấy context liên quan từ tài liệu đã chọn (chỉ chạy nếu use_rag=True)
    if use_rag and request.document_ids:
        db = SessionLocal()
        try:
            for doc_id in request.document_ids:
                chunks = await retrieve_relevant_chunks_async(
                    db=db,
                    query=request.message,
                    top_k=3,
                    document_id=doc_id,
                )
                context_chunks.extend(chunks)
        finally:
            db.close()

    # 2. Build system message với context (nếu có)
    if context_chunks:
        context_text = "\n\n---\n\n".join(context_chunks[:6])
        system_content = (
            FAST_SYSTEM_PROMPT
            + f"\n\n## Nội dung tài liệu liên quan:\n\n{context_text}"
        )
    else:
        system_content = FAST_SYSTEM_PROMPT

    # 3. Build message history
    messages: list = [SystemMessage(content=system_content)]
    for msg in request.chat_history:
        if msg.role == "user":
            messages.append(HumanMessage(content=msg.content))
        elif msg.role == "ai":
            messages.append(AIMessage(content=msg.content))
    messages.append(HumanMessage(content=request.message))

    # 4. Single LLM call — không tool
    llm = get_llm()
    response = await llm.ainvoke(messages)
    return response.content


async def _agent_response(request: ChatRequest) -> str:
    """
    Luồng ĐẦY ĐỦ: Dùng ReAct Agent với đầy đủ Tools để tạo/cập nhật dữ liệu.
    """
    history = []
    for msg in request.chat_history:
        if msg.role == "user":
            history.append(HumanMessage(content=msg.content))
        elif msg.role == "ai":
            history.append(AIMessage(content=msg.content))
        elif msg.role == "system":
            history.append(SystemMessage(content=msg.content))

    # Gắn document_ids vào context để agent biết phải search ở đâu
    context_instruction = (
        f"\n\n[Hệ thống: Người dùng đã chọn các tài liệu có ID: {request.document_ids}. "
        f"Nếu cần tìm thông tin, hãy gọi search_documents_tool với các ID này.]"
        if request.document_ids
        else ""
    )
    history.append(HumanMessage(content=request.message + context_instruction))

    agent = get_chat_agent()
    result = await agent.ainvoke({"messages": history})
    return result["messages"][-1].content


# ── Public Entry Point ───────────────────────────────────────────────────────
async def process_chat_message(request: ChatRequest) -> ChatResponse:
    """
    Semantic Router: Phân luồng thông minh giữa Fast Chat và Full Agent.
    
    Bước 1 — Keyword pre-filter (O(1), zero latency):
        Nếu message chứa keyword rõ ràng như "tạo requirement", "sinh test case"
        → Route thẳng vào execute_tool, bỏ qua LLM classify.

    Bước 2 — LLM Intent Classification (nếu bước 1 không chắc chắn):
        Gọi LLM nhẹ (không tool) để phân loại ý định.

    Bước 3 — Route:
        "execute_tool" → _agent_response() (ReAct Agent + Tools)
        "general_chat" → _fast_response(use_rag=True)  (Direct RAG + single LLM call)
        "small_talk"   → _fast_response(use_rag=False) (Direct LLM call)
    """
    message = request.message.strip()

    # Bước 1: Keyword pre-filter
    intent = _keyword_classify(message)

    # Bước 2: LLM classify nếu keyword không chắc chắn
    if intent is None:
        intent = await _llm_classify_intent(message)

    logger.info("Router → intent=%s for message: %.80s", intent, message)

    # Bước 3: Route
    if intent == "execute_tool":
        final_response = await _agent_response(request)
    elif intent == "general_chat":
        final_response = await _fast_response(request, use_rag=True)
    else:  # small_talk or fallback
        final_response = await _fast_response(request, use_rag=False)

    return ChatResponse(response=str(final_response))


# ── Streaming Entry Point ────────────────────────────────────────────────────
async def stream_chat_message(request: ChatRequest):
    """
    Async Generator cho Streaming (SSE).
    Yield các chunk theo chuẩn Server-Sent Events: 'data: <text>\\n\\n'
    
    Luồng:
      - execute_tool  → LangGraph agent.astream(stream_mode="messages") → lọc AIMessageChunk
      - general_chat  → LLM.astream() với Direct RAG context
      - small_talk    → LLM.astream() không RAG
    """
    import json
    from langchain_core.messages import AIMessageChunk

    message = request.message.strip()

    # Bước 1: Keyword pre-filter
    intent = _keyword_classify(message)

    # Bước 2: LLM classify nếu không chắc
    if intent is None:
        intent = await _llm_classify_intent(message)

    logger.info("StreamRouter → intent=%s for message: %.80s", intent, message)

    # ── Nhánh AGENT (execute_tool): stream qua LangGraph ─────────────────────
    if intent == "execute_tool":
        history = []
        for msg in request.chat_history:
            if msg.role == "user":
                history.append(HumanMessage(content=msg.content))
            elif msg.role == "ai":
                history.append(AIMessage(content=msg.content))
            elif msg.role == "system":
                history.append(SystemMessage(content=msg.content))

        context_instruction = (
            f"\n\n[Hệ thống: Người dùng đã chọn các tài liệu có ID: {request.document_ids}. "
            f"Nếu cần tìm thông tin, hãy gọi search_documents_tool với các ID này.]"
            if request.document_ids
            else ""
        )
        history.append(HumanMessage(content=request.message + context_instruction))

        agent = get_chat_agent()
        async for event in agent.astream({"messages": history}, stream_mode="messages"):
            # event = (chunk, metadata) khi stream_mode="messages"
            chunk, _meta = event if isinstance(event, tuple) else (event, {})
            
            # Stream kết quả trực tiếp từ Tool (Bảng Markdown) lên UI luôn
            from langchain_core.messages import ToolMessage, ToolMessageChunk
            if isinstance(chunk, (ToolMessage, ToolMessageChunk)) and chunk.content:
                text = chunk.content
                # Thêm khoảng trắng để tách biệt với các câu chữ khác
                payload = json.dumps({"chunk": f"\n\n{text}\n\n"}, ensure_ascii=False)
                yield f"data: {payload}\n\n"
                continue

            # Chỉ stream những text được sinh ra từ chính Agent (bỏ qua text sinh từ các LLM lồng bên trong Tool)
            if _meta.get("langgraph_node") != "agent":
                continue

            if isinstance(chunk, AIMessageChunk) and chunk.content:
                # Nếu chunk này là đang sinh arguments cho một Tool (Tool Call) -> Bỏ qua
                if getattr(chunk, "tool_call_chunks", None):
                    continue
                
                text = chunk.content
                payload = json.dumps({"chunk": text}, ensure_ascii=False)
                yield f"data: {payload}\n\n"

    # ── Nhánh FAST (general_chat / small_talk): stream trực tiếp LLM ─────────
    else:
        use_rag = (intent == "general_chat")
        context_chunks: list[str] = []

        if use_rag and request.document_ids:
            db = SessionLocal()
            try:
                for doc_id in request.document_ids:
                    chunks = await retrieve_relevant_chunks_async(
                        db=db,
                        query=request.message,
                        top_k=3,
                        document_id=doc_id,
                    )
                    context_chunks.extend(chunks)
            finally:
                db.close()

        if context_chunks:
            context_text = "\n\n---\n\n".join(context_chunks[:6])
            system_content = (
                FAST_SYSTEM_PROMPT
                + f"\n\n## Nội dung tài liệu liên quan:\n\n{context_text}"
            )
        else:
            system_content = FAST_SYSTEM_PROMPT

        messages_list: list = [SystemMessage(content=system_content)]
        for msg in request.chat_history:
            if msg.role == "user":
                messages_list.append(HumanMessage(content=msg.content))
            elif msg.role == "ai":
                messages_list.append(AIMessage(content=msg.content))
        messages_list.append(HumanMessage(content=request.message))

        llm = get_llm()
        async for chunk in llm.astream(messages_list):
            if chunk.content:
                payload = json.dumps({"chunk": chunk.content}, ensure_ascii=False)
                yield f"data: {payload}\n\n"

    # Signal kết thúc stream
    yield "data: [DONE]\n\n"
