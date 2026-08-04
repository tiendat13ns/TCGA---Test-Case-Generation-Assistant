"""
Credit Service — quản lý trừ credit và kiểm tra quota cho từng gói dịch vụ.

Chi phí theo tác vụ:
  DOCUMENT_INGESTION      : 2 Credits  (~50đ API cost)
  COPILOT_CHAT            : 2 Credits  (~10đ API cost)
  REQUIREMENT_EXTRACTION  : 5 Credits  (~35đ API cost)
  TEST_CASE_GENERATION    : 10 Credits (~40đ API cost)

Giới hạn FREE Plan:
  - Tối đa 5 tài liệu (documents)
  - Rate limit 20 AI calls/ngày (phòng chống bot spam)
"""
from __future__ import annotations

import logging
from typing import TYPE_CHECKING

from fastapi import HTTPException
from sqlalchemy.orm import Session

if TYPE_CHECKING:
    from app.models import User

logger = logging.getLogger(__name__)

# ── Bảng định giá Credit ──────────────────────────────────────────────────────
CREDIT_COST = {
    "DOCUMENT_INGESTION": 2,
    "COPILOT_CHAT": 2,
    "REQUIREMENT_EXTRACTION": 5,
    "TEST_CASE_GENERATION": 10,
}

# ── Quota FREE plan ───────────────────────────────────────────────────────────
FREE_PLAN_MAX_DOCUMENTS = 5


def deduct_user_credits(
    db: Session,
    user: "User",
    operation: str,
    target_name: str | None = None,
) -> None:
    """
    Trừ Credit của user và ghi log vào usage_logs.
    Ném HTTPException 402 nếu không đủ Credit.
    Admin không bị trừ Credit.
    """
    from app.models import UsageLog

    cost = CREDIT_COST.get(operation, 1)

    # Admin bypass: Không giới hạn credit
    if getattr(user, "role", "user") == "admin":
        log = UsageLog(
            user_id=user.id,
            operation=operation,
            target_name=target_name,
            credits_used=0,
        )
        db.add(log)
        db.commit()
        logger.info("Admin user=%s executed op=%s (unlimited credit)", user.id, operation)
        return

    if user.credit_balance < cost:
        raise HTTPException(
            status_code=402,
            detail=(
                f"Không đủ Credit. Cần {cost} Credits nhưng chỉ còn {user.credit_balance}. "
                "Vui lòng nâng cấp gói dịch vụ để tiếp tục."
            ),
        )

    # Trừ credit
    user.credit_balance -= cost

    # Ghi log
    log = UsageLog(
        user_id=user.id,
        operation=operation,
        target_name=target_name,
        credits_used=cost,
    )
    db.add(log)
    db.commit()
    logger.info(
        "Credit deducted: user=%s op=%s cost=%d remaining=%d",
        user.id, operation, cost, user.credit_balance,
    )


def check_free_plan_document_quota(db: Session, user: "User") -> None:
    """
    Kiểm tra user FREE plan có vượt quá giới hạn 5 tài liệu không.
    Ném HTTPException 403 nếu đã đạt giới hạn.
    Admin bypass quota check.
    """
    if getattr(user, "role", "user") == "admin":
        return

    from app.models import Document, Project
    from sqlalchemy import func as sqlfunc

    doc_count = (
        db.query(sqlfunc.count(Document.id))
        .join(Project, Document.project_id == Project.id)
        .filter(Project.user_id == user.id)
        .scalar()
        or 0
    )

    if doc_count >= FREE_PLAN_MAX_DOCUMENTS:
        raise HTTPException(
            status_code=403,
            detail=(
                f"Tài khoản Free chỉ được upload tối đa {FREE_PLAN_MAX_DOCUMENTS} tài liệu. "
                "Vui lòng xóa tài liệu cũ hoặc nâng cấp lên gói Lite để tiếp tục."
            ),
        )

