from fastapi import APIRouter
from sqlmodel import select

from app.api.deps import CurrentOrgDep, SessionDep
from app.db.models.payment_account import OrgPaymentAccount
from app.schemas.organization import OrganizationPublic
from app.schemas.payment_account import OrgPaymentAccountPublic

router = APIRouter(prefix="/tenant", tags=["tenant"])


@router.get("")
async def current_tenant(org: CurrentOrgDep, session: SessionDep) -> OrganizationPublic:
    # Pull payment accounts in a dedicated query rather than relying on the
    # relationship being eager-loaded by CurrentOrgDep (it isn't).
    result = await session.exec(
        select(OrgPaymentAccount).where(OrgPaymentAccount.org_id == org.id)
    )
    payment_accounts = [
        OrgPaymentAccountPublic(provider=a.provider, key_id=a.key_id)
        for a in result.all()
    ]
    return OrganizationPublic(
        id=org.id,
        slug=org.slug,
        name=org.name,
        custom_domain=org.custom_domain,
        logo_url=org.logo_url,
        primary_color=org.primary_color,
        description=org.description,
        payment_accounts=payment_accounts,
    )
