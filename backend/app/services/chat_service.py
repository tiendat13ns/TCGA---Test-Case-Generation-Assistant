"""
Entry point cho "AI Chat Workspace" — router duy nhất chịu trách nhiệm QUYẾT ĐỊNH câu hỏi
của người dùng nên đi luồng nào, trước khi giao cho agent/RAG xử lý thật sự.

3 luồng xử lý (routing dựa trên intent — xem _keyword_classify/_llm_classify_intent):
  - execute_tool  : dùng ReAct agent đầy đủ tool (services/agent/chat_agent.py) — khi
                     người dùng yêu cầu tạo/cập nhật Requirement hoặc Test Case.
  - general_chat  : "Fast path" — RAG 1 lần rồi gọi LLM 1 lần, KHÔNG dùng tool/agent loop.
                     Dùng cho câu hỏi nghiệp vụ thông thường, nhanh hơn nhiều so với agent.
  - small_talk    : như general_chat nhưng bỏ qua bước RAG (chào hỏi không cần tra tài liệu).

Có 2 entry point song song: process_chat_message() (trả JSON 1 lần, dùng cho API thô/test)
và stream_chat_message() (SSE, dùng thật bởi frontend) — cả 2 dùng chung logic classify +
_fast_response/_agent_response nhưng khác cách trả kết quả về client.
"""

import logging
import re
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage, ToolMessage

from app.schemas.chat_schema import ChatRequest, ChatResponse
from app.services.agent.chat_agent import get_chat_agent
from app.services.agent.workflow_service import get_llm
from app.services.rag.retrieval_service import retrieve_relevant_chunks_async
from app.database import SessionLocal
from app.prompts.chat_prompt import (
    FAST_SYSTEM_PROMPT,
    INTENT_CLASSIFICATION_PROMPT,
)

logger = logging.getLogger(__name__)

# ── Keyword-based classifier (O(1), 0ms latency, không tốn LLM token) ────────
_TOOL_KEYWORDS = re.compile(
    r"(tạo|sinh|generate|tao|extract|create|cập nhật|update)\s+"
    r"(requirement|test case|testcase|yêu cầu|tc|req)",
    re.IGNORECASE | re.UNICODE,
)

_SMALL_TALK_KEYWORDS = re.compile(
    r"^(chào|chao|hi|hello|hey|cảm ơn|cam on|thanks|thank you|ok|oke|okie|dạ|da|bạn là ai|ban la ai)\s*[\!\.\?]*$",
    re.IGNORECASE | re.UNICODE,
)


_VALID_INTENTS = {"execute_tool", "general_chat", "small_talk"}


def _keyword_classify(message: str) -> str | None:
    """
    Phân loại ý định tức thì bằng Regex cho các câu RÕ RÀNG, không làm trễ API.
    Trả về None khi không chắc chắn — caller sẽ fallback sang LLM classify thật
    (ví dụ "tạo giúp tôi test case cho tài liệu này" không khớp regex vì có từ
    chen giữa động từ và danh từ, nhưng vẫn là execute_tool).
    """
    msg = message.strip()
    if _TOOL_KEYWORDS.search(msg):
        return "execute_tool"
    if _SMALL_TALK_KEYWORDS.match(msg):
        return "small_talk"
    return None


async def _llm_classify_intent(message: str) -> str:
    """
    Fallback LLM classify — chỉ gọi khi keyword-matching không đủ tự tin.
    Dùng INTENT_CLASSIFICATION_PROMPT thật (trước đây hàm này chỉ gọi lại
    _keyword_classify, khiến prompt phân loại không bao giờ thực sự được dùng).
    """
    try:
        llm = get_llm()
        messages = [
            SystemMessage(content=INTENT_CLASSIFICATION_PROMPT),
            HumanMessage(content=message),
        ]
        response = await llm.ainvoke(messages)
        label = (response.content or "").strip().lower()
        if label in _VALID_INTENTS:
            logger.info("LLM classified intent as: %s", label)
            return label
        logger.warning("LLM returned unexpected intent label '%s' — defaulting to general_chat", label)
        return "general_chat"
    except Exception as e:
        logger.warning("LLM intent classification failed (%s) — defaulting to general_chat", e)
        return "general_chat"


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
    messages = result.get("messages", [])

    # Tool trả về Markdown đã format sẵn (bảng requirement/test case). Chế độ non-streaming
    # không có kênh riêng để đẩy bảng lên UI như luồng SSE, nên phải ghép vào response ở đây.
    tool_outputs: list[str] = []
    for msg in messages:
        if isinstance(msg, ToolMessage) and msg.content:
            tool_name = getattr(msg, "name", "") or ""
            if "generate_test_case" in tool_name:
                _deduct_credits_for_request(request, "TEST_CASE_GENERATION")
            elif "extract_requirement" in tool_name or "requirement" in tool_name.lower():
                _deduct_credits_for_request(request, "REQUIREMENT_EXTRACTION")
            tool_outputs.append(str(msg.content))

    final_text = ""
    if messages and isinstance(messages[-1], AIMessage):
        final_text = messages[-1].content or ""

    return "\n\n".join(tool_outputs + ([final_text] if final_text else []))


