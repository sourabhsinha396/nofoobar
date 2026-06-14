import pytest

from app.core.entitlements import PlanTier
from app.services.integrations import registry
from app.services.integrations.base import (
    IntegrationConfig,
    IntegrationProvider,
)


class _DummyConfig(IntegrationConfig):
    target: str


class _DummyIntegration:
    provider = IntegrationProvider.WEBHOOK
    min_plan = PlanTier.PRO
    config_model = _DummyConfig
    subscribed_event_types = frozenset({"enrollment.created"})

    async def handle_event(self, event, config):  # pragma: no cover - not run here
        ...


@pytest.fixture
def clean_registry(monkeypatch):
    """Isolate the module-global registry so tests don't leak into each other."""
    fresh: dict = {}
    monkeypatch.setattr(registry, "_registry", fresh)
    return fresh


def test_register_and_get(clean_registry):
    provider = _DummyIntegration()
    returned = registry.register(provider)

    assert returned is provider
    assert registry.get_integration(IntegrationProvider.WEBHOOK) is provider


def test_register_rejects_duplicate_provider(clean_registry):
    registry.register(_DummyIntegration())
    with pytest.raises(ValueError, match="already registered"):
        registry.register(_DummyIntegration())


def test_get_unknown_provider_raises_not_implemented(clean_registry):
    with pytest.raises(NotImplementedError):
        registry.get_integration(IntegrationProvider.WEBHOOK)


def test_all_integrations_lists_registered(clean_registry):
    provider = _DummyIntegration()
    registry.register(provider)
    assert registry.all_integrations() == [provider]


def test_integrations_for_event_filters_by_subscription(clean_registry):
    provider = _DummyIntegration()
    registry.register(provider)

    assert registry.integrations_for_event("enrollment.created") == [provider]
    assert registry.integrations_for_event("payment.succeeded") == []
