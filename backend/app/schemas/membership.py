from sqlmodel import SQLModel

from app.db.models.membership import Role
from app.schemas.organization import OrganizationPublic


class MembershipPublic(SQLModel):
    org: OrganizationPublic
    role: Role
