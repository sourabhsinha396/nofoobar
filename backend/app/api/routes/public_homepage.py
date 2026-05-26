from fastapi import APIRouter
from sqlmodel import select

from app.api.deps import CurrentOrgDep, SessionDep
from app.db.models.homepage_block import OrganizationHomepageBlock
from app.schemas.homepage_block import HomepageBlockPublic

router = APIRouter(prefix="/public/homepage", tags=["public-homepage"])


@router.get("")
async def list_homepage_blocks(
    org: CurrentOrgDep, session: SessionDep
) -> list[HomepageBlockPublic]:
    # Enabled blocks only. The frontend handles the empty-list case by
    # falling back to a synthetic default (org name + Browse courses CTA),
    # so we don't need a server-side default here.
    result = await session.exec(
        select(OrganizationHomepageBlock)
        .where(OrganizationHomepageBlock.org_id == org.id)
        .where(OrganizationHomepageBlock.is_enabled.is_(True))
        .order_by(OrganizationHomepageBlock.position)
    )
    return list(result.all())
