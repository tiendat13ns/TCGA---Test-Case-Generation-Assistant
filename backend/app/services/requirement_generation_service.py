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
from app.models import AgentLog, Document, Requirement
from app.prompts.requirement_extraction_prompt import SYSTEM_PROMPT, build_user_prompt
from app.repositories.requirement_repository import RequirementRepository
from app.schemas.ai_requirement_schema import AIRequirementExtractionResponse
from app.schemas.requirement_schema import GenerateRequirementsResponse, ListRequirementsResponse, RequirementResponse
from app.services.ai.base_provider import AIProviderError
from app.services.ai.provider import AIProviderFactory
from app.services.retrieval_service import retrieve_relevant_chunks_async

logger = logging.getLogger(__name__)


class RequirementGenerationError(RuntimeError):
    status_code = 400


class RequirementGenerationNotFoundError(RequirementGenerationError):
    status_code = 404


class RequirementGenerationAIError(RequirementGenerationError):
    status_code = 502


def _clean_json_text(text: str) -> str:
    cleaned_text = text.strip().lstrip("\ufeff")

    if cleaned_text.startswith("```"):
        cleaned_text = re.sub(r"^```[a-zA-Z0-9_-]*\s*", "", cleaned_text, count=1)

    if cleaned_text.endswith("```"):
        cleaned_text = cleaned_text[:-3]

    cleaned_text = cleaned_text.strip()
    cleaned_text = re.sub(r",\s*([}\]])", r"\1", cleaned_text)

    return cleaned_text.strip()


def _extract_json_from_text(text: str) -> Any:
    cleaned_text = _clean_json_text(text)
    decoder = json.JSONDecoder()

    for index, character in enumerate(cleaned_text):
        if character not in "{[":
            continue

        try:
            data, _ = decoder.raw_decode(cleaned_text[index:])
            return data
        except json.JSONDecodeError:
            continue

    raise json.JSONDecodeError("No valid JSON object or array found", cleaned_text, 0)


def _normalize_ai_payload(data: Any) -> dict[str, Any]:
    if isinstance(data, list):
        return {
            "requirements": [
                _normalize_requirement_item(item)
                for item in data
                if isinstance(item, dict)
            ]
        }

    if not isinstance(data, dict):
        raise RequirementGenerationAIError("AI returned invalid requirement JSON")

    if "requirements" not in data:
        nested_data = data.get("data")

        if isinstance(nested_data, dict) and "requirements" in nested_data:
            data = nested_data
        elif _looks_like_requirement_item(data):
            data = {"requirements": [data]}
        elif "requirement" in data:
            data = {"requirements": [data["requirement"]]}
        elif "items" in data:
            data = {"requirements": data["items"]}

    requirements = data.get("requirements")

    if isinstance(requirements, dict):
        data["requirements"] = [requirements]

    if isinstance(data.get("requirements"), list):
        data["requirements"] = [
            _normalize_requirement_item(item)
            for item in data["requirements"]
            if isinstance(item, dict)
        ]

    return data


def _looks_like_requirement_item(item: dict[str, Any]) -> bool:
    requirement_keys = {
        "functional_requirement",
        "functional requirement",
        "functionalRequirement",
        "description",
        "title",
    }
    return any(key in item for key in requirement_keys)


def _normalize_requirement_item(item: dict[str, Any]) -> dict[str, Any]:
    key_aliases = {
        "functional requirement": "functional_requirement",
        "functionalRequirement": "functional_requirement",
        "functional": "functional_requirement",
        "validation rule": "validation_rule",
        "validationRule": "validation_rule",
        "permission": "permission",
        "permissions": "permission",
        "workflow": "workflow",
        "workflows": "workflow",
        "state": "state",
        "states": "state",
        "error handling": "error_handling",
        "errorHandling": "error_handling",
        "error_handlings": "error_handling",
    }
    normalized = dict(item)

    for source_key, target_key in key_aliases.items():
        if target_key not in normalized and source_key in normalized:
            normalized[target_key] = normalized[source_key]

    if "functional_requirement" not in normalized:
        for fallback_key in ("description", "title"):
            value = normalized.get(fallback_key)
            if isinstance(value, str) and value.strip():
                normalized["functional_requirement"] = value
                break

    return normalized


