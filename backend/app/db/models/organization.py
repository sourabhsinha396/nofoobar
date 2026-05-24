from uuid import UUID, uuid4

from sqlmodel import Field

from app.db.models.common import TimestampedModel


class Organization(TimestampedModel, table=True):
    __tablename__ = "organizations"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    slug: str = Field(unique=True, index=True, max_length=64)
    name: str = Field(max_length=255)

    custom_domain: str | None = Field(default=None, unique=True, index=True, max_length=253)
    logo_url: str | None = Field(default=None, max_length=500)
    primary_color: str | None = Field(default=None, max_length=7)
    description: str | None = Field(default=None, max_length=500)
