import json
import logging
import os
import re
import time
import uuid
from pathlib import Path

from dotenv import load_dotenv
from langchain_core.messages import SystemMessage, HumanMessage
from langchain_openai import ChatOpenAI
from pydantic import ValidationError

from app.schemas.agent_schema import AIRequirementOutput, AITestCaseOutput
from app.models import AgentLog
from app.database import SessionLocal

# Load environment variables
BACKEND_DIR = Path(__file__).resolve().parents[4]
load_dotenv(BACKEND_DIR / ".env")

logger = logging.getLogger(__name__)


def get_llm() -> ChatOpenAI:
    """Khởi tạo LLM ChatOpenAI với cấu hình từ .env."""
    return ChatOpenAI(
        model=os.getenv("OPENAI_COMPATIBLE_MODEL", "gemini-1.5-flash"),
        api_key=os.getenv("OPENAI_COMPATIBLE_API_KEY", ""),
        base_url=os.getenv("OPENAI_COMPATIBLE_BASE_URL", "https://api.vilao.ai/v1"),
        temperature=0.2,
    )


def _strip_markdown_fence(text: str) -> str:
    """Loại bỏ markdown code fence (```json ... ```) nếu model trả về dạng này."""
    text = text.strip()
    # Strip ```json ... ``` hoặc ``` ... ```
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    return text.strip()


def _extract_json(text: str) -> dict:
    """Trích xuất JSON từ string, có thể bọc trong markdown fence."""
    cleaned = _strip_markdown_fence(text)
    # Tìm JSON object đầu tiên trong text
    decoder = json.JSONDecoder()
    for i, ch in enumerate(cleaned):
        if ch in "{[":
            try:
                data, _ = decoder.raw_decode(cleaned[i:])
                return data
            except json.JSONDecodeError:
                continue
    raise ValueError(f"No valid JSON found in response: {text[:200]}")


def log_agent_execution(
    task_type: str,
    input_ref_id: str,
    input_type: str,
    status: str,
    error: str = None,
    duration: int = None,
):
    """Ghi log quá trình thực thi của Agent vào Database."""
    try:
        with SessionLocal() as db:
            log = AgentLog(
                task_type=task_type,
                provider="openai_compatible",
                model=os.getenv("OPENAI_COMPATIBLE_MODEL", "gemini-1.5-flash"),
                status=status,
                input_reference_id=uuid.UUID(input_ref_id) if input_ref_id else None,
                input_type=input_type,
                error_message=error,
                execution_time_ms=duration,
            )
            db.add(log)
            db.commit()
    except Exception as e:
        logger.warning("Failed to log agent execution: %s", e)


from app.prompts.requirement_extraction_prompt import SYSTEM_PROMPT as REQ_SYSTEM_PROMPT
from app.prompts.test_case_generation_prompt import SYSTEM_PROMPT as TC_SYSTEM_PROMPT


def extract_requirements_node(user_prompt: str, document_id: str) -> AIRequirementOutput:
    """
    Node trích xuất Requirement.
    Gọi LLM với prompt JSON tường minh, tự parse + validate bằng Pydantic
    để tránh lỗi khi API proxy không hỗ trợ Function Calling.
    """
    start_time = time.time()
    try:
        llm = get_llm()

        messages = [
            SystemMessage(content=REQ_SYSTEM_PROMPT),
            HumanMessage(content=user_prompt),
        ]

        response = llm.invoke(messages)
        raw_text = response.content

        data = _extract_json(raw_text)
        result = AIRequirementOutput.model_validate(data)

        duration = int((time.time() - start_time) * 1000)
        log_agent_execution("extract_requirements", document_id, "document", "success", duration=duration)
        logger.info("extract_requirements_node: extracted %d requirements in %d ms", len(result.requirements), duration)
        return result

    except (ValidationError, ValueError) as e:
        duration = int((time.time() - start_time) * 1000)
        log_agent_execution("extract_requirements", document_id, "document", "failed", error=str(e), duration=duration)
        raise RuntimeError(f"Requirement extraction failed: {e}") from e
    except Exception as e:
        duration = int((time.time() - start_time) * 1000)
        log_agent_execution("extract_requirements", document_id, "document", "failed", error=str(e), duration=duration)
        raise


def generate_test_cases_node(user_prompt: str, requirement_id: str) -> AITestCaseOutput:
    """
    Node sinh Test Case từ Requirement.
    Gọi LLM với prompt JSON tường minh, tự parse + validate bằng Pydantic.
    """
    start_time = time.time()
    try:
        llm = get_llm()

        messages = [
            SystemMessage(content=TC_SYSTEM_PROMPT),
            HumanMessage(content=user_prompt),
        ]

        response = llm.invoke(messages)
        raw_text = response.content

        data = _extract_json(raw_text)
        result = AITestCaseOutput.model_validate(data)

        duration = int((time.time() - start_time) * 1000)
        log_agent_execution("generate_test_cases", requirement_id, "requirement", "success", duration=duration)
        logger.info("generate_test_cases_node: generated %d test cases in %d ms", len(result.test_cases), duration)
        return result

    except (ValidationError, ValueError) as e:
        duration = int((time.time() - start_time) * 1000)
        log_agent_execution("generate_test_cases", requirement_id, "requirement", "failed", error=str(e), duration=duration)
        raise RuntimeError(f"Test case generation failed: {e}") from e
    except Exception as e:
        duration = int((time.time() - start_time) * 1000)
        log_agent_execution("generate_test_cases", requirement_id, "requirement", "failed", error=str(e), duration=duration)
        raise