def _describe_provider_error(exc: Exception) -> str:
    """Chuyển exception kỹ thuật từ AI provider thành message dễ hiểu cho người dùng,
    tránh lộ traceback/API key ra ngoài."""
    try:
        import openai
        if isinstance(exc, openai.PermissionDeniedError):
            return "AI provider từ chối truy cập model hiện tại (kiểm tra quyền/subscription của API key)."
        if isinstance(exc, openai.RateLimitError):
            return "Đã vượt giới hạn tốc độ gọi AI provider. Vui lòng thử lại sau ít phút."
        if isinstance(exc, openai.APITimeoutError):
            return "AI provider phản hồi quá chậm (timeout). Vui lòng thử lại."
        if isinstance(exc, openai.APIConnectionError):
            return "Không thể kết nối tới AI provider. Vui lòng thử lại sau."
    except ImportError:
        pass
    return "Hệ thống AI hiện đang gặp sự cố, vui lòng thử lại sau."


def _deduct_credits_for_request(request: ChatRequest, operation: str) -> None:
    user_id = getattr(request, "user_id", None)
    if not user_id:
        return
    try:
        from app.database import SessionLocal
        from app.models import User
        from app.services.credit_service import deduct_user_credits
        from uuid import UUID
        db = SessionLocal()
        try:
            user = db.get(User, UUID(user_id))
            if user:
                deduct_user_credits(db, user, operation)
        finally:
            db.close()
    except Exception as e:
        logger.warning("Credit deduction failed (non-fatal): %s", e)


# ── Public Entry Point ───────────────────────────────────────────────────────
async def process_chat_message(request: ChatRequest) -> ChatResponse:
    message = request.message.strip()
    intent = _keyword_classify(message)
    if intent is None:
        intent = await _llm_classify_intent(message)

    logger.info("Router → intent=%s for message: %.80s", intent, message)

    if intent != "execute_tool":
        _deduct_credits_for_request(request, "COPILOT_CHAT")

    if intent == "execute_tool":
        final_response = await _agent_response(request)
    elif intent == "general_chat":
        final_response = await _fast_response(request, use_rag=True)
    else:
        final_response = await _fast_response(request, use_rag=False)

    return ChatResponse(response=str(final_response))


# ── Streaming Entry Point ────────────────────────────────────────────────────
async def stream_chat_message(request: ChatRequest):
    import json
    from langchain_core.messages import AIMessageChunk

    message = request.message.strip()
    intent = _keyword_classify(message)
    if intent is None:
        intent = await _llm_classify_intent(message)

    logger.info("StreamRouter → intent=%s for message: %.80s", intent, message)

    if intent != "execute_tool":
        _deduct_credits_for_request(request, "COPILOT_CHAT")

    try:
        # ── Nhánh AGENT (execute_tool): stream qua LangGraph ─────────────────
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
                    # Trừ credit dựa theo tool đã chạy
                    tool_name = getattr(chunk, "name", "") or ""
                    if "generate_test_case" in tool_name:
                        _deduct_credits_for_request(request, "TEST_CASE_GENERATION")
                    elif "extract_requirement" in tool_name or "requirement" in tool_name.lower():
                        _deduct_credits_for_request(request, "REQUIREMENT_EXTRACTION")

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

        # ── Nhánh FAST (general_chat / small_talk): stream trực tiếp LLM ─────
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

    except Exception as exc:
        # Không để lỗi từ AI provider (403/429/timeout/network...) làm crash cả
        # ASGI response — trả về một chunk báo lỗi dễ hiểu rồi kết thúc stream sạch sẽ.
        logger.error("stream_chat_message failed (intent=%s): %s", intent, exc, exc_info=True)
        error_text = _describe_provider_error(exc)
        payload = json.dumps({"chunk": f"\n\n❌ {error_text}"}, ensure_ascii=False)
        yield f"data: {payload}\n\n"

    # Signal kết thúc stream
    yield "data: [DONE]\n\n"
