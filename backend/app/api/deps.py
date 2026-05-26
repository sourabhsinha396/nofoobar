from collections.abc import AsyncGenerator
from typing import Annotated, Literal
from uuid import UUID

from fastapi import Depends, HTTPException, Request, status
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.config import settings
from app.db.db import async_session_factory
from app.db.models.membership import UserOrgMembership
from app.db.models.organization import Organization
from app.db.models.user import User

_LOCAL_HOSTS = {"localhost", "127.0.0.1", "host.docker.internal"}

TenantLookup = tuple[Literal["slug", "domain"], str]


async def get_session() -> AsyncGenerator[AsyncSession]:
    async with async_session_factory() as session:
        yield session


SessionDep = Annotated[AsyncSession, Depends(get_session)]


def _resolve_tenant(request: Request) -> TenantLookup:
    host = request.headers.get("host", "").split(":")[0].lower()
    apex = settings.APEX_DOMAIN.lower()

    # Trusted hosts (local-dev loopbacks + the apex itself) carry the tenant
    # in an X-Tenant-Slug header. The apex case covers server-to-server calls
    # from the Next frontend, which fetches the backend at apex:port and tells
    # us which tenant the originating request belonged to via the header.
    if host in _LOCAL_HOSTS or host == apex:
        slug = request.headers.get("x-tenant-slug", "").strip().lower()
        if not slug:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Missing X-Tenant-Slug header")
        return ("slug", slug)

    if host.endswith(f".{apex}"):
        slug = host[: -len(apex) - 1]
        if not slug or "." in slug:
            raise HTTPException(status.HTTP_404_NOT_FOUND, f"Invalid tenant subdomain: {host}")
        return ("slug", slug)

    return ("domain", host)


async def get_current_org(request: Request, session: SessionDep) -> Organization:
    kind, value = _resolve_tenant(request)
    if kind == "slug":
        stmt = select(Organization).where(Organization.slug == value)
    else:
        stmt = select(Organization).where(Organization.custom_domain == value)
    result = await session.exec(stmt)
    org = result.first()
    if org is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Unknown tenant: {value}")
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


async def get_current_user_optional(request: Request, session: SessionDep) -> User | None:
    user_id_str = request.session.get("user_id")
    if not user_id_str:
        return None
    try:
        user_id = UUID(user_id_str)
    except (ValueError, TypeError):
        return None
    result = await session.exec(select(User).where(User.id == user_id))
    return result.first()


OptionalCurrentUserDep = Annotated[User | None, Depends(get_current_user_optional)]


async def get_current_membership(
    user: CurrentUserDep, org: CurrentOrgDep, session: SessionDep
) -> UserOrgMembership:
    result = await session.exec(
        select(UserOrgMembership)
        .where(UserOrgMembership.user_id == user.id)
        .where(UserOrgMembership.org_id == org.id)
    )
    membership = result.first()
    if membership is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not a member of this organization")
    return membership


CurrentMembershipDep = Annotated[UserOrgMembership, Depends(get_current_membership)]
