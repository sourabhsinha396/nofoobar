import pytest

from app.db.models.user import User
from app.main import app

HOSTS = ["localhost", "acme.nofoobar.app"]


@pytest.mark.parametrize("host", HOSTS)
def test_me_returns_user_when_authenticated(client, authed_user, host):
    response = client.get("/api/v1/me", headers={"Host": host})
    assert response.status_code == 200
    body = response.json()
    assert body["email"] == authed_user.email
    assert body["name"] == authed_user.name
    assert body["id"] == str(authed_user.id)
    assert body["is_superuser"] == authed_user.is_superuser
    assert "password_hash" not in body


def test_me_exposes_superuser_flag(client, fake_user):
    from app.api.deps import get_current_user, get_current_user_optional

    fake_user.is_superuser = True

    async def _override() -> User:
        return fake_user

    app.dependency_overrides[get_current_user] = _override
    app.dependency_overrides[get_current_user_optional] = _override

    response = client.get("/api/v1/me", headers={"Host": "localhost"})
    assert response.status_code == 200
    assert response.json()["is_superuser"] is True


@pytest.mark.parametrize("host", HOSTS)
def test_me_returns_401_when_unauthenticated(client, mock_session, host):
    response = client.get("/api/v1/me", headers={"Host": host})
    assert response.status_code == 401
