from typing import TYPE_CHECKING
from uuid import UUID, uuid4

from sqlalchemy import UniqueConstraint
from sqlmodel import Field, Relationship

from app.db.models.common import TimestampedModel
from app.db.models.organization import Organization

if TYPE_CHECKING:
    from app.db.models.section import Section


class Course(TimestampedModel, table=True):
    __tablename__ = "courses"
    __table_args__ = (UniqueConstraint("org_id", "slug", name="uq_course_org_slug"),)

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    org_id: UUID = Field(foreign_key="organizations.id", index=True)
    slug: str = Field(max_length=63)
    title: str = Field(max_length=255)
    description: str | None = Field(default=None, max_length=2000)

    org: Organization = Relationship()
    sections: list["Section"] = Relationship(
        back_populates="course",
        sa_relationship_kwargs={"order_by": "Section.position", "cascade": "all, delete-orphan"},
    )
