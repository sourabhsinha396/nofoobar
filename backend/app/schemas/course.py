from typing import Annotated, Literal
from uuid import UUID

from pydantic import Field, StringConstraints
from sqlmodel import SQLModel

from app.db.models.course import CourseVisibility
from app.schemas.common import Slug
from app.schemas.section import SectionOutline, SectionPublic

# Supported currencies for paid courses. Stored upper-case (ISO 4217 codes).
Currency = Literal["USD", "EUR", "GBP", "INR", "AUD"]


class CourseCreate(SQLModel):
    slug: Slug
    title: Annotated[str, StringConstraints(min_length=1, max_length=255)]
    description: Annotated[str, StringConstraints(max_length=2000)] | None = None
    price_cents: Annotated[int, Field(ge=0)] | None = None
    currency: Currency = "USD"


class CourseUpdate(SQLModel):
    slug: Slug | None = None
    title: Annotated[str, StringConstraints(min_length=1, max_length=255)] | None = None
    description: Annotated[str, StringConstraints(max_length=2000)] | None = None
    visibility: CourseVisibility | None = None
    price_cents: Annotated[int, Field(ge=0)] | None = None
    currency: Currency | None = None


class CoursePublic(SQLModel):
    id: UUID
    org_id: UUID
    slug: str
    title: str
    description: str | None = None
    visibility: CourseVisibility
    price_cents: int | None = None
    currency: str


class CourseDetailPublic(CoursePublic):
    sections: list[SectionPublic] = []


class CourseSummary(SQLModel):
    id: UUID
    slug: str
    title: str
    description: str | None = None
    price_cents: int | None = None
    currency: str


class CourseLanding(CourseSummary):
    sections: list[SectionOutline] = []
