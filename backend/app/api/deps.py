from collections.abc import AsyncGenerator
from typing import Annotated
from uuid import UUID

from fastapi import Depends, HTTPException, Request, status
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.db.db import async_session_factory
from app.db.models.organization import Organization
from app.db.models.user import User

_LOCAL_HOSTS = {"localhost", "127.0.0.1", "host.docker.internal"}


async def get_session() -> AsyncGenerator[AsyncSession]:
    async with async_session_factory() as session:
        yield session


SessionDep = Annotated[AsyncSession, Depends(get_session)]


def _resolve_slug(request: Request) -> str:
    host = request.headers.get("host", "").split(":")[0].lower()
    if host in _LOCAL_HOSTS:
        slug = request.headers.get("x-tenant-slug", "").strip().lower()
        if not slug:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Missing X-Tenant-Slug header (dev)")
        return slug
    parts = host.split(".")
    if len(parts) < 3:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No tenant subdomain in host")
    return parts[0]


async def get_current_org(request: Request, session: SessionDep) -> Organization:
    slug = _resolve_slug(request)
    result = await session.exec(select(Organization).where(Organization.slug == slug))
    org = result.first()
    if org is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Unknown tenant: {slug}")
    return org


CurrentOrgDep = Annotated[Organization, Depends(get_current_org)]


async def get_current_user(request: Request, session: SessionDep) -> User:
    user_id_str = request.session.get("user_id")
    if not user_id_str:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated")
    try:
        user_id = UUID(user_id_str)
    except (ValueError, TypeError) as exc:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid session") from exc
    result = await session.exec(select(User).where(User.id == user_id))
    user = result.first()
    if user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Stale session")
    return user


CurrentUserDep = Annotated[User, Depends(get_current_user)]
