from fastapi import APIRouter, HTTPException
from sqlalchemy.exc import SQLAlchemyError

from app.schemas.test_case_schema import GenerateTestCasesResponse, ListTestCasesResponse
from app.services.test_case_generation_service import (
    TestCaseGenerationError,
    generate_test_cases_from_requirement,
    list_test_cases_by_requirement,
)

router = APIRouter(prefix="/api/v1/requirements", tags=["test-cases"])


@router.post(
    "/{requirement_id}/test-cases/generate",
    response_model=GenerateTestCasesResponse,
)
async def generate_test_cases(requirement_id: str):
    try:
        return await generate_test_cases_from_requirement(requirement_id)
    except TestCaseGenerationError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc


@router.get(
    "/{requirement_id}/test-cases",
    response_model=ListTestCasesResponse,
)
def get_test_cases(requirement_id: str):
    try:
        return list_test_cases_by_requirement(requirement_id)
    except TestCaseGenerationError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc
    except SQLAlchemyError as exc:
        raise HTTPException(status_code=500, detail="Database error while loading test cases") from exc
