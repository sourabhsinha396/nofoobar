from uuid import UUID

from sqlmodel import SQLModel


class UserCreate(SQLModel):
    email: str
    password: str
    name: str
    # Required only when RECAPTCHA_SECRET_KEY is configured server-side.
    recaptcha_token: str = ""


class LoginRequest(SQLModel):
    email: str
    password: str
    recaptcha_token: str = ""


class UserPublic(SQLModel):
    id: UUID
    email: str
    name: str
    # Platform staff flag; the frontend uses it to exclude staff from analytics.
    is_superuser: bool = False
