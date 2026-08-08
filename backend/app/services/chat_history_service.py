"""
Lưu/lấy/xóa lịch sử chat "Work with Agent" xuống DB (bảng chat_messages) — thay cho
localStorage phía client, để lịch sử đồng bộ được giữa các thiết bị/trình duyệt.
"""

from uuid import UUID

from sqlalchemy.orm import Session

from app.models import ChatMessage


def save_message(db: Session, project_id: str, user_id: str, role: str, content: str, error: bool = False) -> None:
    """Lưu 1 tin nhắn — bỏ qua im lặng nếu project_id/user_id không hợp lệ (chat vẫn hoạt
    động bình thường dù không lưu được, không nên làm gián đoạn trải nghiệm chat)."""
    if not project_id or not user_id or not content:
        return
    try:
        db.add(ChatMessage(
            project_id=UUID(project_id),
            user_id=UUID(user_id),
            role=role,
            content=content,
            error=error,
        ))
        db.commit()
    except Exception:
        db.rollback()


def get_history(db: Session, project_id: UUID, user_id: UUID) -> list[ChatMessage]:
    return (
        db.query(ChatMessage)
        .filter(ChatMessage.project_id == project_id, ChatMessage.user_id == user_id)
        .order_by(ChatMessage.created_at.asc())
        .all()
    )


def clear_history(db: Session, project_id: UUID, user_id: UUID) -> None:
    db.query(ChatMessage).filter(
        ChatMessage.project_id == project_id, ChatMessage.user_id == user_id
    ).delete()
    db.commit()
