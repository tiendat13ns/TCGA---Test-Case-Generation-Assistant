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


class OllamaProvider(BaseAIProvider):
    provider_name = "ollama"

    def __init__(self) -> None:
        self.base_url = os.getenv("OLLAMA_BASE_URL", "").strip().rstrip("/")
        self.model = os.getenv("OLLAMA_MODEL", "").strip()
        timeout_value = os.getenv("OLLAMA_TIMEOUT_SECONDS", "180").strip()

        if not self.base_url:
            raise AIProviderConfigurationError("OLLAMA_BASE_URL is missing")

        if not self.model:
            raise AIProviderConfigurationError("OLLAMA_MODEL is missing")

        try:
            self.timeout_seconds = float(timeout_value)
        except ValueError as exc:
            raise AIProviderConfigurationError("OLLAMA_TIMEOUT_SECONDS must be a number") from exc

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
                    f"{self.base_url}/api/chat",
                    json={
                        "model": self.model,
                        "messages": messages,
                        "stream": False,
                    },
                )

            if response.status_code == 404:
                raise AIProviderUnavailableError(
                    f"Ollama model not found: {self.model}. Run `ollama pull {self.model}`."
                )

            if response.status_code >= 500:
                raise AIProviderUnavailableError(
                    f"Ollama returned server error {response.status_code}"
                )

            if response.status_code >= 400:
                raise AIProviderUnavailableError(
                    f"Ollama request failed with status {response.status_code}: {response.text}"
                )

            try:
                data = response.json()
            except ValueError as exc:
                raise AIProviderInvalidResponseError("Ollama returned invalid JSON") from exc

            content = data.get("message", {}).get("content")

            if not content:
                raise AIProviderInvalidResponseError("Ollama returned an empty response")

            status = "success"
            return content
        except httpx.ConnectError as exc:
            error_message = "Cannot connect to Ollama. Is `ollama serve` running?"
            raise AIProviderUnavailableError(error_message) from exc
        except httpx.TimeoutException as exc:
            error_message = "Ollama request timed out"
            raise AIProviderUnavailableError(error_message) from exc
        except httpx.RequestError as exc:
            error_message = f"Ollama network error: {exc}"
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
                response = await client.get(f"{self.base_url}/api/tags")

            if response.status_code >= 400:
                raise AIProviderUnavailableError(
                    f"Ollama health check failed with status {response.status_code}: {response.text}"
                )

            try:
                data = response.json()
            except ValueError as exc:
                raise AIProviderInvalidResponseError("Ollama health check returned invalid JSON") from exc

            models = data.get("models", [])
            model_names = {model.get("name") for model in models if isinstance(model, dict)}

            if self.model not in model_names:
                raise AIProviderUnavailableError(
                    f"Ollama model not found: {self.model}. Run `ollama pull {self.model}`."
                )

            status = "healthy"
            return {
                "provider": self.provider_name,
                "model": self.model,
                "status": status,
            }
        except httpx.ConnectError as exc:
            error_message = "Cannot connect to Ollama. Is `ollama serve` running?"
            raise AIProviderUnavailableError(error_message) from exc
        except httpx.TimeoutException as exc:
            error_message = "Ollama health check timed out"
            raise AIProviderUnavailableError(error_message) from exc
        except httpx.RequestError as exc:
            error_message = f"Ollama network error: {exc}"
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
