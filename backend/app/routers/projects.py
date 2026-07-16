from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, HTTPException
from sqlalchemy.exc import SQLAlchemyError

from app.database import SessionLocal
from app.models import Project
from app.schemas.project_schema import ProjectCreate, ProjectListResponse, ProjectResponse

router = APIRouter(prefix="/api/v1/projects", tags=["projects"])


def _project_to_response(project: Project) -> ProjectResponse:
    return ProjectResponse(
        id=str(project.id),
        name=project.name,
        description=project.description,
        created_at=project.created_at.isoformat(timespec="seconds") if project.created_at else "",
        updated_at=project.updated_at.isoformat(timespec="seconds") if project.updated_at else None,
    )


@router.post("", response_model=ProjectResponse, status_code=201)
def create_project(payload: ProjectCreate):
    """Tạo project mới. Mỗi project đại diện cho một hệ thống/module riêng biệt."""
    try:
        with SessionLocal() as db:
            project = Project(name=payload.name, description=payload.description)
            db.add(project)
            db.commit()
            db.refresh(project)
            return _project_to_response(project)
    except SQLAlchemyError as exc:
        raise HTTPException(status_code=500, detail="Database error while creating project") from exc


@router.get("", response_model=ProjectListResponse)
def list_projects():
    """Trả về danh sách tất cả projects, sắp xếp theo thời gian tạo mới nhất."""
    try:
        with SessionLocal() as db:
            projects = db.query(Project).order_by(Project.created_at.desc()).all()
            return ProjectListResponse(
                total=len(projects),
                projects=[_project_to_response(p) for p in projects],
            )
    except SQLAlchemyError as exc:
        raise HTTPException(status_code=500, detail="Database error while listing projects") from exc


@router.get("/{project_id}", response_model=ProjectResponse)
def get_project(project_id: str):
    """Lấy thông tin chi tiết một project theo ID."""
    try:
        project_uuid = UUID(project_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid project ID") from exc

    try:
        with SessionLocal() as db:
            project = db.get(Project, project_uuid)
            if project is None:
                raise HTTPException(status_code=404, detail="Project not found")
            return _project_to_response(project)
    except HTTPException:
        raise
    except SQLAlchemyError as exc:
        raise HTTPException(status_code=500, detail="Database error while fetching project") from exc


@router.put("/{project_id}", response_model=ProjectResponse)
def update_project(project_id: str, payload: ProjectCreate):
    """Cập nhật tên và mô tả của project."""
    try:
        project_uuid = UUID(project_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid project ID") from exc

    try:
        with SessionLocal() as db:
            project = db.get(Project, project_uuid)
            if project is None:
                raise HTTPException(status_code=404, detail="Project not found")
            project.name = payload.name
            project.description = payload.description
            project.updated_at = datetime.now()
            db.commit()
            db.refresh(project)
            return _project_to_response(project)
    except HTTPException:
        raise
    except SQLAlchemyError as exc:
        raise HTTPException(status_code=500, detail="Database error while updating project") from exc


@router.delete("/{project_id}", status_code=204)
def delete_project(project_id: str):
    """Xóa project và toàn bộ dữ liệu liên quan (documents, chunks, requirements, test cases).
    Hành động này không thể hoàn tác."""
    try:
        project_uuid = UUID(project_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid project ID") from exc

    try:
        with SessionLocal() as db:
            project = db.get(Project, project_uuid)
            if project is None:
                raise HTTPException(status_code=404, detail="Project not found")
            db.delete(project)
            db.commit()
    except HTTPException:
        raise
    except SQLAlchemyError as exc:
        raise HTTPException(status_code=500, detail="Database error while deleting project") from exc
