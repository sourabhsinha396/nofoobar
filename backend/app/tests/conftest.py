from unittest.mock import AsyncMock

import pytest
from fastapi.testclient import TestClient

from app.api.deps import get_current_org, get_session
from app.db.models.organization import Organization
from app.main import app
from app.tests.factories.organization import OrganizationFactory


@pytest.fixture(autouse=True)
def _clear_overrides():
    yield
    app.dependency_overrides.clear()


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture
def mock_session():
    session = AsyncMock()

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
