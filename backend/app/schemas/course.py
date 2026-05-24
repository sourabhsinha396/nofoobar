from typing import Annotated
from uuid import UUID

from pydantic import StringConstraints
from sqlmodel import SQLModel

from app.db.models.course import CourseVisibility
from app.schemas.common import Slug
from app.schemas.section import SectionOutline, SectionPublic


class CourseCreate(SQLModel):
    slug: Slug
    title: Annotated[str, StringConstraints(min_length=1, max_length=255)]
    description: Annotated[str, StringConstraints(max_length=2000)] | None = None


class CourseUpdate(SQLModel):
    slug: Slug | None = None
    title: Annotated[str, StringConstraints(min_length=1, max_length=255)] | None = None
    description: Annotated[str, StringConstraints(max_length=2000)] | None = None
    visibility: CourseVisibility | None = None


class CoursePublic(SQLModel):
    id: UUID
    org_id: UUID
    slug: str
    title: str
    description: str | None = None
    visibility: CourseVisibility


class CourseDetailPublic(CoursePublic):
    sections: list[SectionPublic] = []


class CourseSummary(SQLModel):
    id: UUID
    slug: str
    title: str
    description: str | None = None


class CourseLanding(CourseSummary):
    sections: list[SectionOutline] = []
