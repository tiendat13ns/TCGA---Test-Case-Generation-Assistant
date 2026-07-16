from pydantic import BaseModel


class ProjectCreate(BaseModel):
    name: str
    description: str | None = None


class ProjectResponse(BaseModel):
    id: str
    name: str
    description: str | None = None
    created_at: str
    updated_at: str | None = None


class ProjectListResponse(BaseModel):
    total: int
    projects: list[ProjectResponse]
