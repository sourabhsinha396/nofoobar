from fastapi import APIRouter

from app.api.deps import CurrentOrgDep
from app.db.models.organization import Organization

router = APIRouter(prefix="/tenant", tags=["tenant"])


@router.get("")
async def current_tenant(org: CurrentOrgDep) -> Organization:
    return org
