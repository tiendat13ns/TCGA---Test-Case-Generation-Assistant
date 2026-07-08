import logging
import os
import time
from pathlib import Path

import httpx
from dotenv import load_dotenv

from app.services.ai.base_provider import (
    AIProviderConfigurationError,
    AIProviderInvalidResponseError,
    AIProviderUnavailableError,
    BaseAIProvider,
)

BACKEND_DIR = Path(__file__).resolve().parents[3]
load_dotenv(BACKEND_DIR / ".env")

logger = logging.getLogger(__name__)


class OpenAICompatibleProvider(BaseAIProvider):
    """Provider for any OpenAI-compatible API (e.g. Gemini via api.vilao.ai)."""

    provider_name = "openai_compatible"

    def __init__(self) -> None:
        self.base_url = os.getenv("OPENAI_COMPATIBLE_BASE_URL", "").strip().rstrip("/")
        self.model = os.getenv("OPENAI_COMPATIBLE_MODEL", "").strip()
        self.api_key = os.getenv("OPENAI_COMPATIBLE_API_KEY", "").strip()
        timeout_value = os.getenv("OPENAI_COMPATIBLE_TIMEOUT_SECONDS", "180").strip()

        if not self.base_url:
            raise AIProviderConfigurationError("OPENAI_COMPATIBLE_BASE_URL is missing")

        if not self.model:
            raise AIProviderConfigurationError("OPENAI_COMPATIBLE_MODEL is missing")

        if not self.api_key:
            raise AIProviderConfigurationError("OPENAI_COMPATIBLE_API_KEY is missing")

        try:
            self.timeout_seconds = float(timeout_value)
        except ValueError as exc:
            raise AIProviderConfigurationError(
                "OPENAI_COMPATIBLE_TIMEOUT_SECONDS must be a number"
            ) from exc

    def _headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

    async def generate(self, prompt: str, system_prompt: str | None = None) -> str:
        messages = []

        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})

        messages.append({"role": "user", "content": prompt})

        return await self.chat(messages)

    async def chat(self, messages: list[dict[str, str]]) -> str:
        started_at = time.perf_counter()
        status = "failed"
        error_message: str | None = None

        try:
            async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
                response = await client.post(
                    f"{self.base_url}/chat/completions",
                    headers=self._headers(),
                    json={
                        "model": self.model,
                        "messages": messages,
                    },
                )

            if response.status_code == 401:
                raise AIProviderUnavailableError(
                    "OpenAI-compatible API returned 401 Unauthorized. Check OPENAI_COMPATIBLE_API_KEY."
                )

            if response.status_code == 404:
                raise AIProviderUnavailableError(
                    f"OpenAI-compatible API model not found: {self.model}. Check OPENAI_COMPATIBLE_MODEL."
                )

            if response.status_code >= 500:
                raise AIProviderUnavailableError(
                    f"OpenAI-compatible API returned server error {response.status_code}"
                )

            if response.status_code >= 400:
                raise AIProviderUnavailableError(
                    f"OpenAI-compatible API request failed with status {response.status_code}: {response.text}"
                )

            try:
                data = response.json()
            except ValueError as exc:
                raise AIProviderInvalidResponseError(
                    "OpenAI-compatible API returned invalid JSON"
                ) from exc

            choices = data.get("choices", [])
            if not choices:
                raise AIProviderInvalidResponseError(
                    "OpenAI-compatible API returned an empty choices list"
                )

            content = choices[0].get("message", {}).get("content")

            if not content:
                raise AIProviderInvalidResponseError(
                    "OpenAI-compatible API returned an empty response content"
                )

            status = "success"
            return content
        except httpx.ConnectError as exc:
            error_message = f"Cannot connect to OpenAI-compatible API at {self.base_url}."
            raise AIProviderUnavailableError(error_message) from exc
        except httpx.TimeoutException as exc:
            error_message = "OpenAI-compatible API request timed out"
            raise AIProviderUnavailableError(error_message) from exc
        except httpx.RequestError as exc:
            error_message = f"OpenAI-compatible API network error: {exc}"
            raise AIProviderUnavailableError(error_message) from exc
        except Exception as exc:
            error_message = str(exc)
            raise
        finally:
            self._log_request(started_at, status, error_message)

    async def health_check(self) -> dict[str, str]:
        started_at = time.perf_counter()
        status = "failed"
        error_message: str | None = None

        try:
            async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
                response = await client.get(
                    f"{self.base_url}/models",
                    headers=self._headers(),
                )

            if response.status_code == 401:
                raise AIProviderUnavailableError(
                    "OpenAI-compatible API health check failed: 401 Unauthorized."
                )

            if response.status_code >= 400:
                raise AIProviderUnavailableError(
                    f"OpenAI-compatible API health check failed with status {response.status_code}: {response.text}"
                )

            status = "healthy"
            return {
                "provider": self.provider_name,
                "model": self.model,
                "status": status,
            }
        except httpx.ConnectError as exc:
            error_message = f"Cannot connect to OpenAI-compatible API at {self.base_url}."
            raise AIProviderUnavailableError(error_message) from exc
        except httpx.TimeoutException as exc:
            error_message = "OpenAI-compatible API health check timed out"
            raise AIProviderUnavailableError(error_message) from exc
        except httpx.RequestError as exc:
            error_message = f"OpenAI-compatible API network error: {exc}"
            raise AIProviderUnavailableError(error_message) from exc
        except Exception as exc:
            error_message = str(exc)
            raise
        finally:
            self._log_request(started_at, status, error_message)

    def _log_request(
        self,
        started_at: float,
        status: str,
        error_message: str | None,
    ) -> None:
        execution_time_ms = int((time.perf_counter() - started_at) * 1000)
        logger.info(
            "ai_request provider=%s model=%s execution_time_ms=%s status=%s error_message=%s",
            self.provider_name,
            self.model,
            execution_time_ms,
            status,
            error_message,
        )
