import httpx
from pydantic import SecretStr, field_validator

from app.core.config import settings
from app.core.entitlements import PlanTier
from app.db.models.org_integration import IntegrationProvider
from app.events.base import DomainEvent
from app.events.types import EnrollmentCreated
from app.services.integrations.base import IntegrationConfig
from app.services.integrations.registry import register

_SLACK_EVENT_TYPES = frozenset({"enrollment.created"})
_WEBHOOK_URL_PREFIX = "https://hooks.slack.com/"


class SlackConfig(IntegrationConfig):
    """A Slack incoming-webhook endpoint. The URL is itself the credential
    (anyone holding it can post to the channel), so it's a SecretStr - masked in
    API responses and encrypted at rest."""

    webhook_url: SecretStr

    @field_validator("webhook_url")
    @classmethod
    def _must_be_slack_webhook(cls, value: SecretStr) -> SecretStr:
        if not value.get_secret_value().startswith(_WEBHOOK_URL_PREFIX):
            raise ValueError(f"Slack webhook URL must start with {_WEBHOOK_URL_PREFIX}")
        return value


def render_message(event: DomainEvent) -> str:
    """Human-readable Slack text for an event. Plain sentences, no em dashes."""
    if isinstance(event, EnrollmentCreated):
        return f":tada: New enrollment: {event.user_email} enrolled in *{event.course_slug}*."
    return f"nofoobar event: {event.event_type}"


class SlackIntegration:
    """Posts a message to a tenant's Slack channel via an incoming webhook.
    Pro-tier."""

    provider = IntegrationProvider.SLACK
    min_plan = PlanTier.PRO
    config_model = SlackConfig
    subscribed_event_types = _SLACK_EVENT_TYPES

    async def handle_event(self, event: DomainEvent, config: SlackConfig) -> None:
        payload = {"text": render_message(event)}
        # Bounded by the shared outbound timeout so a slow Slack can't stall the
        # delivery task (see settings.WEBHOOK_TIMEOUT_SECONDS).
        async with httpx.AsyncClient(timeout=settings.WEBHOOK_TIMEOUT_SECONDS) as client:
            response = await client.post(config.webhook_url.get_secret_value(), json=payload)
        response.raise_for_status()


register(SlackIntegration())
