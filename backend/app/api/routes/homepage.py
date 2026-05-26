from fastapi import APIRouter, HTTPException, status
from sqlmodel import select

from app.api.deps import CurrentMembershipDep, SessionDep
from app.db.models.homepage_block import OrganizationHomepageBlock
from app.db.models.membership import Role
from app.schemas.homepage_block import HomepageBlockPublic, HomepageBlocksReplacePayload

router = APIRouter(prefix="/admin/homepage", tags=["admin-homepage"])

_AUTHOR_ROLES = {Role.OWNER, Role.INSTRUCTOR}


@router.get("")
async def list_homepage_blocks_admin(
    membership: CurrentMembershipDep, session: SessionDep
) -> list[HomepageBlockPublic]:
    # Admin variant returns ALL blocks including disabled ones, since the
    # editor needs to surface them as toggleable rows.
    result = await session.exec(
        select(OrganizationHomepageBlock)
        .where(OrganizationHomepageBlock.org_id == membership.org_id)
        .order_by(OrganizationHomepageBlock.position)
    )
    return list(result.all())


@router.put("")
async def replace_homepage_blocks(
    payload: HomepageBlocksReplacePayload,
    membership: CurrentMembershipDep,
    session: SessionDep,
) -> list[HomepageBlockPublic]:
    if membership.role not in _AUTHOR_ROLES:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN, "Only owners and instructors can edit the homepage"
        )

    # Wipe-and-rewrite in a single transaction. Positions are assigned
    # densely 0..N-1 in array order so the client doesn't have to send them
    # and we never end up with gaps or ties.
    existing = await session.exec(
        select(OrganizationHomepageBlock).where(
            OrganizationHomepageBlock.org_id == membership.org_id
        )
    )
    for block in existing.all():
        await session.delete(block)
    # Flush the deletes before inserting; otherwise SQLAlchemy may emit the
    # INSERTs first and we'd race the (org_id, position) ordering inside the
    # unit of work.
    await session.flush()

    new_blocks: list[OrganizationHomepageBlock] = []
    for idx, item in enumerate(payload.blocks):
        block = OrganizationHomepageBlock(
            org_id=membership.org_id,
            type=item.config.type,
            position=idx,
            config=item.config.model_dump(mode="json"),
            is_enabled=item.is_enabled,
        )
        session.add(block)
        new_blocks.append(block)

    await session.commit()
    for block in new_blocks:
        await session.refresh(block)
    return new_blocks
