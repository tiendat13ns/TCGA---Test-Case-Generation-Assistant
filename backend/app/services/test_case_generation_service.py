import json
import logging
import re
import time
from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import ValidationError
from sqlalchemy.exc import SQLAlchemyError

from app.database import SessionLocal, is_database_configured
from app.models import AgentLog, Requirement, TestCase
from app.prompts.test_case_generation_prompt import SYSTEM_PROMPT, build_user_prompt
from app.repositories.test_case_repository import TestCaseRepository
from app.schemas.ai_test_case_schema import AITestCaseExtractionResponse
from app.schemas.test_case_schema import GenerateTestCasesResponse, ListTestCasesResponse, TestCaseResponse
from app.services.ai.base_provider import AIProviderError
from app.services.ai.provider import AIProviderFactory
from app.services.retrieval_service import retrieve_relevant_chunks_async

logger = logging.getLogger(__name__)


class TestCaseGenerationError(RuntimeError):
    status_code = 400


class TestCaseGenerationNotFoundError(TestCaseGenerationError):
    status_code = 404


class TestCaseGenerationAIError(TestCaseGenerationError):
    status_code = 502


# ---------------------------------------------------------------------------
# JSON parsing helpers (mirrors requirement_generation_service pattern)
# ---------------------------------------------------------------------------

def _clean_json_text(text: str) -> str:
    cleaned = text.strip().lstrip("\ufeff")

    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```[a-zA-Z0-9_-]*\s*", "", cleaned, count=1)

    if cleaned.endswith("```"):
        cleaned = cleaned[:-3]

    cleaned = cleaned.strip()
    cleaned = re.sub(r",\s*([}\]])", r"\1", cleaned)

    return cleaned.strip()


def _extract_json_from_text(text: str) -> Any:
    cleaned = _clean_json_text(text)
    decoder = json.JSONDecoder()

    for index, character in enumerate(cleaned):
        if character not in "{[":
            continue

        try:
            data, _ = decoder.raw_decode(cleaned[index:])
            return data
        except json.JSONDecodeError:
            continue

    raise json.JSONDecodeError("No valid JSON object or array found", cleaned, 0)


def _normalize_ai_payload(data: Any) -> dict[str, Any]:
    """Normalize varied AI output shapes into {"test_cases": [...]}."""
    if isinstance(data, list):
        return {"test_cases": [item for item in data if isinstance(item, dict)]}

    if not isinstance(data, dict):
        raise TestCaseGenerationAIError("AI returned invalid test case JSON")

    if "test_cases" in data:
        items = data["test_cases"]
        if isinstance(items, dict):
            data["test_cases"] = [items]
        return data

    # Try common wrapper keys
    for wrapper_key in ("data", "result", "results", "items", "testCases", "test_case"):
        nested = data.get(wrapper_key)
        if isinstance(nested, list):
            return {"test_cases": nested}
        if isinstance(nested, dict) and "test_cases" in nested:
            return nested

    # Single item that looks like a test case
    if "title" in data and "expected_result" in data:
        return {"test_cases": [data]}

    return data


def _parse_and_validate_ai_response(raw_output: str) -> AITestCaseExtractionResponse:
    if not raw_output or not raw_output.strip():
        raise TestCaseGenerationAIError("AI returned an empty response")

    try:
        data = _extract_json_from_text(raw_output)
    except json.JSONDecodeError as exc:
        raise TestCaseGenerationAIError("AI returned invalid test case JSON") from exc

    try:
        return AITestCaseExtractionResponse.model_validate(_normalize_ai_payload(data))
    except ValidationError as exc:
        raise TestCaseGenerationAIError(f"AI test case JSON validation failed: {exc}") from exc


# ---------------------------------------------------------------------------
# Mapping helpers
# ---------------------------------------------------------------------------

