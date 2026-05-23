from uuid import UUID, uuid4

from sqlmodel import Field, SQLModel

from app.db.models.common import TimestampedModel


class User(TimestampedModel, table=True):
    __tablename__ = "users"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    email: str = Field(unique=True, index=True, max_length=320)
    password_hash: str = Field(max_length=255)
    name: str = Field(max_length=255)


class UserCreate(SQLModel):
    email: str
    password: str
    name: str


class LoginRequest(SQLModel):
    email: str
    password: str


class UserPublic(SQLModel):
    id: UUID
    email: str
    name: str
