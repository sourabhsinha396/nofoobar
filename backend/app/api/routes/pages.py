from fastapi import APIRouter, HTTPException, Response, status
from sqlmodel import select

from app.api.deps import CurrentMembershipDep, SessionDep
from app.db.models.membership import Role
from app.db.models.page import OrganizationPage
from app.schemas.page import (
    OrganizationPageCreate,
    OrganizationPagePublic,
    OrganizationPageSummary,
    OrganizationPageUpdate,
)

router = APIRouter(prefix="/admin/pages", tags=["admin-pages"])


@router.get("")
async def list_pages_admin(
    membership: CurrentMembershipDep, session: SessionDep
) -> list[OrganizationPageSummary]:
    # Summary projection — listing pages shouldn't ship every body blob.
    result = await session.exec(
        select(OrganizationPage)
        .where(OrganizationPage.org_id == membership.org_id)
        .order_by(OrganizationPage.kind, OrganizationPage.slug)
    )
    return list(result.all())


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_page(
    payload: OrganizationPageCreate,
    membership: CurrentMembershipDep,
    session: SessionDep,
) -> OrganizationPagePublic:
    # Owner-only — pages are site chrome (legal docs, contact info), not
    # course content.
    if membership.role != Role.OWNER:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN, "Only owners can create pages"
        )

    existing = await session.exec(
        select(OrganizationPage)
        .where(OrganizationPage.org_id == membership.org_id)
        .where(OrganizationPage.slug == payload.slug)
    )
    if existing.first() is not None:
        raise HTTPException(
            status.HTTP_409_CONFLICT, "A page with that slug already exists"
        )

    page = OrganizationPage(
        org_id=membership.org_id,
        slug=payload.slug,
        title=payload.title,
        body=payload.body.model_dump(mode="json"),
        kind=payload.kind,
        is_published=payload.is_published,
        show_in_footer=payload.show_in_footer,
        footer_position=payload.footer_position,
    )
    session.add(page)
    await session.commit()
    await session.refresh(page)
    return page


async def _get_or_404(
    session: SessionDep, org_id, slug: str
) -> OrganizationPage:
    result = await session.exec(
        select(OrganizationPage)
        .where(OrganizationPage.org_id == org_id)
        .where(OrganizationPage.slug == slug)
    )
    page = result.first()
    if page is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"No page with slug {slug!r}")
    return page


@router.get("/{slug}")
async def get_page_admin(
    slug: str, membership: CurrentMembershipDep, session: SessionDep
) -> OrganizationPagePublic:
    return await _get_or_404(session, membership.org_id, slug)


@router.patch("/{slug}")
async def update_page(
    slug: str,
    payload: OrganizationPageUpdate,
    membership: CurrentMembershipDep,
    session: SessionDep,
) -> OrganizationPagePublic:
    if membership.role != Role.OWNER:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN, "Only owners can edit pages"
        )

    page = await _get_or_404(session, membership.org_id, slug)
    update_data = payload.model_dump(exclude_unset=True, mode="json")

    if "slug" in update_data and update_data["slug"] != page.slug:
        existing = await session.exec(
            select(OrganizationPage)
            .where(OrganizationPage.org_id == membership.org_id)
            .where(OrganizationPage.slug == update_data["slug"])
        )
        if existing.first() is not None:
            raise HTTPException(
                status.HTTP_409_CONFLICT, "A page with that slug already exists"
            )

    for field, value in update_data.items():
        setattr(page, field, value)

    await session.commit()
    await session.refresh(page)
    return page


@router.delete("/{slug}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_page(
    slug: str, membership: CurrentMembershipDep, session: SessionDep
) -> Response:
    if membership.role != Role.OWNER:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN, "Only owners can delete pages"
        )

    page = await _get_or_404(session, membership.org_id, slug)
    await session.delete(page)
    await session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
