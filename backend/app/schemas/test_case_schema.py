from pydantic import BaseModel


class TestCaseResponse(BaseModel):
    id: str
    requirement_id: str
    document_id: str | None = None
    title: str
    scenario: str | None = None
    preconditions: str | None = None
    test_steps: list[str] | None = None
    test_data: str | None = None
    expected_result: str
    priority: str
    severity: str | None = None
    test_type: str | None = None
    automation_candidate: bool
    execution_type: str
    status: str
    version: int


class GenerateTestCasesResponse(BaseModel):
    requirement_id: str
    document_id: str | None = None
    total_test_cases: int
    test_cases: list[TestCaseResponse]


class ListTestCasesResponse(BaseModel):
    requirement_id: str
    total_test_cases: int
    test_cases: list[TestCaseResponse]
