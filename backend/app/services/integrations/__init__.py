# Imported for their import-time side effects. `dispatch` subscribes the
# event-bus fan-out; each provider module (webhook, ...) self-registers into the
# registry. They pull in the registry submodule directly, so import order here
# doesn't matter - importing this package wires everything.
from app.services.integrations import dispatch, posthog, slack, webhook  # noqa: F401
from app.services.integrations.base import (
    Integration,
    IntegrationConfig,
    IntegrationProvider,
)
from app.services.integrations.registry import (
    all_integrations,
    get_integration,
    integrations_for_event,
    register,
)

__all__ = [
    "Integration",
    "IntegrationConfig",
    "IntegrationProvider",
    "all_integrations",
    "get_integration",
    "integrations_for_event",
    "register",
]
