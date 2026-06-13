from fastapi import APIRouter, HTTPException, status
from sqlmodel import select

from app.api.deps import CurrentMembershipDep, SessionDep
from app.db.models.membership import Role
from app.db.models.nav_link import NavLinkLocation, OrganizationNavLink
from app.schemas.nav_link import NavLinkPublic, NavLinksReplacePayload

router = APIRouter(prefix="/admin/nav-links", tags=["admin-nav-links"])


@router.get("")
async def list_nav_links_admin(
    location: NavLinkLocation,
    membership: CurrentMembershipDep,
    session: SessionDep,
) -> list[NavLinkPublic]:
    # Admin variant returns ALL rows (incl. disabled) for the chosen
    # location. Any org member can read; writes are gated on owner.
    result = await session.exec(
        select(OrganizationNavLink)
        .where(OrganizationNavLink.org_id == membership.org_id)
        .where(OrganizationNavLink.location == location)
        .order_by(OrganizationNavLink.position)
    )
    return list(result.all())


@router.put("")
async def replace_nav_links(
    location: NavLinkLocation,
    payload: NavLinksReplacePayload,
    membership: CurrentMembershipDep,
    session: SessionDep,
) -> list[NavLinkPublic]:
    # Site chrome (nav, footer, branding) is owner-only - instructors stay
    # scoped to course/lesson edits.
    if membership.role != Role.OWNER:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN, "Only owners can edit navigation links"
        )

    # Wipe-and-rewrite, scoped to the chosen location so editing the header
    # doesn't disturb footer links and vice versa.
    existing = await session.exec(
        select(OrganizationNavLink)
        .where(OrganizationNavLink.org_id == membership.org_id)
        .where(OrganizationNavLink.location == location)
    )
    for row in existing.all():
        await session.delete(row)
    await session.flush()

    new_rows: list[OrganizationNavLink] = []
    for idx, item in enumerate(payload.links):
        row = OrganizationNavLink(
            org_id=membership.org_id,
            location=location,
            label=item.label,
            href=item.href,
            open_in_new_tab=item.open_in_new_tab,
            position=idx,
            is_enabled=item.is_enabled,
        )
        session.add(row)
        new_rows.append(row)

    await session.commit()
    for row in new_rows:
        await session.refresh(row)
    return new_rows
