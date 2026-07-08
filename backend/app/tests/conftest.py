from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi.testclient import TestClient

from app.api.deps import (
    get_current_membership,
    get_current_org,
    get_current_user,
    get_current_user_optional,
    get_session,
)
from app.core.config import settings
from app.core.security import hash_password
from app.db.models.membership import Role, UserOrgMembership
from app.db.models.organization import Organization
from app.db.models.user import User
from app.events.dispatcher import get_dispatcher
from app.main import app
from app.tests.factories.membership import UserOrgMembershipFactory
from app.tests.factories.organization import OrganizationFactory
from app.tests.factories.user import UserFactory


@pytest.fixture(autouse=True)
def _clear_overrides():
    yield
    app.dependency_overrides.clear()


@pytest.fixture(autouse=True)
def _disable_recaptcha(monkeypatch):
    """Keep tests hermetic when the dev .env carries a real reCAPTCHA secret.
    Tests that exercise verification re-enable it explicitly."""
    monkeypatch.setattr(settings, "RECAPTCHA_SECRET_KEY", "")


class _RecordingDispatcher:
    """Captures dispatched events instead of scheduling real background delivery."""

    def __init__(self) -> None:
        self.events: list = []

    def dispatch(self, event) -> None:
        self.events.append(event)


@pytest.fixture(autouse=True)
def stub_dispatcher():
    """Override the event dispatcher for every test so route emits are recorded,
    not delivered - otherwise a BackgroundTask would open a real DB session.
    Request this fixture to assert on `.events`."""
    dispatcher = _RecordingDispatcher()
    app.dependency_overrides[get_dispatcher] = lambda: dispatcher
    return dispatcher


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture
def mock_session():
    session = AsyncMock()
    session.exec = AsyncMock(return_value=MagicMock())
    session.add = MagicMock()

    async def _override():
        yield session

    app.dependency_overrides[get_session] = _override
    return session


@pytest.fixture
def fake_org() -> Organization:
    org = OrganizationFactory.build()

    async def _override():
        return org

    app.dependency_overrides[get_current_org] = _override
    return org


@pytest.fixture
def fake_user() -> User:
    return UserFactory.build()


@pytest.fixture
def authed_user(fake_user: User) -> User:
    async def _override():
        return fake_user

    app.dependency_overrides[get_current_user] = _override
    app.dependency_overrides[get_current_user_optional] = _override
    return fake_user


@pytest.fixture
def user_with_known_password() -> tuple[User, str]:
    plain = "hunter2"
    user = UserFactory.build(password_hash=hash_password(plain))
    return user, plain


@pytest.fixture
def fake_membership(authed_user: User, fake_org: Organization) -> UserOrgMembership:
    membership = UserOrgMembershipFactory.build(
        user_id=authed_user.id, org_id=fake_org.id, role=Role.OWNER
    )

    async def _override():
        return membership

    app.dependency_overrides[get_current_membership] = _override
    return membership