def _parse_and_validate_ai_response(raw_output: str) -> AIRequirementExtractionResponse:
    if not raw_output or not raw_output.strip():
        raise RequirementGenerationAIError("AI returned an empty response")

    try:
        data = _extract_json_from_text(raw_output)
    except json.JSONDecodeError as exc:
        raise RequirementGenerationAIError("AI returned invalid requirement JSON") from exc

    try:
        return AIRequirementExtractionResponse.model_validate(_normalize_ai_payload(data))
    except ValidationError as exc:
        raise RequirementGenerationAIError(f"AI requirement JSON validation failed: {exc}") from exc


def _requirement_to_response(requirement: Requirement) -> RequirementResponse:
    return RequirementResponse(
        id=str(requirement.id),
        title=requirement.title,
        description=requirement.description,
        functional_requirement=requirement.functional_requirement,
        validation_rule=requirement.validation_rule,
        permission=requirement.permission,
        workflow=requirement.workflow,
        state=requirement.state,
        error_handling=requirement.error_handling,
        module_name=requirement.module_name,
        feature_name=requirement.feature_name,
        actor=requirement.actor,
        business_rules=requirement.business_rules,
        inputs=requirement.inputs,
        outputs=requirement.outputs,
        preconditions=requirement.preconditions,
        validation_rules=requirement.validation_rules,
        exception_flows=requirement.exception_flows,
        source_reference=requirement.source_reference,
        confidence_score=requirement.confidence_score,
        status=requirement.status,
        version=requirement.version,
        clarifying_questions=requirement.clarifying_questions,
        user_answers=requirement.user_answers,
    )


def _prompt_preview(prompt: str) -> str:
    return prompt[:1000]


def _raw_output_preview(raw_output: str | None) -> str | None:
    if raw_output is None:
        return None

    return raw_output[:5000]


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


def _get_project_context(document: Document) -> str:
    project_id = getattr(document, "project_id", None)

    if project_id:
        return f"project_id: {project_id}"

    return "No project context available."


