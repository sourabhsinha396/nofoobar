import logging

from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.entitlements import plan_allows
from app.db.db import async_session_factory
from app.db.models.org_integration import OrgIntegration
from app.events.base import DomainEvent
from app.events.dispatcher import subscribe
from app.services.entitlements import plan_for_org
from app.services.integrations.registry import get_integration, integrations_for_event

logger = logging.getLogger(__name__)


async def _deliver_with_session(event: DomainEvent, session: AsyncSession) -> None:
    """Fan one event out to the org's enabled, entitled integrations.

    Split from `deliver_event` so the logic can be tested against a mock session.
    """
    providers = integrations_for_event(event.event_type)
    if not providers:
        return
    subscribed = {p.provider for p in providers}

    result = await session.exec(
        select(OrgIntegration)
        .where(OrgIntegration.org_id == event.org_id)
        .where(OrgIntegration.enabled.is_(True))
        .where(OrgIntegration.provider.in_(subscribed))
    )
    rows = list(result.all())
    if not rows:
        return

    # One plan lookup per event, reused across the org's integrations.
    plan = await plan_for_org(session, event.org_id)

    for row in rows:
        integration = get_integration(row.provider)
        if not plan_allows(plan, integration.min_plan):
            # Not entitled (e.g. the owner downgraded). Leave the config in place
            # and simply don't fire - re-upgrading resumes delivery.
            continue
        try:
            config = integration.config_model.model_validate(row.config)
            await integration.handle_event(event, config)
        except Exception:
            # A misbehaving integration must never break delivery for the others,
            # and we're detached from the request - log and carry on.
            logger.exception(
                "Integration %s failed for org %s on %s",
                row.provider,
                event.org_id,
                event.event_type,
            )


async def deliver_event(event: DomainEvent) -> None:
    """Bus subscriber: deliver one event to its org's integrations.

    Runs as a BackgroundTask after the response, so it owns its own DB session
    (the request's is long gone) and never lets an error escape into the loop.
    """
    async with async_session_factory() as session:
        await _deliver_with_session(event, session)


# Wire the fan-out into the event bus at import time. The integrations package
# __init__ imports this module, so importing the package is enough to subscribe.
subscribe(deliver_event)
