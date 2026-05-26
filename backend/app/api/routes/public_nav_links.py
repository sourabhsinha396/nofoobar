from fastapi import APIRouter
from sqlmodel import select

from app.api.deps import CurrentOrgDep, SessionDep
from app.db.models.nav_link import NavLinkLocation, OrganizationNavLink
from app.schemas.nav_link import NavLinkPublic

router = APIRouter(prefix="/public/nav-links", tags=["public-nav-links"])


@router.get("")
async def list_nav_links(
    location: NavLinkLocation,
    org: CurrentOrgDep,
    session: SessionDep,
) -> list[NavLinkPublic]:
    # Enabled only. Disabled rows stay in the admin editor's list so they
    # can be re-enabled without losing the config, but they're invisible to
    # the public.
    result = await session.exec(
        select(OrganizationNavLink)
        .where(OrganizationNavLink.org_id == org.id)
        .where(OrganizationNavLink.location == location)
        .where(OrganizationNavLink.is_enabled.is_(True))
        .order_by(OrganizationNavLink.position)
    )
    return list(result.all())
