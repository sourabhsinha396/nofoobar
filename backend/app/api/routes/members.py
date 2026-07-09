from uuid import UUID

from fastapi import APIRouter, HTTPException, status
from sqlmodel import select

from app.api.deps import CurrentMembershipDep, SessionDep
from app.core.security import hash_password
from app.db.models.membership import Role, UserOrgMembership
from app.db.models.user import User
from app.schemas.membership import OrgMemberPublic, OrgMemberUpdate

router = APIRouter(prefix="/admin/members", tags=["admin-members"])


@router.get("")
async def list_members(
    membership: CurrentMembershipDep,
    session: SessionDep,
) -> list[OrgMemberPublic]:
    # The roster exposes member emails, so students can't read it. Owners and
    # instructors can; edits are gated separately on owner.
    if membership.role == Role.STUDENT:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN, "Students can't view the member roster"
        )
    result = await session.exec(
        select(User, UserOrgMembership)
        .join(UserOrgMembership, UserOrgMembership.user_id == User.id)
        .where(UserOrgMembership.org_id == membership.org_id)
        .order_by(UserOrgMembership.created_at.desc())
    )
    return [
        OrgMemberPublic(
            user_id=user.id,
            name=user.name,
            email=user.email,
            role=m.role,
            joined_at=m.created_at,
        )
        for user, m in result.all()
    ]


@router.patch("/{user_id}")
async def update_member(
    user_id: UUID,
    payload: OrgMemberUpdate,
    membership: CurrentMembershipDep,
    session: SessionDep,
) -> OrgMemberPublic:
    if membership.role != Role.OWNER:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN, "Only owners can edit members"
        )

    result = await session.exec(
        select(User, UserOrgMembership)
        .join(UserOrgMembership, UserOrgMembership.user_id == User.id)
        .where(UserOrgMembership.org_id == membership.org_id)
        .where(User.id == user_id)
    )
    row = result.first()
    if row is None:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND, "User is not a member of this organization"
        )
    user, target_membership = row

    # User accounts are platform-global (one email across all orgs). Letting
    # an owner rewrite credentials of someone who also belongs to another org
    # would be a cross-tenant account takeover, so such users must change
    # their own details. Owners always may edit their own account.
    if user.id != membership.user_id:
        if user.is_superuser:
            raise HTTPException(
                status.HTTP_403_FORBIDDEN, "This account can't be edited"
            )
        other_orgs = await session.exec(
            select(UserOrgMembership)
            .where(UserOrgMembership.user_id == user.id)
            .where(UserOrgMembership.org_id != membership.org_id)
        )
        if other_orgs.first() is not None:
            raise HTTPException(
                status.HTTP_403_FORBIDDEN,
                "This user belongs to other organizations; only they can change their account details",
            )

    update_data = payload.model_dump(exclude_unset=True)
    new_email = update_data.get("email")
    if new_email is not None and new_email != user.email:
        existing = await session.exec(
            select(User).where(User.email == new_email).where(User.id != user.id)
        )
        if existing.first() is not None:
            raise HTTPException(status.HTTP_409_CONFLICT, "Email already registered")

    if update_data.get("name") is not None:
        user.name = update_data["name"]
    if new_email is not None:
        user.email = new_email
    if update_data.get("password") is not None:
        user.password_hash = hash_password(update_data["password"])

    await session.commit()
    return OrgMemberPublic(
        user_id=user.id,
        name=user.name,
        email=user.email,
        role=target_membership.role,
        joined_at=target_membership.created_at,
    )
