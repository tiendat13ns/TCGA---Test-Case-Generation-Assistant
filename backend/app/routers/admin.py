from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.auth import get_db, require_admin
from app.models import Document, Project, Requirement, TestCase, UsageLog, User

router = APIRouter(prefix="/api/admin", tags=["admin"])


class UpdateCreditRequest(BaseModel):
    credit_balance: int


@router.get("/stats")
def get_admin_stats(
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin),
) -> Any:
    """
    Trả về thống kê tổng quan hệ thống dành cho Admin.
    """
    total_users = db.query(func.count(User.id)).scalar() or 0
    total_projects = db.query(func.count(Project.id)).scalar() or 0
    total_documents = db.query(func.count(Document.id)).scalar() or 0
    total_requirements = db.query(func.count(Requirement.id)).scalar() or 0
    total_test_cases = db.query(func.count(TestCase.id)).scalar() or 0
    total_usage_logs = db.query(func.count(UsageLog.id)).scalar() or 0

    return {
        "total_users": total_users,
        "total_projects": total_projects,
        "total_documents": total_documents,
        "total_requirements": total_requirements,
        "total_test_cases": total_test_cases,
        "total_usage_logs": total_usage_logs,
    }


@router.get("/users")
def get_admin_users(
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin),
) -> Any:
    """
    Lấy danh sách người dùng kèm theo thông tin chi tiết:
    - số dư credit
    - số project đã tạo
    - số requirement đã tạo
    - số test case đã tạo
    """
    users = db.query(User).order_by(User.created_at.desc()).all()
    results = []

    for user in users:
        # Số project của user
        projects_count = (
            db.query(func.count(Project.id))
            .filter(Project.user_id == user.id)
            .scalar()
            or 0
        )

        # Số requirement thuộc các project của user
        requirements_count = (
            db.query(func.count(Requirement.id))
            .join(Project, Requirement.project_id == Project.id)
            .filter(Project.user_id == user.id)
            .scalar()
            or 0
        )

        # Số test case thuộc các requirement trong các project của user
        test_cases_count = (
            db.query(func.count(TestCase.id))
            .join(Requirement, TestCase.requirement_id == Requirement.id)
            .join(Project, Requirement.project_id == Project.id)
            .filter(Project.user_id == user.id)
            .scalar()
            or 0
        )

        results.append(
            {
                "id": str(user.id),
                "email": user.email,
                "role": user.role,
                "credit_balance": user.credit_balance,
                "created_at": user.created_at.isoformat() if user.created_at else None,
                "projects_count": projects_count,
                "requirements_count": requirements_count,
                "test_cases_count": test_cases_count,
            }
        )

    return results


@router.patch("/users/{user_id}/credits")
def update_user_credits(
    user_id: UUID,
    payload: UpdateCreditRequest,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin),
) -> Any:
    """
    Cập nhật số dư credit cho một người dùng bất kỳ.
    """
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    if payload.credit_balance < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Credit balance cannot be negative",
        )

    target_user.credit_balance = payload.credit_balance
    db.commit()
    db.refresh(target_user)

    return {
        "message": "User credits updated successfully",
        "user_id": str(target_user.id),
        "credit_balance": target_user.credit_balance,
    }
