from datetime import datetime
from typing import Annotated
from uuid import UUID

from pydantic import StringConstraints
from sqlmodel import SQLModel

from app.db.models.membership import Role
from app.schemas.organization import OrganizationPublic


class MembershipPublic(SQLModel):
    org: OrganizationPublic
    role: Role


class OrgMemberPublic(SQLModel):
    """One row of the org's user roster: the user's account fields plus
    their role in this org. `joined_at` is the membership's created_at."""

    user_id: UUID
    name: str
    email: str
    role: Role
    joined_at: datetime


class OrgMemberUpdate(SQLModel):
    """PATCH body for `/admin/members/{user_id}`. All fields optional;
    only the ones provided are changed. `password` is the new plaintext
    password - it's hashed server-side, never stored as-is."""

    name: Annotated[str, StringConstraints(min_length=1, max_length=255)] | None = None
    email: Annotated[str, StringConstraints(min_length=3, max_length=320)] | None = None
    password: Annotated[str, StringConstraints(min_length=8, max_length=128)] | None = None
