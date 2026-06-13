from enum import StrEnum
from typing import Annotated
from uuid import UUID

from pydantic import BaseModel, BeforeValidator, Field, HttpUrl, StringConstraints
from sqlmodel import SQLModel

from app.schemas.common import Slug
from app.schemas.payment_account import OrgPaymentAccountPublic

# Permissive email check - avoids pulling in `email-validator` for what is
# really just a "looks like an email" guard. The address is shown back to
# the tenant; we don't send mail from it. Tighten later if we need to.
_EMAIL_PATTERN = r"^[^@\s]+@[^@\s]+\.[^@\s]+$"
EmailLike = Annotated[str, StringConstraints(pattern=_EMAIL_PATTERN, max_length=255)]

# Hostname for tenant custom domains: lowercase labels, at least one dot, no
# scheme/port/path. Normalization runs in a BeforeValidator because pydantic
# checks `pattern` against the raw input, before to_lower/strip transforms.
# (No lookaheads - pydantic compiles patterns with the Rust regex engine.)
_DOMAIN_PATTERN = r"^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$"


def _normalize_domain(value: object) -> object:
    if isinstance(value, str):
        return value.strip().lower().rstrip(".")
    return value


DomainName = Annotated[
    str,
    BeforeValidator(_normalize_domain),
    StringConstraints(pattern=_DOMAIN_PATTERN, max_length=253),
]


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
    the payload entirely - the route uses `model_dump(exclude_unset=True)`
    to distinguish "unset" from "explicitly cleared".
    """

    name: Annotated[str, StringConstraints(min_length=1, max_length=255)] | None = None
    description: Annotated[str, StringConstraints(max_length=500)] | None = None
    logo_url: Annotated[str, StringConstraints(max_length=500)] | None = None
    tagline: Annotated[str, StringConstraints(max_length=140)] | None = None
    footer_text: Annotated[str, StringConstraints(max_length=500)] | None = None
    contact_email: EmailLike | None = None
    social_links: Annotated[list[SocialLinkItem], Field(max_length=16)] | None = None
    # Owner-editable custom domain. Route-level checks add what the type
    # can't express: not a platform (sub)domain, not claimed by another org.
    custom_domain: DomainName | None = None


class DomainStatus(BaseModel):
    """Live DNS connection state for the org's custom domain, shown in the
    settings UI. `configured` is whether a domain is set at all; `connected`
    is whether its DNS currently points at the platform."""

    configured: bool
    domain: str | None = None
    expected_target: str | None = None
    connected: bool = False
    resolved_ips: list[str] = []
    expected_ips: list[str] = []
    message: str | None = None


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
