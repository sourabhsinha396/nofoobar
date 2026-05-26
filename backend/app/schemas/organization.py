from enum import StrEnum
from typing import Annotated
from uuid import UUID

from pydantic import BaseModel, Field, HttpUrl, StringConstraints
from sqlmodel import SQLModel

from app.schemas.common import Slug
from app.schemas.payment_account import OrgPaymentAccountPublic

# Permissive email check — avoids pulling in `email-validator` for what is
# really just a "looks like an email" guard. The address is shown back to
# the tenant; we don't send mail from it. Tighten later if we need to.
_EMAIL_PATTERN = r"^[^@\s]+@[^@\s]+\.[^@\s]+$"
EmailLike = Annotated[str, StringConstraints(pattern=_EMAIL_PATTERN, max_length=255)]


class SocialPlatform(StrEnum):
    TWITTER = "twitter"
    LINKEDIN = "linkedin"
    YOUTUBE = "youtube"
    GITHUB = "github"
    WEBSITE = "website"


class SocialLinkItem(BaseModel):
    platform: SocialPlatform
    url: HttpUrl


class OrganizationCreate(SQLModel):
    slug: Slug
    name: Annotated[str, StringConstraints(min_length=1, max_length=255)]


class OrganizationUpdate(BaseModel):
    """Partial-update payload for PATCH /orgs/{slug}.

    All fields optional. Sending `None` explicitly clears a value (e.g.
    removing the logo). Fields the admin doesn't touch are omitted from
    the payload entirely — the route uses `model_dump(exclude_unset=True)`
    to distinguish "unset" from "explicitly cleared".
    """

    name: Annotated[str, StringConstraints(min_length=1, max_length=255)] | None = None
    description: Annotated[str, StringConstraints(max_length=500)] | None = None
    logo_url: Annotated[str, StringConstraints(max_length=500)] | None = None
    tagline: Annotated[str, StringConstraints(max_length=140)] | None = None
    footer_text: Annotated[str, StringConstraints(max_length=500)] | None = None
    contact_email: EmailLike | None = None
    social_links: Annotated[list[SocialLinkItem], Field(max_length=16)] | None = None


class OrganizationPublic(SQLModel):
    id: UUID
    slug: str
    name: str
    custom_domain: str | None = None
    logo_url: str | None = None
    description: str | None = None
    tagline: str | None = None
    footer_text: str | None = None
    contact_email: str | None = None
    social_links: list[SocialLinkItem] = []
    # Per-provider connection status; empty list means this tenant can't
    # accept paid payments yet. Frontend derives "needs onboarding" from
    # `payment_accounts.length === 0` (or filters by provider).
    payment_accounts: list[OrgPaymentAccountPublic] = []
