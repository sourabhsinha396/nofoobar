from pydantic import field_validator

from app.core.entitlements import PlanTier
from app.db.models.org_integration import IntegrationProvider
from app.events.base import DomainEvent
from app.services.integrations.base import IntegrationConfig
from app.services.integrations.registry import register

DEFAULT_HOST = "https://us.i.posthog.com"


class PostHogConfig(IntegrationConfig):
    """PostHog project config for client-side analytics.

    The project API key (phc_...) is public by design - it ships in the tenant
    site's browser JS - so it is NOT a SecretStr; the public /tenant payload
    returns it for the frontend to initialise PostHog. `host` lets EU/self-hosted
    tenants point at their own instance.
    """

    project_api_key: str
    host: str = DEFAULT_HOST

    @field_validator("project_api_key")
    @classmethod
    def _looks_like_a_project_key(cls, value: str) -> str:
        if not value.startswith("phc_"):
            raise ValueError("PostHog project API key should start with 'phc_'")
        return value


class PostHogIntegration:
    """Client-side analytics integration. The tenant's public site loads the
    PostHog browser SDK with this config (owners/instructors are excluded there).

    It consumes no server-side domain events, so it subscribes to none and is
    never dispatched - it exists for config storage, the admin UI, and plan
    gating. `handle_event` is therefore a no-op.
    """

    provider = IntegrationProvider.POSTHOG
    min_plan = PlanTier.PRO
    config_model = PostHogConfig
    subscribed_event_types: frozenset[str] = frozenset()

    async def handle_event(self, event: DomainEvent, config: PostHogConfig) -> None:
        return None


register(PostHogIntegration())
