from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.auth import get_current_user, get_db
from app.models import Project, User
from app.schemas.chat_schema import ChatHistoryMessage, ChatHistoryResponse, ChatRequest, ChatResponse
from app.services.chat_history_service import clear_history, get_history
from app.services.chat_service import process_chat_message, stream_chat_message

router = APIRouter()


def _get_owned_project_id(db: Session, project_id: str, user: User) -> UUID:
    """Verify project_id hợp lệ và thuộc về user hiện tại — trả 404 (không phải 403) để
    tránh lộ việc project đó có tồn tại hay không cho user khác."""
    try:
        project_uuid = UUID(project_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid project ID") from exc

    project = db.get(Project, project_uuid)
    if project is None or project.user_id != user.id:
        raise HTTPException(status_code=404, detail="Project not found")
    return project_uuid


@router.get("/history", response_model=ChatHistoryResponse)
def get_chat_history(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Lấy lịch sử chat "Work with Agent" đã lưu của 1 project — gọi khi mở lại màn chat
    để hiển thị luôn tin nhắn cũ thay vì bắt đầu trống."""
    project_uuid = _get_owned_project_id(db, project_id, current_user)
    rows = get_history(db, project_uuid, current_user.id)
    return ChatHistoryResponse(
        messages=[
            ChatHistoryMessage(id=str(m.id), role=m.role, content=m.content, error=m.error)
            for m in rows
        ]
    )


@router.delete("/history", status_code=204)
def delete_chat_history(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Xóa toàn bộ lịch sử chat đã lưu của 1 project (nút "Xóa lịch sử chat" ở FE)."""
    project_uuid = _get_owned_project_id(db, project_id, current_user)
    clear_history(db, project_uuid, current_user.id)


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
