from enum import StrEnum
from uuid import UUID, uuid4

from sqlalchemy import Enum as SAEnum
from sqlalchemy import Index
from sqlmodel import Field, Relationship

from app.db.models.common import TimestampedModel
from app.db.models.organization import Organization


class NavLinkLocation(StrEnum):
    HEADER = "header"
    FOOTER = "footer"


class OrganizationNavLink(TimestampedModel, table=True):
    __tablename__ = "organization_nav_links"
    __table_args__ = (
        Index(
            "ix_nav_link_org_location_position", "org_id", "location", "position"
        ),
    )

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    org_id: UUID = Field(foreign_key="organizations.id", index=True)
    location: NavLinkLocation = Field(
        sa_type=SAEnum(
            NavLinkLocation,
            name="nav_link_location",
            values_callable=lambda enum: [m.value for m in enum],
        )
    )
    label: str = Field(max_length=64)
    href: str = Field(max_length=2048)
    # Default true since the user's first ask was "_blank opening". Admins can
    # untick the box for in-tenant routes (e.g. "Pricing" → /pricing) where
    # same-tab navigation is more natural.
    open_in_new_tab: bool = Field(default=True, sa_column_kwargs={"server_default": "true"})
    position: int = Field(default=0)
    is_enabled: bool = Field(default=True, sa_column_kwargs={"server_default": "true"})

    org: Organization = Relationship()