def _test_case_to_response(tc: TestCase) -> TestCaseResponse:
    return TestCaseResponse(
        id=str(tc.id),
        requirement_id=str(tc.requirement_id),
        document_id=str(tc.document_id) if tc.document_id else None,
        title=tc.title,
        scenario=tc.scenario,
        preconditions=tc.preconditions,
        test_steps=tc.test_steps,
        test_data=tc.test_data,
        expected_result=tc.expected_result,
        priority=tc.priority,
        severity=tc.severity,
        test_type=tc.test_type,
        automation_candidate=tc.automation_candidate,
        execution_type=tc.execution_type,
        status=tc.status,
        version=tc.version,
    )


def _prompt_preview(prompt: str) -> str:
    return prompt[:1000]


def _raw_output_preview(raw_output: str | None) -> str | None:
    if raw_output is None:
        return None
    return raw_output[:5000]


# ---------------------------------------------------------------------------
# Agent log helper
# ---------------------------------------------------------------------------

def _save_agent_log(
    *,
    task_type: str,
    provider: str,
    model: str,
    status: str,
    input_reference_id: UUID | None,
    input_type: str | None,
    prompt_preview: str | None,
    raw_output: str | None,
    error_message: str | None,
    execution_time_ms: int | None,
) -> None:
    if not is_database_configured():
        return

    with SessionLocal() as db:
        db.add(
            AgentLog(
                task_type=task_type,
                provider=provider,
                model=model,
                status=status,
                input_reference_id=input_reference_id,
                input_type=input_type,
                prompt_preview=prompt_preview,
                raw_output=_raw_output_preview(raw_output),
                error_message=error_message,
                execution_time_ms=execution_time_ms,
            )
        )
        db.commit()


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

