from uuid import UUID

from app.models import Requirement


class RequirementRepository:
    def __init__(self, db):
        self.db = db

    def create_many(self, requirements: list[Requirement]) -> list[Requirement]:
        self.db.add_all(requirements)
        self.db.commit()

        for requirement in requirements:
            self.db.refresh(requirement)

        return requirements

    def get_latest_version_by_document_id(self, document_id: UUID) -> int:
        latest = (
            self.db.query(Requirement.version)
            .filter(Requirement.document_id == document_id)
            .order_by(Requirement.version.desc())
            .first()
        )

        return latest[0] if latest else 0

    def list_by_document_id(self, document_id: UUID) -> list[Requirement]:
        return (
            self.db.query(Requirement)
            .filter(Requirement.document_id == document_id)
            .order_by(Requirement.created_at.desc())
            .all()
        )
