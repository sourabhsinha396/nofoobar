import asyncio
import hashlib
import hmac
import json
from uuid import uuid4

import httpx
import pytest

from app.core.config import settings
from app.core.entitlements import PlanTier
from app.db.models.org_integration import IntegrationProvider
from app.events.types import EnrollmentCreated
from app.services.integrations.registry import get_integration
from app.services.integrations.webhook import WebhookConfig, WebhookIntegration, build_body, sign


def _event() -> EnrollmentCreated:
    return EnrollmentCreated(
        org_id=uuid4(),
        enrollment_id=uuid4(),
        course_id=uuid4(),
        course_slug="intro",
        user_id=uuid4(),
        user_email="learner@example.com",
    )


def _config(url: str = "https://hooks.example.com/x", secret: str = "shh") -> WebhookConfig:
    return WebhookConfig(url=url, signing_secret=secret)


def _mock_client(monkeypatch, handler, captured: dict | None = None):
    """Point webhook's httpx.AsyncClient at a MockTransport. Captures the timeout
    kwarg so tests can assert delivery is bounded. Captures the real AsyncClient
    first - webhook.httpx is the httpx module itself, so patching it globally
    would otherwise recurse."""
    real_async_client = httpx.AsyncClient

    def factory(**kwargs):
        if captured is not None:
            captured["timeout"] = kwargs.get("timeout")
        return real_async_client(transport=httpx.MockTransport(handler))

    monkeypatch.setattr(httpx, "AsyncClient", factory)


# --- pure helpers -----------------------------------------------------------


def test_build_body_wraps_event_type_and_json_safe_data():
    event = _event()
    parsed = json.loads(build_body(event))
    assert parsed["event"] == "enrollment.created"
    assert parsed["data"]["course_slug"] == "intro"
    # UUIDs are serialised as strings (mode="json"), so the body is valid JSON.
    assert parsed["data"]["org_id"] == str(event.org_id)


def test_sign_matches_hmac_sha256():
    body = b'{"hello":"world"}'
    expected = "sha256=" + hmac.new(b"secret", body, hashlib.sha256).hexdigest()
    assert sign("secret", body) == expected


def test_signing_secret_is_masked_in_config_dump():
    config = _config(secret="topsecret")
    assert "topsecret" not in str(config.model_dump())
    assert config.signing_secret.get_secret_value() == "topsecret"


# --- handle_event -----------------------------------------------------------


def test_handle_event_posts_signed_payload_with_timeout(monkeypatch):
    captured: dict = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured["url"] = str(request.url)
        captured["body"] = request.content
        captured["event_header"] = request.headers.get("x-nofoobar-event")
        captured["signature"] = request.headers.get("x-nofoobar-signature")
        return httpx.Response(200)

    _mock_client(monkeypatch, handler, captured)

    asyncio.run(WebhookIntegration().handle_event(_event(), _config(secret="shh")))

    assert captured["url"] == "https://hooks.example.com/x"
    assert captured["event_header"] == "enrollment.created"
    # Signature is over the exact bytes that were sent.
    assert captured["signature"] == sign("shh", captured["body"])
    # Delivery is bounded by the configured timeout.
    assert captured["timeout"] == settings.WEBHOOK_TIMEOUT_SECONDS


def test_handle_event_raises_on_non_2xx(monkeypatch):
    _mock_client(monkeypatch, lambda request: httpx.Response(500))
    with pytest.raises(httpx.HTTPStatusError):
        asyncio.run(WebhookIntegration().handle_event(_event(), _config()))


def test_handle_event_propagates_timeout(monkeypatch):
    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.TimeoutException("too slow")

    _mock_client(monkeypatch, handler)
    with pytest.raises(httpx.TimeoutException):
        asyncio.run(WebhookIntegration().handle_event(_event(), _config()))


def test_webhook_self_registers_as_free_tier():
    integration = get_integration(IntegrationProvider.WEBHOOK)
    assert integration.min_plan == PlanTier.FREE
    assert "enrollment.created" in integration.subscribed_event_types
