from typing import Annotated, Literal
from uuid import UUID

from pydantic import BaseModel, Field, HttpUrl, StringConstraints

from app.db.models.homepage_block import HomepageBlockType

NonEmptyShortStr = Annotated[str, StringConstraints(min_length=1, max_length=255)]
ShortStr = Annotated[str, StringConstraints(max_length=255)]
LongStr = Annotated[str, StringConstraints(max_length=10_000)]
Href = Annotated[str, StringConstraints(min_length=1, max_length=2048)]


# --- Per-type config shapes ---------------------------------------------------
#
# Each config carries a `type` literal so callers can discriminate the union.
# The same `type` is also persisted on the block row so we can index/order
# without unpacking JSON.


class HeroConfig(BaseModel):
    type: Literal[HomepageBlockType.HERO] = HomepageBlockType.HERO
    headline: NonEmptyShortStr
    subheadline: ShortStr | None = None
    cta_label: ShortStr | None = None
    cta_href: Href | None = None
    background_image_url: HttpUrl | None = None


class StatItem(BaseModel):
    value: NonEmptyShortStr
    label: NonEmptyShortStr


class StatsConfig(BaseModel):
    type: Literal[HomepageBlockType.STATS] = HomepageBlockType.STATS
    heading: ShortStr | None = None
    items: Annotated[list[StatItem], Field(min_length=1, max_length=4)]


class FeaturedCoursesConfig(BaseModel):
    type: Literal[HomepageBlockType.FEATURED_COURSES] = HomepageBlockType.FEATURED_COURSES
    heading: ShortStr | None = None
    # Order of IDs is preserved as-is in the rendered list. Missing or
    # unpublished course IDs are silently dropped at render time.
    course_ids: Annotated[list[UUID], Field(max_length=12)] = []


class TestimonialItem(BaseModel):
    quote: Annotated[str, StringConstraints(min_length=1, max_length=1000)]
    name: NonEmptyShortStr
    role: ShortStr | None = None
    photo_url: HttpUrl | None = None
    course_id: UUID | None = None


class TestimonialsConfig(BaseModel):
    type: Literal[HomepageBlockType.TESTIMONIALS] = HomepageBlockType.TESTIMONIALS
    heading: ShortStr | None = None
    items: Annotated[list[TestimonialItem], Field(min_length=1, max_length=24)]


class FaqItem(BaseModel):
    question: NonEmptyShortStr
    answer: LongStr


class FaqsConfig(BaseModel):
    type: Literal[HomepageBlockType.FAQS] = HomepageBlockType.FAQS
    heading: ShortStr | None = None
    items: Annotated[list[FaqItem], Field(min_length=1, max_length=50)]


HomepageBlockConfig = Annotated[
    HeroConfig | StatsConfig | FeaturedCoursesConfig | TestimonialsConfig | FaqsConfig,
    Field(discriminator="type"),
]


# --- Wire shapes --------------------------------------------------------------


class HomepageBlockInput(BaseModel):
    """One block as posted by the admin during a full-list PUT.

    Position is *not* required - the server numbers blocks densely from 0
    in array order. is_enabled defaults to true.
    """

    config: HomepageBlockConfig
    is_enabled: bool = True


class HomepageBlocksReplacePayload(BaseModel):
    """Admin PUT body: the full ordered list of blocks for the org.

    Empty list is allowed and clears the homepage back to its synthetic
    default. Max length keeps a single payload reasonable.
    """

    blocks: Annotated[list[HomepageBlockInput], Field(max_length=24)]


class HomepageBlockPublic(BaseModel):
    """One block as returned to clients. The discriminated `config` lets
    typed frontends switch on `config.type` without an extra round-trip."""

    id: UUID
    type: HomepageBlockType
    position: int
    is_enabled: bool
    config: HomepageBlockConfig
