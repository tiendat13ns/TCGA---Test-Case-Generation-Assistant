from uuid import UUID

from app.models import TestCase


class TestCaseRepository:
    def __init__(self, db):
        self.db = db

    def create_many(self, test_cases: list[TestCase]) -> list[TestCase]:
        self.db.add_all(test_cases)
        self.db.commit()

        for test_case in test_cases:
            self.db.refresh(test_case)

        return test_cases

    def get_latest_version_by_requirement_id(self, requirement_id: UUID) -> int:
        latest = (
            self.db.query(TestCase.version)
            .filter(TestCase.requirement_id == requirement_id)
            .order_by(TestCase.version.desc())
            .first()
        )

        return latest[0] if latest else 0

    def list_by_requirement_id(self, requirement_id: UUID) -> list[TestCase]:
        return (
            self.db.query(TestCase)
            .filter(TestCase.requirement_id == requirement_id)
            .order_by(TestCase.created_at.desc())
            .all()
        )
