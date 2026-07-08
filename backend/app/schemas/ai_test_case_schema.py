from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator

ALLOWED_PRIORITIES = {"High", "Medium", "Low"}
ALLOWED_SEVERITIES = {"Critical", "Major", "Minor", "Trivial"}
ALLOWED_TEST_TYPES = {
    "Positive",
    "Negative",
    "Boundary",
    "Validation",
    "Integration",
    "Security",
    "Other",
}
ALLOWED_EXECUTION_TYPES = {"Manual", "Automation Candidate"}


class AITestCaseItem(BaseModel):
    title: str
    scenario: str | None = None
    preconditions: str | None = None
    test_steps: list[str] = Field(default_factory=list)
    test_data: str | None = None
    expected_result: str
    priority: str = "Medium"
    severity: str | None = None
    test_type: str | None = None
    automation_candidate: bool = False
    execution_type: str = "Manual"

    @field_validator("title")
    @classmethod
    def title_required(cls, value: str) -> str:
        if not value or not value.strip():
            raise ValueError("title is required")
        return value.strip()

    @field_validator("expected_result")
    @classmethod
    def expected_result_required(cls, value: str) -> str:
        if not value or not value.strip():
            raise ValueError("expected_result is required")
        return value.strip()

    @field_validator("test_steps", mode="before")
    @classmethod
    def normalize_test_steps(cls, value: Any) -> list[str]:
        if value is None:
            return []
        if isinstance(value, str):
            return [value.strip()] if value.strip() else []
        if isinstance(value, list):
            return [str(item).strip() for item in value if item is not None and str(item).strip()]
        return [str(value).strip()] if str(value).strip() else []

    @field_validator("priority", mode="before")
    @classmethod
    def normalize_priority(cls, value: Any) -> str:
        if value is None:
            return "Medium"
        normalized = str(value).strip().capitalize()
        if normalized not in ALLOWED_PRIORITIES:
            return "Medium"
        return normalized

    @field_validator("severity", mode="before")
    @classmethod
    def normalize_severity(cls, value: Any) -> str | None:
        if value is None:
            return None
        normalized = str(value).strip().capitalize()
        if normalized not in ALLOWED_SEVERITIES:
            return None
        return normalized

    @field_validator("test_type", mode="before")
    @classmethod
    def normalize_test_type(cls, value: Any) -> str | None:
        if value is None:
            return None
        # Try exact match first, then title-case
        s = str(value).strip()
        if s in ALLOWED_TEST_TYPES:
            return s
        titled = s.capitalize()
        if titled in ALLOWED_TEST_TYPES:
            return titled
        return "Other"

    @field_validator("execution_type", mode="before")
    @classmethod
    def normalize_execution_type(cls, value: Any) -> str:
        if value is None:
            return "Manual"
        s = str(value).strip()
        if s in ALLOWED_EXECUTION_TYPES:
            return s
        return "Manual"

    @field_validator("automation_candidate", mode="before")
    @classmethod
    def normalize_automation_candidate(cls, value: Any) -> bool:
        if isinstance(value, bool):
            return value
        if isinstance(value, str):
            return value.strip().lower() in {"true", "yes", "1"}
        return bool(value)


class AITestCaseExtractionResponse(BaseModel):
    test_cases: list[AITestCaseItem]

    @field_validator("test_cases")
    @classmethod
    def test_cases_not_empty(cls, value: list[AITestCaseItem]) -> list[AITestCaseItem]:
        if not value:
            raise ValueError("test_cases must not be empty")
        return value
