from fastapi import APIRouter, HTTPException, status
from sqlalchemy.orm import selectinload
from sqlmodel import select

from app.api.deps import CurrentMembershipDep, CurrentUserDep, SessionDep
from app.db.models.membership import Role, UserOrgMembership
from app.db.models.organization import Organization
from app.schemas.organization import OrganizationCreate, OrganizationPublic, OrganizationUpdate

router = APIRouter(prefix="/orgs", tags=["orgs"])


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_org(
    payload: OrganizationCreate,
    user: CurrentUserDep,
    session: SessionDep,
) -> OrganizationPublic:
    existing = await session.exec(select(Organization).where(Organization.slug == payload.slug))
    if existing.first() is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "Slug already taken")

    org = Organization(slug=payload.slug, name=payload.name)
    session.add(org)
    await session.flush()

    membership = UserOrgMembership(user_id=user.id, org_id=org.id, role=Role.OWNER)
    session.add(membership)
    await session.commit()

    # Explicit projection: a fresh org has no payment accounts, and we don't
    # want async-lazy-loading of the relationship during response
    # serialization (would raise MissingGreenlet).
    return OrganizationPublic(
        id=org.id,
        slug=org.slug,
        name=org.name,
        payment_accounts=[],
    )


@router.patch("/{slug}")
async def update_org(
    slug: str,
    payload: OrganizationUpdate,
    membership: CurrentMembershipDep,
    session: SessionDep,
) -> OrganizationPublic:
    # Site-chrome edits are owner-only — instructors stay scoped to course
    # and lesson edits. Brand, footer, and contact reflect the whole org's
    # public face.
    if membership.role != Role.OWNER:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN, "Only owners can edit organization settings"
        )

    # Eager-load payment_accounts: the response schema includes them and
    # async SQLAlchemy can't lazy-load mid-serialization (raises MissingGreenlet).
    result = await session.exec(
        select(Organization)
        .where(Organization.id == membership.org_id)
        .where(Organization.slug == slug)
        .options(selectinload(Organization.payment_accounts))
    )
    org = result.first()
    if org is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Organization not found")

    update_data = payload.model_dump(exclude_unset=True, mode="json")
    for field, value in update_data.items():
        setattr(org, field, value)

    await session.commit()
    return org
