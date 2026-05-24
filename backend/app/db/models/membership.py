from enum import StrEnum
from uuid import UUID, uuid4

from sqlalchemy import Enum as SAEnum
from sqlalchemy import Index, UniqueConstraint, text
from sqlmodel import Field, Relationship

from app.db.models.common import TimestampedModel
from app.db.models.organization import Organization


class Role(StrEnum):
    OWNER = "owner"
    INSTRUCTOR = "instructor"
    STUDENT = "student"


class UserOrgMembership(TimestampedModel, table=True):
    __tablename__ = "user_org_memberships"
    __table_args__ = (
        UniqueConstraint("user_id", "org_id", name="uq_membership_user_org"),
        Index(
            "uq_membership_owner_per_org",
            "org_id",
            unique=True,
            postgresql_where=text("role = 'owner'"),
        ),
    )

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    user_id: UUID = Field(foreign_key="users.id", index=True)
    org_id: UUID = Field(foreign_key="organizations.id", index=True)
    role: Role = Field(
        sa_type=SAEnum(Role, name="membership_role", values_callable=lambda enum: [m.value for m in enum])
    )

    org: Organization = Relationship()
