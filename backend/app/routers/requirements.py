from fastapi import APIRouter, HTTPException

from app.schemas.requirement_schema import GenerateRequirementsResponse, ListRequirementsResponse
from app.services.requirement_generation_service import (
    RequirementGenerationError,
    generate_requirements_from_document,
    list_requirements_by_document,
)

router = APIRouter(prefix="/api/v1/documents", tags=["requirements"])


@router.post("/{document_id}/requirements/generate", response_model=GenerateRequirementsResponse)
async def generate_document_requirements(document_id: str):
    try:
        return await generate_requirements_from_document(document_id)
    except RequirementGenerationError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc


@router.get("/{document_id}/requirements", response_model=ListRequirementsResponse)
def get_document_requirements(document_id: str):
    try:
        return list_requirements_by_document(document_id)
    except RequirementGenerationError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc
