from fastapi import APIRouter
from sqlalchemy.orm import selectinload
from sqlmodel import select

from app.api.deps import CurrentUserDep, SessionDep
from app.db.models.membership import UserOrgMembership
from app.db.models.organization import Organization
from app.schemas.membership import MembershipPublic
from app.schemas.user import UserPublic

router = APIRouter(tags=["me"])


@router.get("/me")
async def me(user: CurrentUserDep) -> UserPublic:
    return UserPublic(id=user.id, email=user.email, name=user.name)


@router.get("/me/orgs")
async def my_orgs(user: CurrentUserDep, session: SessionDep) -> list[MembershipPublic]:
    result = await session.exec(
        select(UserOrgMembership)
        .options(
            selectinload(UserOrgMembership.org).selectinload(Organization.payment_accounts)
        )
        .where(UserOrgMembership.user_id == user.id)
    )
    return list(result.all())
