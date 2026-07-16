from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.database import SessionLocal, is_database_configured
from app.models import Requirement
from app.schemas.requirement_schema import (
    GenerateRequirementsResponse,
    ListRequirementsResponse,
    RequirementResponse,
)
from app.services.requirement_generation_service import (
    RequirementGenerationError,
    generate_requirements_from_document,
    list_requirements_by_document,
)

router = APIRouter(prefix="/api/v1", tags=["requirements"])


class SubmitAnswersRequest(BaseModel):
    answers: list[str]


@router.post("/documents/{document_id}/requirements/generate", response_model=GenerateRequirementsResponse)
async def generate_document_requirements(document_id: str):
    try:
        return await generate_requirements_from_document(document_id)
    except RequirementGenerationError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc


@router.get("/documents/{document_id}/requirements", response_model=ListRequirementsResponse)
def get_document_requirements(document_id: str):
    try:
        return list_requirements_by_document(document_id)
    except RequirementGenerationError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc


@router.patch("/requirements/{requirement_id}/answers", response_model=RequirementResponse)
def submit_requirement_answers(requirement_id: str, body: SubmitAnswersRequest):
    """User submits answers to the AI's clarifying questions for a requirement."""
    if not is_database_configured():
        raise HTTPException(status_code=503, detail="Database not configured")

    with SessionLocal() as db:
        from uuid import UUID
        try:
            req_uuid = UUID(requirement_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid requirement ID")

        req = db.get(Requirement, req_uuid)
        if req is None:
            raise HTTPException(status_code=404, detail="Requirement not found")

        req.user_answers = body.answers
        db.commit()
        db.refresh(req)

        return RequirementResponse(
            id=str(req.id),
            title=req.title,
            description=req.description,
            functional_requirement=req.functional_requirement,
            validation_rule=req.validation_rule,
            permission=req.permission,
            workflow=req.workflow,
            state=req.state,
            error_handling=req.error_handling,
            module_name=req.module_name,
            feature_name=req.feature_name,
            actor=req.actor,
            business_rules=req.business_rules,
            inputs=req.inputs,
            outputs=req.outputs,
            preconditions=req.preconditions,
            validation_rules=req.validation_rules,
            exception_flows=req.exception_flows,
            source_reference=req.source_reference,
            confidence_score=req.confidence_score,
            status=req.status,
            version=req.version,
            clarifying_questions=req.clarifying_questions,
            user_answers=req.user_answers,
        )
