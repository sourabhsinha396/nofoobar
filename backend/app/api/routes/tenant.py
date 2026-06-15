from uuid import UUID

from fastapi import APIRouter
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.api.deps import CurrentOrgDep, OptionalCurrentUserDep, SessionDep
from app.db.models.membership import UserOrgMembership
from app.db.models.org_integration import IntegrationProvider, OrgIntegration
from app.db.models.payment_account import OrgPaymentAccount
from app.db.models.user import User
from app.schemas.organization import OrganizationPublic, PostHogPublic
from app.schemas.payment_account import OrgPaymentAccountPublic
from app.services.integrations.posthog import PostHogConfig

router = APIRouter(prefix="/tenant", tags=["tenant"])


async def _posthog_public(session: AsyncSession, org_id: UUID) -> PostHogPublic | None:
    """The org's enabled PostHog config, if any, as a browser-safe payload."""
    result = await session.exec(
        select(OrgIntegration)
        .where(OrgIntegration.org_id == org_id)
        .where(OrgIntegration.provider == IntegrationProvider.POSTHOG)
        .where(OrgIntegration.enabled.is_(True))
    )
    row = result.first()
    if row is None:
        return None
    config = PostHogConfig.model_validate(row.config)
    return PostHogPublic(project_api_key=config.project_api_key, host=config.host)


async def _viewer_role(session: AsyncSession, org_id: UUID, user: User | None) -> str | None:
    """The current viewer's role in this org, or None for anonymous/non-members.
    Lets the site exclude owners/instructors from analytics capture."""
    if user is None:
        return None
    result = await session.exec(
        select(UserOrgMembership.role)
        .where(UserOrgMembership.user_id == user.id)
        .where(UserOrgMembership.org_id == org_id)
    )
    role = result.first()
    return role.value if role is not None else None


@router.get("")
async def current_tenant(
    org: CurrentOrgDep, session: SessionDep, user: OptionalCurrentUserDep
) -> OrganizationPublic:
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
        description=org.description,
        tagline=org.tagline,
        footer_text=org.footer_text,
        contact_email=org.contact_email,
        social_links=org.social_links,
        meta_title=org.meta_title,
        meta_description=org.meta_description,
        og_image_url=org.og_image_url,
        payment_accounts=payment_accounts,
        posthog=await _posthog_public(session, org.id),
        viewer_role=await _viewer_role(session, org.id, user),
    )
