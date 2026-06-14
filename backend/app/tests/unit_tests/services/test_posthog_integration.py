import pytest
from pydantic import ValidationError

from app.core.entitlements import PlanTier
from app.db.models.org_integration import IntegrationProvider
from app.services.integrations.posthog import DEFAULT_HOST, PostHogConfig
from app.services.integrations.registry import get_integration


def test_config_requires_phc_prefix():
    with pytest.raises(ValidationError):
        PostHogConfig(project_api_key="not-a-posthog-key")


def test_config_defaults_host_to_us_cloud():
    assert PostHogConfig(project_api_key="phc_abc").host == DEFAULT_HOST


def test_config_key_is_not_masked():
    # The PostHog project key is public-by-design and must round-trip through the
    # API unmasked so the tenant site can initialise analytics.
    config = PostHogConfig(project_api_key="phc_abc", host="https://x")
    assert config.masked()["project_api_key"] == "phc_abc"


def test_posthog_self_registers_as_pro_and_client_side_only():
    integration = get_integration(IntegrationProvider.POSTHOG)
    assert integration.min_plan == PlanTier.PRO
    # Client-side only: it subscribes to no server-side events.
    assert integration.subscribed_event_types == frozenset()
