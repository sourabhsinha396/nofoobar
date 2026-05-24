from fastapi import APIRouter, HTTPException, status
from sqlmodel import select

from app.api.deps import CurrentUserDep, SessionDep
from app.db.models.membership import Role, UserOrgMembership
from app.db.models.organization import Organization
from app.schemas.organization import OrganizationCreate, OrganizationPublic

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
    await session.refresh(org)

    return OrganizationPublic(
        id=org.id,
        slug=org.slug,
        name=org.name,
        logo_url=org.logo_url,
        primary_color=org.primary_color,
        description=org.description,
    )
