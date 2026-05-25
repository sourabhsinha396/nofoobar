from typing import Annotated, Literal
from uuid import UUID

from pydantic import Field, StringConstraints, field_validator
from sqlmodel import SQLModel

from app.db.models.course import CourseLevel, CourseVisibility
from app.schemas.common import Slug
from app.schemas.section import SectionOutline, SectionPublic

# Supported currencies for paid courses. Stored upper-case (ISO 4217 codes).
Currency = Literal["USD", "EUR", "GBP", "INR", "AUD"]

TAG_MAX_LENGTH = 32
TAGS_MAX_COUNT = 20


def normalize_tags(tags: list[str]) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []
    for tag in tags:
        cleaned = tag.strip().lower()
        if not cleaned or cleaned in seen:
            continue
        if len(cleaned) > TAG_MAX_LENGTH:
            cleaned = cleaned[:TAG_MAX_LENGTH]
        seen.add(cleaned)
        result.append(cleaned)
        if len(result) >= TAGS_MAX_COUNT:
            break
    return result


class CourseCreate(SQLModel):
    slug: Slug
    title: Annotated[str, StringConstraints(min_length=1, max_length=255)]
    description: Annotated[str, StringConstraints(max_length=2000)] | None = None
    price_cents: Annotated[int, Field(ge=0)] | None = None
    currency: Currency = "USD"
    logo_url: Annotated[str, StringConstraints(max_length=500)] | None = None
    level: CourseLevel = CourseLevel.BEGINNER
    tags: list[str] = Field(default_factory=list)

    @field_validator("tags", mode="after")
    @classmethod
    def _normalize_tags(cls, v: list[str]) -> list[str]:
        return normalize_tags(v)


class CourseUpdate(SQLModel):
    slug: Slug | None = None
    title: Annotated[str, StringConstraints(min_length=1, max_length=255)] | None = None
    description: Annotated[str, StringConstraints(max_length=2000)] | None = None
    visibility: CourseVisibility | None = None
    price_cents: Annotated[int, Field(ge=0)] | None = None
    currency: Currency | None = None
    logo_url: Annotated[str, StringConstraints(max_length=500)] | None = None
    level: CourseLevel | None = None
    tags: list[str] | None = None

    @field_validator("tags", mode="after")
    @classmethod
    def _normalize_tags(cls, v: list[str] | None) -> list[str] | None:
        return normalize_tags(v) if v is not None else None


class CoursePublic(SQLModel):
    id: UUID
    org_id: UUID
    slug: str
    title: str
    description: str | None = None
    visibility: CourseVisibility
    price_cents: int | None = None
    currency: str
    logo_url: str | None = None
    level: CourseLevel
    tags: list[str] = []


class CourseDetailPublic(CoursePublic):
    sections: list[SectionPublic] = []


class CourseSummary(SQLModel):
    id: UUID
    slug: str
    title: str
    description: str | None = None
    price_cents: int | None = None
    currency: str
    logo_url: str | None = None
    level: CourseLevel
    tags: list[str] = []


class CourseLanding(CourseSummary):
    sections: list[SectionOutline] = []
