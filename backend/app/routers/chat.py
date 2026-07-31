from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from app.schemas.chat_schema import ChatRequest, ChatResponse
from app.services.chat_service import process_chat_message, stream_chat_message

router = APIRouter()


@router.post("/message")
async def chat(request: ChatRequest):
    """
    Endpoint cho chat stateless — hỗ trợ cả JSON và SSE streaming.

    - stream=false (mặc định): Trả về ChatResponse JSON đầy đủ (tiện dùng Swagger/Postman test).
    - stream=true: Trả về StreamingResponse với Content-Type text/event-stream.
      Mỗi chunk có dạng: data: {"chunk": "..."}\n\n
      Kết thúc stream: data: [DONE]\n\n
    """
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
