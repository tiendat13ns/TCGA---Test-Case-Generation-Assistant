from fastapi import APIRouter, HTTPException

from app.schemas.requirement_schema import GenerateRequirementsResponse, ListRequirementsResponse, RequirementResponse
from app.services.requirement_generation_service import (
    RequirementGenerationError,
    generate_requirements_from_document,
    list_requirements_by_document,
    update_requirement_status,
)

router = APIRouter(prefix="/api/v1/documents", tags=["requirements"])
items_router = APIRouter(prefix="/api/v1/requirements", tags=["requirements"])

@router.post("/{document_id}/requirements/generate", response_model=GenerateRequirementsResponse)
async def generate_document_requirements(document_id: str):
    try:
        return await generate_requirements_from_document(document_id)
    except RequirementGenerationError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc

@items_router.get("", response_model=ListRequirementsResponse)
def get_requirements(document_id: str):
    try:
        return list_requirements_by_document(document_id)
    except RequirementGenerationError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc

@items_router.put("/{requirement_id}/status", response_model=RequirementResponse)
def update_status(requirement_id: str, status: str):
    try:
        return update_requirement_status(requirement_id, status)
    except RequirementGenerationError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc
