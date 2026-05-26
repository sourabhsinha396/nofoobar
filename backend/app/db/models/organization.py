from typing import TYPE_CHECKING, Any
from uuid import UUID, uuid4

from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import Field, Relationship

from app.db.models.common import TimestampedModel

if TYPE_CHECKING:
    from app.db.models.payment_account import OrgPaymentAccount


class Organization(TimestampedModel, table=True):
    __tablename__ = "organizations"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    slug: str = Field(unique=True, index=True, max_length=64)
    name: str = Field(max_length=255)

    custom_domain: str | None = Field(default=None, unique=True, index=True, max_length=253)
    logo_url: str | None = Field(default=None, max_length=500)
    # primary_color is no longer exposed in the admin UI per the customization
    # cap (no visual styling knobs). Column kept to avoid an unnecessary DROP
    # migration; will be removed in a later cleanup once we're sure nothing
    # downstream still reads it.
    primary_color: str | None = Field(default=None, max_length=7)
    description: str | None = Field(default=None, max_length=500)

    # Tenant-facing content fields. All optional — empty falls back to sane
    # defaults at render time (e.g. footer_text falls back to "© <year> <name>").
    tagline: str | None = Field(default=None, max_length=140)
    footer_text: str | None = Field(default=None, max_length=500)
    contact_email: str | None = Field(default=None, max_length=255)
    # List of {platform, url} pairs. Shape validated by Pydantic in
    # app/schemas/organization.py; DB column is opaque JSONB.
    social_links: list[dict[str, Any]] = Field(
        default_factory=list,
        sa_type=JSONB,
        sa_column_kwargs={"server_default": "[]", "nullable": False},
    )

    payment_accounts: list["OrgPaymentAccount"] = Relationship(
        back_populates="org",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"},
    )
