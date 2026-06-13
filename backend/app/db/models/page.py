from enum import StrEnum
from typing import Any
from uuid import UUID, uuid4

from sqlalchemy import Enum as SAEnum
from sqlalchemy import UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import Field, Relationship

from app.db.models.common import TimestampedModel
from app.db.models.organization import Organization


class PageKind(StrEnum):
    """Why we keep a `kind` even though `body` is freeform:

    * Razorpay onboarding needs deterministic URLs for refund/contact at the
      time we hand over to the gateway - `kind = 'refund'` is the canonical
      hook, regardless of the slug the admin picked.
    * Admin dashboard can flag missing legal pages ("Privacy: not set").
    * Future: drop in a template body when a kind is chosen.

    `CUSTOM` is the long tail (About, Press, Affiliates, …).
    """

    TERMS = "terms"
    PRIVACY = "privacy"
    REFUND = "refund"
    CONTACT = "contact"
    CUSTOM = "custom"


class OrganizationPage(TimestampedModel, table=True):
    __tablename__ = "organization_pages"
    __table_args__ = (
        UniqueConstraint("org_id", "slug", name="uq_page_org_slug"),
    )

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    org_id: UUID = Field(foreign_key="organizations.id", index=True)
    slug: str = Field(max_length=63, index=True)
    title: str = Field(max_length=255)
    # TipTap doc, same renderer as lesson articles.
    body: dict[str, Any] = Field(default_factory=dict, sa_type=JSONB)
    kind: PageKind = Field(
        sa_type=SAEnum(
            PageKind,
            name="organization_page_kind",
            values_callable=lambda enum: [m.value for m in enum],
        )
    )
    is_published: bool = Field(default=False, sa_column_kwargs={"server_default": "false"})
    show_in_footer: bool = Field(
        default=False, sa_column_kwargs={"server_default": "false"}
    )
    footer_position: int = Field(default=0)

    org: Organization = Relationship()
