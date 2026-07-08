from typing import Any

from pydantic import BaseModel, Field, field_validator


ALLOWED_AI_REQUIREMENT_STATUSES = {"ai_generated", "needs_review"}


class AIRequirementItem(BaseModel):
    functional_requirement: str
    validation_rule: list[str] = Field(default_factory=list)
    permission: list[str] = Field(default_factory=list)
    workflow: list[str] = Field(default_factory=list)
    state: list[str] = Field(default_factory=list)
    error_handling: list[str] = Field(default_factory=list)
    title: str | None = None
    description: str | None = None
    module_name: str | None = None
    feature_name: str | None = None
    actor: str | None = None
    business_rules: list[str] = Field(default_factory=list)
    inputs: list[str] = Field(default_factory=list)
    outputs: list[str] = Field(default_factory=list)
    preconditions: list[str] = Field(default_factory=list)
    validation_rules: list[str] = Field(default_factory=list)
    exception_flows: list[str] = Field(default_factory=list)
    source_reference: str | None = None
    confidence_score: float | None = None
    status: str = "ai_generated"

    @field_validator(
        "validation_rule",
        "permission",
        "workflow",
        "state",
        "error_handling",
        "business_rules",
        "inputs",
        "outputs",
        "preconditions",
        "validation_rules",
        "exception_flows",
        mode="before",
    )
    @classmethod
    def normalize_list_fields(cls, value: Any) -> list[str]:
        if value is None:
            return []

        if isinstance(value, str):
            return [value.strip()] if value.strip() else []

        if isinstance(value, list):
            return [str(item).strip() for item in value if item is not None and str(item).strip()]

        return [str(value).strip()] if str(value).strip() else []

    @field_validator("functional_requirement")
    @classmethod
    def required_text(cls, value: str) -> str:
        if not value or not value.strip():
            raise ValueError("functional_requirement is required")

        return value.strip()

    @field_validator("confidence_score")
    @classmethod
    def confidence_between_zero_and_one(cls, value: float | None) -> float | None:
        if value is None:
            return value

        if value < 0 or value > 1:
            raise ValueError("confidence_score must be between 0 and 1")

        return value

    @field_validator("status")
    @classmethod
    def valid_status(cls, value: str | None) -> str:
        if value is None:
            return "ai_generated"

        if value not in ALLOWED_AI_REQUIREMENT_STATUSES:
            raise ValueError("status must be ai_generated or needs_review")

        return value


class AIRequirementExtractionResponse(BaseModel):
    requirements: list[AIRequirementItem]

    @field_validator("requirements")
    @classmethod
    def requirements_not_empty(cls, value: list[AIRequirementItem]) -> list[AIRequirementItem]:
        if not value:
            raise ValueError("requirements must not be empty")

        return value
