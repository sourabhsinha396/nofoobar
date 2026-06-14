from app.services.integrations.base import Integration, IntegrationProvider

# Provider singletons, keyed by provider. Populated at import time: each provider
# module calls register() at the bottom, and app/services/integrations/__init__.py
# imports every provider module so the registry is complete on first use.
#
# This differs from the payments/video registries (hardcoded if-ladders) on
# purpose: integrations are expected to grow past 20, and self-registration
# keeps that growth to "add a module" with no central switch to edit.
_registry: dict[IntegrationProvider, Integration] = {}


def register(integration: Integration) -> Integration:
    """Register a provider singleton. Returns it, so it can wrap a module-level
    instance. Raises if two providers claim the same `provider` value."""
    if integration.provider in _registry:
        raise ValueError(f"Integration {integration.provider} is already registered.")
    _registry[integration.provider] = integration
    return integration


def get_integration(provider: IntegrationProvider) -> Integration:
    """Resolve a single provider. Raises NotImplementedError if not registered."""
    try:
        return _registry[provider]
    except KeyError:
        raise NotImplementedError(f"Integration {provider} is not yet implemented.") from None


def all_integrations() -> list[Integration]:
    """Every registered provider - used to render the admin integrations list."""
    return list(_registry.values())


def integrations_for_event(event_type: str) -> list[Integration]:
    """Providers that subscribe to `event_type`. Dispatch uses this to fan an
    event out to only the providers that asked for it."""
    return [i for i in _registry.values() if event_type in i.subscribed_event_types]
