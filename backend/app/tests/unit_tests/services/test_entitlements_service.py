import asyncio
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

from app.core.entitlements import PlanTier
from app.services.entitlements import plan_for_org


def _session_with_first(value):
    session = AsyncMock()
    result = MagicMock()
    result.first.return_value = value
    session.exec = AsyncMock(return_value=result)
    return session


def test_plan_for_org_returns_owner_plan():
    session = _session_with_first(PlanTier.PRO)
    assert asyncio.run(plan_for_org(session, uuid4())) == PlanTier.PRO


def test_plan_for_org_defaults_to_free_when_no_owner():
    # An org with no owner row must not inherit paid features.
    session = _session_with_first(None)
    assert asyncio.run(plan_for_org(session, uuid4())) == PlanTier.FREE
