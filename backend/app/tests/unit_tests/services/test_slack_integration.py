import asyncio
import json
from uuid import uuid4

import httpx
import pytest
from pydantic import ValidationError

from app.core.config import settings
from app.core.entitlements import PlanTier
from app.db.models.org_integration import IntegrationProvider
from app.events.types import EnrollmentCreated
from app.services.integrations.registry import get_integration
from app.services.integrations.slack import SlackConfig, SlackIntegration, render_message

VALID_URL = "https://hooks.slack.com/services/T000/B000/xxxxxxxx"


def _event() -> EnrollmentCreated:
    return EnrollmentCreated(
        org_id=uuid4(),
        enrollment_id=uuid4(),
        course_id=uuid4(),
        course_slug="intro",
        user_id=uuid4(),
        user_email="learner@example.com",
    )


def _mock_client(monkeypatch, handler, captured: dict | None = None):
    real_async_client = httpx.AsyncClient

    def factory(**kwargs):
        if captured is not None:
            captured["timeout"] = kwargs.get("timeout")
        return real_async_client(transport=httpx.MockTransport(handler))

    monkeypatch.setattr(httpx, "AsyncClient", factory)


# --- config -----------------------------------------------------------------


def test_config_rejects_non_slack_url():
    with pytest.raises(ValidationError):
        SlackConfig(webhook_url="https://evil.example.com/hook")


def test_config_accepts_slack_url_and_masks_it():
    config = SlackConfig(webhook_url=VALID_URL)
    assert config.webhook_url.get_secret_value() == VALID_URL
    assert VALID_URL not in str(config.model_dump())


def test_render_message_for_enrollment_has_no_em_dash():
    text = render_message(_event())
    assert "learner@example.com" in text
    assert "intro" in text
    assert "—" not in text


# --- handle_event -----------------------------------------------------------


def test_handle_event_posts_text_to_webhook_with_timeout(monkeypatch):
    captured: dict = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured["url"] = str(request.url)
        captured["payload"] = json.loads(request.content)
        return httpx.Response(200)

    _mock_client(monkeypatch, handler, captured)

    asyncio.run(SlackIntegration().handle_event(_event(), SlackConfig(webhook_url=VALID_URL)))

    assert captured["url"] == VALID_URL
    assert "intro" in captured["payload"]["text"]
    assert captured["timeout"] == settings.WEBHOOK_TIMEOUT_SECONDS


def test_handle_event_raises_on_non_2xx(monkeypatch):
    _mock_client(monkeypatch, lambda request: httpx.Response(500))
    with pytest.raises(httpx.HTTPStatusError):
        asyncio.run(SlackIntegration().handle_event(_event(), SlackConfig(webhook_url=VALID_URL)))


def test_slack_self_registers_as_pro_tier():
    integration = get_integration(IntegrationProvider.SLACK)
    assert integration.min_plan == PlanTier.PRO
