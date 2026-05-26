from enum import StrEnum
from typing import Any
from uuid import UUID, uuid4

from sqlalchemy import Enum as SAEnum
from sqlalchemy import Index
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import Field, Relationship

from app.db.models.common import TimestampedModel
from app.db.models.organization import Organization


class HomepageBlockType(StrEnum):
    HERO = "hero"
    STATS = "stats"
    FEATURED_COURSES = "featured_courses"
    TESTIMONIALS = "testimonials"
    FAQS = "faqs"


class OrganizationHomepageBlock(TimestampedModel, table=True):
    __tablename__ = "organization_homepage_blocks"
    __table_args__ = (
        Index("ix_homepage_block_org_position", "org_id", "position"),
    )

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    org_id: UUID = Field(foreign_key="organizations.id", index=True)
    type: HomepageBlockType = Field(
        sa_type=SAEnum(
            HomepageBlockType,
            name="homepage_block_type",
            values_callable=lambda enum: [m.value for m in enum],
        )
    )
    position: int = Field(default=0)
    # Per-type config shape validated by the discriminated union in
    # app/schemas/homepage_block.py. The DB column is opaque JSONB; schemas
    # are the source of truth for what's a valid block.
    config: dict[str, Any] = Field(default_factory=dict, sa_type=JSONB)
    is_enabled: bool = Field(default=True, sa_column_kwargs={"server_default": "true"})

    org: Organization = Relationship()