async def generate_requirements_from_document(document_id: str) -> GenerateRequirementsResponse:
    if not is_database_configured():
        raise RequirementGenerationError("Database is not configured")

    try:
        document_uuid = UUID(document_id)
    except ValueError as exc:
        raise RequirementGenerationNotFoundError("Document not found.") from exc

    with SessionLocal() as db:
        document = db.get(Document, document_uuid)

        if document is None:
            raise RequirementGenerationNotFoundError("Document not found.")

        if document.status != "completed":
            raise RequirementGenerationError("Document must be completed before requirement generation.")

        if not document.extracted_text or not document.extracted_text.strip():
            raise RequirementGenerationError("Document has no extracted text.")

        project_id = getattr(document, "project_id", None)
        project_context = _get_project_context(document)
        doc_filename = document.original_filename
        doc_filetype = document.file_type
        doc_id_str = str(document.id)
        fallback_text = document.extracted_text

        # RAG: Lấy các chunks liên quan nhất từ DB thay vì nhồi toàn bộ văn bản.
        # Ưu tiên filter theo project_id để tránh nhiễu từ documents của project khác.
        RAG_QUERY = (
            "software requirements, features, user stories, business rules, "
            "functional requirements, use cases, actors, workflows, validations, "
            "permissions, error handling, system behavior"
        )
        retrieved_chunks = await retrieve_relevant_chunks_async(
            db,
            RAG_QUERY,
            top_k=12,
            document_id=None,  # Bỏ lọc theo document_id
            project_id=str(project_id) if project_id else None, # Lọc theo toàn bộ Project
        )


    # Nếu chưa có chunks trong DB (chưa embed xong), fallback về extracted_text
    if retrieved_chunks:
        retrieved_context = "\n\n---\n\n".join(retrieved_chunks)
        logger.info(
            "RAG: using %d retrieved chunks for document %s (skipping full extracted_text)",
            len(retrieved_chunks),
            doc_id_str,
        )
    else:
        retrieved_context = fallback_text
        logger.warning(
            "RAG: no chunks found for document %s, falling back to full extracted_text",
            doc_id_str,
        )

    user_prompt = build_user_prompt(
        project_context=project_context,
        document_id=doc_id_str,
        file_name=doc_filename,
        document_type=doc_filetype,
        retrieved_context=retrieved_context,
    )

    try:
        provider = AIProviderFactory.create()
    except AIProviderError as exc:
        raise RequirementGenerationAIError(str(exc)) from exc

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
            task_type="extract_requirement",
            provider=getattr(provider, "provider_name", "unknown"),
            model=getattr(provider, "model", "unknown"),
            status="failed",
            input_reference_id=document_uuid,
            input_type="document",
            prompt_preview=_prompt_preview(user_prompt),
            raw_output=raw_output,
            error_message=error_message,
            execution_time_ms=execution_time_ms,
        )
        raise RequirementGenerationAIError(error_message) from exc
    except RequirementGenerationAIError as exc:
        execution_time_ms = int((time.perf_counter() - started_at) * 1000)
        error_message = str(exc)
        _save_agent_log(
            task_type="extract_requirement",
            provider=getattr(provider, "provider_name", "unknown"),
            model=getattr(provider, "model", "unknown"),
            status="failed",
            input_reference_id=document_uuid,
            input_type="document",
            prompt_preview=_prompt_preview(user_prompt),
            raw_output=raw_output,
            error_message=error_message,
            execution_time_ms=execution_time_ms,
        )
        raise

    try:
        with SessionLocal() as db:
            document = db.get(Document, document_uuid)

            if document is None:
                raise RequirementGenerationNotFoundError("Document not found.")

            repository = RequirementRepository(db)
            version = repository.get_latest_version_by_document_id(document.id) + 1

            requirements = [
                Requirement(
                    project_id=getattr(document, "project_id", None),
                    document_id=document.id,
                    title=item.title or item.functional_requirement[:120],
                    description=item.description or item.functional_requirement,
                    functional_requirement=item.functional_requirement,
                    validation_rule=item.validation_rule,
                    permission=item.permission,
                    workflow=item.workflow,
                    state=item.state,
                    error_handling=item.error_handling,
                    module_name=item.module_name,
                    feature_name=item.feature_name,
                    actor=item.actor,
                    business_rules=item.business_rules,
                    inputs=item.inputs,
                    outputs=item.outputs,
                    preconditions=item.preconditions,
                    validation_rules=item.validation_rules,
                    exception_flows=item.exception_flows,
                    source_reference=item.source_reference,
                    confidence_score=item.confidence_score,
                    status=item.status,
                    version=version,
                    updated_at=datetime.now(),
                    clarifying_questions=item.clarifying_questions or [],
                )
                for item in validated_response.requirements
            ]

            saved_requirements = repository.create_many(requirements)

        _save_agent_log(
            task_type="extract_requirement",
            provider=provider.provider_name,
            model=provider.model,
            status="completed",
            input_reference_id=document_uuid,
            input_type="document",
            prompt_preview=_prompt_preview(user_prompt),
            raw_output=raw_output,
            error_message=None,
            execution_time_ms=execution_time_ms,
        )

        return GenerateRequirementsResponse(
            document_id=str(document_uuid),
            project_id=str(project_id) if project_id else None,
            total_requirements=len(saved_requirements),
            requirements=[_requirement_to_response(requirement) for requirement in saved_requirements],
        )
    except SQLAlchemyError as exc:
        _save_agent_log(
            task_type="extract_requirement",
            provider=provider.provider_name,
            model=provider.model,
            status="failed",
            input_reference_id=document_uuid,
            input_type="document",
            prompt_preview=_prompt_preview(user_prompt),
            raw_output=raw_output,
            error_message="Database save failed",
            execution_time_ms=execution_time_ms,
        )
        raise RequirementGenerationError("Database save failed") from exc

def list_requirements_by_document(document_id: str) -> ListRequirementsResponse:
    if not is_database_configured():
        raise RequirementGenerationError("Database is not configured")

    try:
        document_uuid = UUID(document_id)
    except ValueError as exc:
        raise RequirementGenerationNotFoundError("Document not found.") from exc

    with SessionLocal() as db:
        repository = RequirementRepository(db)
        requirements = repository.list_by_document_id(document_uuid)
        
        return ListRequirementsResponse(
            document_id=str(document_uuid),
            total_requirements=len(requirements),
            requirements=[_requirement_to_response(req) for req in requirements],
        )

