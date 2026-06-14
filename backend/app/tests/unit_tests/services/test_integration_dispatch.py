import asyncio
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest

from app.core.entitlements import PlanTier
from app.events.types import EnrollmentCreated
from app.services.integrations import dispatch, registry
from app.services.integrations.base import IntegrationConfig, IntegrationProvider


class _RecordingConfig(IntegrationConfig):
    target: str


class _RecordingProvider:
    provider = IntegrationProvider.WEBHOOK
    min_plan = PlanTier.PRO
    config_model = _RecordingConfig
    subscribed_event_types = frozenset({"enrollment.created"})

    def __init__(self) -> None:
        self.calls: list = []

    async def handle_event(self, event, config) -> None:
        self.calls.append((event, config))


def _event() -> EnrollmentCreated:
    return EnrollmentCreated(
        org_id=uuid4(),
        enrollment_id=uuid4(),
        course_id=uuid4(),
        course_slug="intro",
        user_id=uuid4(),
        user_email="learner@example.com",
    )


def _session_returning(rows):
    session = AsyncMock()
    result = MagicMock()
    result.all.return_value = rows
    session.exec = AsyncMock(return_value=result)
    return session


def _row():
    # _deliver_with_session only reads .provider and .config off a row.
    return SimpleNamespace(
        provider=IntegrationProvider.WEBHOOK,
        config={"target": "https://hooks.example.com/x"},
    )


@pytest.fixture
def clean_registry(monkeypatch):
    monkeypatch.setattr(registry, "_registry", {})


def _stub_plan(monkeypatch, plan: PlanTier):
    async def _fake(session, org_id):
        return plan

    monkeypatch.setattr(dispatch, "plan_for_org", _fake)


def test_delivers_and_validates_config_when_entitled(clean_registry, monkeypatch):
    provider = _RecordingProvider()
    registry.register(provider)
    _stub_plan(monkeypatch, PlanTier.PRO)

    event = _event()
    asyncio.run(dispatch._deliver_with_session(event, _session_returning([_row()])))

    assert len(provider.calls) == 1
    called_event, called_config = provider.calls[0]
    assert called_event is event
    assert isinstance(called_config, _RecordingConfig)
    assert called_config.target == "https://hooks.example.com/x"


def test_skips_delivery_when_plan_below_min(clean_registry, monkeypatch):
    provider = _RecordingProvider()  # requires PRO
    registry.register(provider)
    _stub_plan(monkeypatch, PlanTier.FREE)

    asyncio.run(dispatch._deliver_with_session(_event(), _session_returning([_row()])))

    assert provider.calls == []


def test_no_query_when_no_provider_subscribes(clean_registry):
    # Empty registry -> nothing subscribes -> we must not even hit the DB.
    session = _session_returning([])
    asyncio.run(dispatch._deliver_with_session(_event(), session))
    session.exec.assert_not_called()


def test_provider_error_is_swallowed(clean_registry, monkeypatch):
    class _Boom(_RecordingProvider):
        async def handle_event(self, event, config):
            raise RuntimeError("provider exploded")

    registry.register(_Boom())
    _stub_plan(monkeypatch, PlanTier.PRO)

    # Must not raise - a broken integration cannot break dispatch.
    asyncio.run(dispatch._deliver_with_session(_event(), _session_returning([_row()])))
