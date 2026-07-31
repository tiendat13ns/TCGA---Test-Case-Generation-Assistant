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
    actual_result: str | None = None
    priority: str
    severity: str | None = None
    test_type: str | None = None
    automation_candidate: bool
    execution_type: str
    execution_status: str
    status: str
    note: str | None = None
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


class StudioTestCaseItem(TestCaseResponse):
    feature_name: str | None = None
    requirement_title: str | None = None
    project_id: str | None = None
    module_name: str | None = None


class StudioTestCaseListResponse(BaseModel):
    total_test_cases: int
    test_cases: list[StudioTestCaseItem]


class TestCaseUpdatePayload(BaseModel):
    title: str | None = None
    scenario: str | None = None
    preconditions: str | None = None
    test_steps: list[str] | None = None
    test_data: str | None = None
    expected_result: str | None = None
    actual_result: str | None = None
    priority: str | None = None
    severity: str | None = None
    test_type: str | None = None
    automation_candidate: bool | None = None
    execution_type: str | None = None
    execution_status: str | None = None
    status: str | None = None
    note: str | None = None

class TestCaseCreatePayload(BaseModel):
    requirement_id: str
    title: str
    scenario: str | None = None
    preconditions: str | None = None
    test_steps: list[str] | None = []
    test_data: str | None = None
    expected_result: str
    actual_result: str | None = None
    priority: str = "Medium"
    severity: str | None = None
    test_type: str | None = "Functional"
    automation_candidate: bool = False
    execution_type: str = "Manual"
    execution_status: str = "Untested"
    status: str = "draft"
    note: str | None = None
