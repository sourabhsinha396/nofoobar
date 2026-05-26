from fastapi import APIRouter, HTTPException, status
from sqlmodel import select

from app.api.deps import CurrentOrgDep, SessionDep
from app.db.models.page import OrganizationPage
from app.schemas.page import OrganizationPagePublic, OrganizationPageSummary

router = APIRouter(prefix="/public/pages", tags=["public-pages"])


@router.get("")
async def list_pages(
    org: CurrentOrgDep, session: SessionDep
) -> list[OrganizationPageSummary]:
    # Published only. Frontend uses this to build the footer link merge
    # (pages WHERE show_in_footer + nav_links WHERE location=footer).
    result = await session.exec(
        select(OrganizationPage)
        .where(OrganizationPage.org_id == org.id)
        .where(OrganizationPage.is_published.is_(True))
        .order_by(OrganizationPage.footer_position, OrganizationPage.slug)
    )
    return list(result.all())


@router.get("/{slug}")
async def get_page(
    slug: str, org: CurrentOrgDep, session: SessionDep
) -> OrganizationPagePublic:
    result = await session.exec(
        select(OrganizationPage)
        .where(OrganizationPage.org_id == org.id)
        .where(OrganizationPage.slug == slug)
        .where(OrganizationPage.is_published.is_(True))
    )
    page = result.first()
    if page is None:
        # Same shape as a missing page so we don't leak the existence of
        # unpublished drafts.
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"No page with slug {slug!r}")
    return page
