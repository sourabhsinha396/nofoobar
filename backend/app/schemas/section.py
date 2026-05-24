from typing import Annotated
from uuid import UUID

from pydantic import StringConstraints
from sqlmodel import SQLModel

from app.schemas.common import Slug
from app.schemas.lesson import LessonPublic


class SectionCreate(SQLModel):
    slug: Slug
    title: Annotated[str, StringConstraints(min_length=1, max_length=255)]
    description: Annotated[str, StringConstraints(max_length=2000)] | None = None


class SectionPublic(SQLModel):
    id: UUID
    org_id: UUID
    course_id: UUID
    slug: str
    title: str
    description: str | None = None
    position: int


class SectionDetailPublic(SectionPublic):
    lessons: list[LessonPublic] = []
