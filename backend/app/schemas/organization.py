from typing import Annotated
from uuid import UUID

from pydantic import StringConstraints
from sqlmodel import SQLModel

from app.schemas.common import Slug


class OrganizationCreate(SQLModel):
    slug: Slug
    name: Annotated[str, StringConstraints(min_length=1, max_length=255)]


class OrganizationPublic(SQLModel):
    id: UUID
    slug: str
    name: str
    custom_domain: str | None = None
    logo_url: str | None = None
    primary_color: str | None = None
    description: str | None = None
