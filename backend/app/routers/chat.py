from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from app.schemas.chat_schema import ChatRequest, ChatResponse
from app.services.chat_service import process_chat_message, stream_chat_message

router = APIRouter()


def _extract_user_id(request: Request) -> str | None:
    """Lấy user_id từ Bearer token để ghi credit log."""
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return None
    try:
        from app.database import SessionLocal
        from app.core.auth import get_current_user_from_token
        db = SessionLocal()
        try:
            user = get_current_user_from_token(auth[7:], db)
            return str(user.id) if user else None
        finally:
            db.close()
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning("Failed to extract user_id from token: %s", e)
        return None


@router.post("/message")
async def chat(raw_request: Request, request: ChatRequest):
    """
    Endpoint cho chat stateless — hỗ trợ cả JSON và SSE streaming.

    - stream=false (mặc định): Trả về ChatResponse JSON đầy đủ (tiện dùng Swagger/Postman test).
    - stream=true: Trả về StreamingResponse với Content-Type text/event-stream.
      Mỗi chunk có dạng: data: {"chunk": "..."}\\n\\n
      Kết thúc stream: data: [DONE]\\n\\n
    """
    # Gắn user_id vào request để credit_service có thể ghi log
    request.user_id = _extract_user_id(raw_request)

    if request.stream:
        return StreamingResponse(
            stream_chat_message(request),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "X-Accel-Buffering": "no",  # Tắt buffering cho nginx
            },
        )

    try:
        response = await process_chat_message(request)
        return response
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
