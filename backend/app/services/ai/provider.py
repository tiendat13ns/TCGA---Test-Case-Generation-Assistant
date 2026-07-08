import os
from pathlib import Path

from dotenv import load_dotenv

from app.services.ai.base_provider import AIProviderConfigurationError, BaseAIProvider
from app.services.ai.ollama_provider import OllamaProvider
from app.services.ai.openai_compatible_provider import OpenAICompatibleProvider

BACKEND_DIR = Path(__file__).resolve().parents[3]
load_dotenv(BACKEND_DIR / ".env")


class AIProviderFactory:
    _providers = {
        "ollama": OllamaProvider,
        "openai_compatible": OpenAICompatibleProvider,
    }

    @classmethod
    def create(cls) -> BaseAIProvider:
        provider_name = os.getenv("AI_PROVIDER", "").strip().lower()

        if not provider_name:
            raise AIProviderConfigurationError("AI_PROVIDER is missing")

        provider_class = cls._providers.get(provider_name)

        if provider_class is None:
            supported = ", ".join(sorted(cls._providers))
            raise AIProviderConfigurationError(
                f"Unsupported AI_PROVIDER: {provider_name}. Supported providers: {supported}"
            )

        return provider_class()
