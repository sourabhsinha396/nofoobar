from uuid import UUID

from sqlmodel import SQLModel


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
    # Platform staff flag; the frontend uses it to exclude staff from analytics.
    is_superuser: bool = False