async def generate_test_cases_from_requirement(requirement_id: str) -> GenerateTestCasesResponse:
    if not is_database_configured():
        raise TestCaseGenerationError("Database is not configured")

    try:
        requirement_uuid = UUID(requirement_id)
    except ValueError as exc:
        raise TestCaseGenerationNotFoundError("Requirement not found.") from exc

    with SessionLocal() as db:
        requirement = db.get(Requirement, requirement_uuid)

        if requirement is None:
            raise TestCaseGenerationNotFoundError("Requirement not found.")

        if requirement.status == "rejected":
            raise TestCaseGenerationError(
                "Cannot generate test cases for a rejected requirement."
            )

        # Detach data needed for prompt before session closes
        req_id = requirement.id
        doc_id = requirement.document_id

        # RAG: Lấy các chunks liên quan nhất từ tài liệu gốc (nếu có document_id)
        document_context: str | None = None
        if doc_id:
            rag_query = f"{requirement.title}: {requirement.description or requirement.functional_requirement or ''}"
            chunks = await retrieve_relevant_chunks_async(
                db, str(doc_id), rag_query, top_k=5
            )
            if chunks:
                document_context = "\n\n---\n\n".join(chunks)
                logger.info(
                    "RAG: enriched test case prompt for requirement %s with %d chunks from document %s",
                    req_id, len(chunks), doc_id,
                )
            else:
                logger.warning(
                    "RAG: no chunks found for document %s (requirement %s), using requirement fields only",
                    doc_id, req_id,
                )

        user_prompt = build_user_prompt(requirement, document_context=document_context)

    try:
        provider = AIProviderFactory.create()
    except AIProviderError as exc:
        raise TestCaseGenerationAIError(str(exc)) from exc

    started_at = time.perf_counter()
    raw_output: str | None = None
    error_message: str | None = None

    try:
        raw_output = await provider.generate(user_prompt, system_prompt=SYSTEM_PROMPT)
        validated_response = _parse_and_validate_ai_response(raw_output)
        execution_time_ms = int((time.perf_counter() - started_at) * 1000)
    except AIProviderError as exc:
        execution_time_ms = int((time.perf_counter() - started_at) * 1000)
        error_message = "AI provider is unavailable." if exc.status_code == 503 else str(exc)
        _save_agent_log(
            task_type="generate_test_cases",
            provider=getattr(provider, "provider_name", "unknown"),
            model=getattr(provider, "model", "unknown"),
            status="failed",
            input_reference_id=req_id,
            input_type="requirement",
            prompt_preview=_prompt_preview(user_prompt),
            raw_output=raw_output,
            error_message=error_message,
            execution_time_ms=execution_time_ms,
        )
        raise TestCaseGenerationAIError(error_message) from exc
    except TestCaseGenerationAIError as exc:
        execution_time_ms = int((time.perf_counter() - started_at) * 1000)
        error_message = str(exc)
        _save_agent_log(
            task_type="generate_test_cases",
            provider=getattr(provider, "provider_name", "unknown"),
            model=getattr(provider, "model", "unknown"),
            status="failed",
            input_reference_id=req_id,
            input_type="requirement",
            prompt_preview=_prompt_preview(user_prompt),
            raw_output=raw_output,
            error_message=error_message,
            execution_time_ms=execution_time_ms,
        )
        raise

    try:
        with SessionLocal() as db:
            repository = TestCaseRepository(db)
            version = repository.get_latest_version_by_requirement_id(req_id) + 1

            test_cases = [
                TestCase(
                    requirement_id=req_id,
                    document_id=doc_id,
                    title=item.title,
                    scenario=item.scenario,
                    preconditions=item.preconditions,
                    test_steps=item.test_steps,
                    test_data=item.test_data,
                    expected_result=item.expected_result,
                    priority=item.priority,
                    severity=item.severity,
                    test_type=item.test_type,
                    automation_candidate=item.automation_candidate,
                    execution_type=item.execution_type,
                    status="ai_generated",
                    version=version,
                    updated_at=datetime.now(),
                )
                for item in validated_response.test_cases
            ]

            saved = repository.create_many(test_cases)

        _save_agent_log(
            task_type="generate_test_cases",
            provider=provider.provider_name,
            model=provider.model,
            status="completed",
            input_reference_id=req_id,
            input_type="requirement",
            prompt_preview=_prompt_preview(user_prompt),
            raw_output=raw_output,
            error_message=None,
            execution_time_ms=execution_time_ms,
        )

        return GenerateTestCasesResponse(
            requirement_id=str(req_id),
            document_id=str(doc_id) if doc_id else None,
            total_test_cases=len(saved),
            test_cases=[_test_case_to_response(tc) for tc in saved],
        )

    except SQLAlchemyError as exc:
        db_error = str(exc.orig) if hasattr(exc, "orig") and exc.orig else str(exc)
        _save_agent_log(
            task_type="generate_test_cases",
            provider=provider.provider_name,
            model=provider.model,
            status="failed",
            input_reference_id=req_id,
            input_type="requirement",
            prompt_preview=_prompt_preview(user_prompt),
            raw_output=raw_output,
            error_message=f"Database save failed: {db_error}",
            execution_time_ms=execution_time_ms,
        )
        raise TestCaseGenerationError(f"Database save failed: {db_error}") from exc


def list_test_cases_by_requirement(requirement_id: str) -> ListTestCasesResponse:
    if not is_database_configured():
        raise TestCaseGenerationError("Database is not configured")

    try:
        requirement_uuid = UUID(requirement_id)
    except ValueError as exc:
        raise TestCaseGenerationNotFoundError("Requirement not found.") from exc

    with SessionLocal() as db:
        requirement = db.get(Requirement, requirement_uuid)

        if requirement is None:
            raise TestCaseGenerationNotFoundError("Requirement not found.")

        repository = TestCaseRepository(db)
        test_cases = repository.list_by_requirement_id(requirement_uuid)

        return ListTestCasesResponse(
            requirement_id=str(requirement_uuid),
            total_test_cases=len(test_cases),
            test_cases=[_test_case_to_response(tc) for tc in test_cases],
        )
