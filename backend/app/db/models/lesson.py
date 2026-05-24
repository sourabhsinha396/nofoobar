from enum import StrEnum
from typing import TYPE_CHECKING, Any
from uuid import UUID, uuid4

from sqlalchemy import Enum as SAEnum
from sqlalchemy import Index, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import Field, Relationship

from app.db.models.common import TimestampedModel
from app.db.models.organization import Organization

if TYPE_CHECKING:
    from app.db.models.section import Section


class ContentType(StrEnum):
    ARTICLE = "article"
    VIDEO = "video"
    LAB = "lab"
    QUIZ = "quiz"


class Lesson(TimestampedModel, table=True):
    __tablename__ = "lessons"
    __table_args__ = (
        UniqueConstraint("org_id", "section_id", "slug", name="uq_lesson_section_slug"),
        Index("ix_lesson_section_position", "section_id", "position"),
    )

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    org_id: UUID = Field(foreign_key="organizations.id", index=True)
    course_id: UUID = Field(foreign_key="courses.id", index=True)
    section_id: UUID = Field(foreign_key="sections.id", index=True)
    slug: str = Field(max_length=63)
    title: str = Field(max_length=255)
    content_type: ContentType = Field(
        sa_type=SAEnum(
            ContentType, name="lesson_content_type", values_callable=lambda enum: [m.value for m in enum]
        )
    )
    content: dict[str, Any] = Field(default_factory=dict, sa_type=JSONB)
    position: int = Field(default=0)

    org: Organization = Relationship()
    section: "Section" = Relationship(back_populates="lessons")
