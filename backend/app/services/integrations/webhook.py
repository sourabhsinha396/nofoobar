import hashlib
import hmac
import json

import httpx
from pydantic import HttpUrl, SecretStr

from app.core.config import settings
from app.core.entitlements import PlanTier
from app.db.models.org_integration import IntegrationProvider
from app.events.base import DomainEvent
from app.services.integrations.base import IntegrationConfig
from app.services.integrations.registry import register

# Event types a webhook can carry. As new events are emitted, add them here (or,
# later, let each endpoint pick its events via config). A webhook only receives
# the events in this set.
_WEBHOOK_EVENT_TYPES = frozenset({"enrollment.created"})

EVENT_HEADER = "X-Nofoobar-Event"
SIGNATURE_HEADER = "X-Nofoobar-Signature"


class WebhookConfig(IntegrationConfig):
    """A single outbound webhook endpoint. The tenant supplies a URL and a
    signing secret; we HMAC-sign each delivery so the receiver can verify it
    came from us. `signing_secret` is a SecretStr so it masks in API responses."""

    url: HttpUrl
    signing_secret: SecretStr


def build_body(event: DomainEvent) -> bytes:
    """Serialise an event to the exact bytes that get signed and sent. JSON,
    UTF-8, compact - the signature is over these bytes verbatim."""
    payload = {"event": event.event_type, "data": event.model_dump(mode="json")}
    return json.dumps(payload, separators=(",", ":")).encode("utf-8")


def sign(secret: str, body: bytes) -> str:
    """GitHub-style HMAC-SHA256 signature over the raw body, hex-encoded."""
    digest = hmac.new(secret.encode("utf-8"), body, hashlib.sha256).hexdigest()
    return f"sha256={digest}"


class WebhookIntegration:
    """Posts a signed JSON payload to a tenant-configured URL. The one free-tier
    integration; everything else is pro/enterprise."""

    provider = IntegrationProvider.WEBHOOK
    min_plan = PlanTier.FREE
    config_model = WebhookConfig
    subscribed_event_types = _WEBHOOK_EVENT_TYPES

    async def handle_event(self, event: DomainEvent, config: WebhookConfig) -> None:
        body = build_body(event)
        signature = sign(config.signing_secret.get_secret_value(), body)
        headers = {
            "Content-Type": "application/json",
            EVENT_HEADER: event.event_type,
            SIGNATURE_HEADER: signature,
        }
        # The timeout is the whole point: a slow/hung endpoint raises rather than
        # holding the delivery task open. httpx applies it to connect/read/write.
        async with httpx.AsyncClient(timeout=settings.WEBHOOK_TIMEOUT_SECONDS) as client:
            response = await client.post(str(config.url), content=body, headers=headers)
        # Non-2xx is a delivery failure; let it raise - dispatch logs and isolates.
        response.raise_for_status()


register(WebhookIntegration())
