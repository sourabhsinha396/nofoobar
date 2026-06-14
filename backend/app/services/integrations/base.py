from typing import Any, ClassVar, Protocol

from pydantic import BaseModel, SecretStr

from app.core.entitlements import PlanTier
from app.db.models.org_integration import IntegrationProvider
from app.events.base import DomainEvent

# IntegrationProvider is defined on the model (it backs a DB column) and
# re-exported here so service/dispatch code imports it from the service layer,
# mirroring how PaymentProvider is re-exported via services/payments/base.py.
__all__ = [
    "Integration",
    "IntegrationConfig",
    "IntegrationProvider",
]


class IntegrationConfig(BaseModel):
    """Base for a provider's validated, tenant-supplied configuration.

    Each provider subclasses this to declare its fields (a webhook URL, an API
    key, a channel id, ...). Secret fields should use pydantic `SecretStr` so
    they mask in API responses; the persisted blob is encrypted at rest.
    """

    def to_storage(self) -> dict[str, Any]:
        """JSON-safe dict carrying real secret values, for encryption at rest.

        `model_dump(mode="json")` masks SecretStr, so we re-inject the true
        secret values afterward. The whole dict is then encrypted, so the
        plaintext secret never sits unencrypted anywhere.
        """
        data = self.model_dump(mode="json")
        for name in type(self).model_fields:
            value = getattr(self, name)
            if isinstance(value, SecretStr):
                data[name] = value.get_secret_value()
        return data

    def masked(self) -> dict[str, Any]:
        """JSON-safe dict with secret fields masked - safe to return via the API."""
        return self.model_dump(mode="json")


class Integration(Protocol):
    """Provider-agnostic interface for an outbound, event-driven integration.

    Implementations live in app/services/integrations/<provider>.py, register a
    singleton via app/services/integrations/registry.py, and are resolved only
    through that registry - dispatch code never imports a provider directly.

    Unlike PaymentGateway/VideoProvider (one synchronous provider per
    capability), many integrations can be active for one org at once, and they
    are driven by domain events rather than called inline by a route.
    """

    # Which provider this is, and the minimum plan a tenant needs to use it.
    provider: ClassVar[IntegrationProvider]
    min_plan: ClassVar[PlanTier]

    # Pydantic model that validates this provider's stored config. The admin UI
    # renders its form from this schema, so no provider needs a bespoke form.
    config_model: ClassVar[type[IntegrationConfig]]

    # The `event_type`s this provider wants. Dispatch routes an event only to
    # providers whose set contains it.
    subscribed_event_types: ClassVar[frozenset[str]]

    async def handle_event(self, event: DomainEvent, config: IntegrationConfig) -> None:
        """Deliver one subscribed event to the provider using a tenant's config.

        Runs detached from the request (after the response), so it must own any
        I/O it needs - including bounding every external call with a timeout, so
        a slow endpoint can't stall delivery. It may raise on failure; dispatch
        isolates each provider and logs, so one provider's error never affects
        another. `config` is already validated against `config_model`.
        """
        ...
