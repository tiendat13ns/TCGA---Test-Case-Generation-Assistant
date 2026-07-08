from abc import ABC, abstractmethod


class AIProviderError(RuntimeError):
    status_code = 502


class AIProviderConfigurationError(AIProviderError):
    status_code = 500


class AIProviderUnavailableError(AIProviderError):
    status_code = 503


class AIProviderInvalidResponseError(AIProviderError):
    status_code = 502


class BaseAIProvider(ABC):
    provider_name: str
    model: str

    @abstractmethod
    async def generate(self, prompt: str, system_prompt: str | None = None) -> str:
        pass

    @abstractmethod
    async def chat(self, messages: list[dict[str, str]]) -> str:
        pass

    @abstractmethod
    async def health_check(self) -> dict[str, str]:
        pass
