from uuid import UUID

from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.entitlements import PlanTier
from app.db.models.membership import Role, UserOrgMembership
from app.db.models.user import User


async def plan_for_org(session: AsyncSession, org_id: UUID) -> PlanTier:
    """Resolve an org's entitlement plan, which is its owner's plan.

    Plan lives on the User (the account that pays); an org inherits its owner's
    tier. Each org has exactly one owner (a partial unique index enforces it),
    so this is unambiguous. If an org somehow has no owner, fall back to the
    least-privileged tier rather than leaking paid features.
    """
    result = await session.exec(
        select(User.plan)
        .join(UserOrgMembership, UserOrgMembership.user_id == User.id)
        .where(UserOrgMembership.org_id == org_id)
        .where(UserOrgMembership.role == Role.OWNER)
    )
    plan = result.first()
    return plan if plan is not None else PlanTier.FREE
