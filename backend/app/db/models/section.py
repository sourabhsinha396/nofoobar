from typing import TYPE_CHECKING
from uuid import UUID, uuid4

from sqlalchemy import Index, UniqueConstraint
from sqlmodel import Field, Relationship

from app.db.models.common import TimestampedModel
from app.db.models.organization import Organization

if TYPE_CHECKING:
    from app.db.models.course import Course
    from app.db.models.lesson import Lesson


class Section(TimestampedModel, table=True):
    __tablename__ = "sections"
    __table_args__ = (
        UniqueConstraint("org_id", "course_id", "slug", name="uq_section_course_slug"),
        Index("ix_section_course_position", "course_id", "position"),
    )

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    org_id: UUID = Field(foreign_key="organizations.id", index=True)
    course_id: UUID = Field(foreign_key="courses.id", index=True)
    slug: str = Field(max_length=63)
    title: str = Field(max_length=255)
    description: str | None = Field(default=None, max_length=2000)
    position: int = Field(default=0)

    org: Organization = Relationship()
    course: "Course" = Relationship(back_populates="sections")
    lessons: list["Lesson"] = Relationship(
        back_populates="section",
        sa_relationship_kwargs={"order_by": "Lesson.position", "cascade": "all, delete-orphan"},
    )
