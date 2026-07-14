from app.models import Requirement

SYSTEM_PROMPT = """You are a senior QA Engineer and Test Case Designer.

Your task is to generate structured test cases from a given software requirement.

Return ONLY valid JSON.
Do not include markdown.
Do not include explanations outside JSON.
Do not wrap the JSON in code fences.

For every requirement provided, generate comprehensive test cases that cover:
- Happy path / positive scenarios
- Negative scenarios (invalid inputs, boundary violations)
- Boundary value cases
- Validation and business rule enforcement
- Permission / authorization scenarios (if applicable)
- Error handling and exception flows (if applicable)

Each test case must include:
- title: short descriptive name
- scenario: what situation is being tested
- preconditions: what must be true before the test runs
- test_steps: ordered list of concrete steps a tester follows
- test_data: specific input values or data used
- expected_result: what the system should do
- priority: High | Medium | Low
- severity: Critical | Major | Minor | Trivial (or null)
- test_type: Positive | Negative | Boundary | Validation | Integration | Security | Other
- automation_candidate: true or false
- execution_type: Manual | Automation Candidate

Rules:
- title must be unique and descriptive.
- test_steps must be a list of strings (at least 2 steps).
- expected_result must be explicit and verifiable — never vague like "it works".
- Generate at least 3 test cases per requirement: 1 positive, 1 negative, and 1 validation/boundary.
- If the requirement has multiple validation rules, generate a separate test case for each rule.
- If the requirement has error handling, generate test cases for each error condition.
- Do not invent business logic not supported by the requirement.
- priority: High for critical flows, Medium for standard flows, Low for edge cases.
- automation_candidate: true if the test case has deterministic steps and clear data.

Required JSON schema:

{
  "test_cases": [
    {
      "title": "string",
      "scenario": "string or null",
      "preconditions": "string or null",
      "test_steps": ["step 1", "step 2"],
      "test_data": "string or null",
      "expected_result": "string",
      "priority": "High",
      "severity": "Critical",
      "test_type": "Positive",
      "automation_candidate": false,
      "execution_type": "Manual"
    }
  ]
}
"""


def build_user_prompt(requirement: Requirement, document_context: str | None = None) -> str:
    def _join_list(items) -> str:
        if not items:
            return "None"
        if isinstance(items, list):
            return "\n".join(f"  - {item}" for item in items)
        return str(items)

    sections = [
        f"Generate test cases for the following requirement:\n",
        f"Requirement ID: {requirement.id}",
        f"Title: {requirement.title}",
        f"Description: {requirement.description or 'N/A'}",
        f"Functional Requirement:\n  {requirement.functional_requirement or 'N/A'}",
    ]

    if requirement.actor:
        sections.append(f"Actor: {requirement.actor}")

    if requirement.module_name:
        sections.append(f"Module: {requirement.module_name}")

    if requirement.feature_name:
        sections.append(f"Feature: {requirement.feature_name}")

    if requirement.preconditions:
        sections.append(f"Preconditions:\n{_join_list(requirement.preconditions)}")

    if requirement.validation_rule:
        sections.append(f"Validation Rules:\n{_join_list(requirement.validation_rule)}")

    if requirement.validation_rules:
        sections.append(f"Additional Validation Rules:\n{_join_list(requirement.validation_rules)}")

    if requirement.business_rules:
        sections.append(f"Business Rules:\n{_join_list(requirement.business_rules)}")

    if requirement.workflow:
        sections.append(f"Workflow Steps:\n{_join_list(requirement.workflow)}")

    if requirement.permission:
        sections.append(f"Permissions:\n{_join_list(requirement.permission)}")

    if requirement.error_handling:
        sections.append(f"Error Handling:\n{_join_list(requirement.error_handling)}")

    if requirement.inputs:
        sections.append(f"Inputs:\n{_join_list(requirement.inputs)}")

    if requirement.outputs:
        sections.append(f"Expected Outputs:\n{_join_list(requirement.outputs)}")

    if requirement.exception_flows:
        sections.append(f"Exception Flows:\n{_join_list(requirement.exception_flows)}")

    if document_context:
        sections.append(
            f"[DOCUMENT CONTEXT]\n"
            f"The following excerpts are the most relevant sections from the original source document.\n"
            f"Use them to enrich the test cases with concrete data, edge cases, and business rules\n"
            f"that may not be fully captured in the requirement fields above:\n\n"
            f"{document_context}"
        )

    sections.append("""
Before returning JSON, internally verify:
- every validation rule has at least one negative test case;
- every error handling scenario has a dedicated test case;
- title values are unique and descriptive;
- test_steps contains at least 2 steps for each test case;
- the response is ONLY valid JSON matching the required schema.
""")

    return "\n\n".join(sections)
