import httpx
import pytest

from app.core.config import settings
from app.services import recaptcha

HOSTS = ["localhost", "acme.nofoobar.app"]


@pytest.mark.parametrize("host", HOSTS)
def test_signup_creates_user_regardless_of_host(client, mock_session, host):
    mock_session.exec.return_value.first.return_value = None  # email is unique
    response = client.post(
        "/api/v1/auth/signup",
        json={"email": "u@example.com", "password": "secret123", "name": "Test User"},
        headers={"Host": host},
    )
    assert response.status_code == 201
    body = response.json()
    assert body["email"] == "u@example.com"
    assert body["name"] == "Test User"
    assert "password" not in body
    assert "password_hash" not in body


@pytest.mark.parametrize("host", HOSTS)
def test_signup_rejects_duplicate_email(client, mock_session, fake_user, host):
    mock_session.exec.return_value.first.return_value = fake_user
    response = client.post(
        "/api/v1/auth/signup",
        json={"email": fake_user.email, "password": "secret123", "name": "Test"},
        headers={"Host": host},
    )
    assert response.status_code == 409


@pytest.mark.parametrize("host", HOSTS)
def test_login_succeeds_with_correct_password(client, mock_session, user_with_known_password, host):
    user, plain = user_with_known_password
    mock_session.exec.return_value.first.return_value = user
    response = client.post(
        "/api/v1/auth/login",
        json={"email": user.email, "password": plain},
        headers={"Host": host},
    )
    assert response.status_code == 200
    assert response.json()["email"] == user.email


@pytest.mark.parametrize("host", HOSTS)
def test_login_rejects_wrong_password(client, mock_session, user_with_known_password, host):
    user, _ = user_with_known_password
    mock_session.exec.return_value.first.return_value = user
    response = client.post(
        "/api/v1/auth/login",
        json={"email": user.email, "password": "wrong"},
        headers={"Host": host},
    )
    assert response.status_code == 401


@pytest.mark.parametrize("host", HOSTS)
def test_login_rejects_unknown_email(client, mock_session, host):
    mock_session.exec.return_value.first.return_value = None
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "nobody@example.com", "password": "whatever"},
        headers={"Host": host},
    )
    assert response.status_code == 401


@pytest.mark.parametrize("host", HOSTS)
def test_logout_returns_204(client, host):
    response = client.post("/api/v1/auth/logout", headers={"Host": host})
    assert response.status_code == 204


class _FakeResponse:
    def __init__(self, payload):
        self._payload = payload

    def raise_for_status(self):
        pass

    def json(self):
        return self._payload


class _FakeAsyncClient:
    """Stands in for httpx.AsyncClient; class attrs control the outcome."""

    payload: dict = {"success": True}
    error: Exception | None = None

    def __init__(self, *args, **kwargs):
        pass

    async def __aenter__(self):
        return self

    async def __aexit__(self, *exc):
        return False

    async def post(self, *args, **kwargs):
        if self.error is not None:
            raise self.error
        return _FakeResponse(self.payload)


@pytest.fixture
def recaptcha_enabled(monkeypatch):
    monkeypatch.setattr(settings, "RECAPTCHA_SECRET_KEY", "test-secret")
    monkeypatch.setattr(recaptcha.httpx, "AsyncClient", _FakeAsyncClient)
    monkeypatch.setattr(_FakeAsyncClient, "payload", {"success": True})
    monkeypatch.setattr(_FakeAsyncClient, "error", None)
    return _FakeAsyncClient


def test_signup_rejects_missing_recaptcha_token(client, mock_session, recaptcha_enabled):
    response = client.post(
        "/api/v1/auth/signup",
        json={"email": "u@example.com", "password": "secret123", "name": "Test"},
    )
    assert response.status_code == 400


def test_signup_rejects_failed_recaptcha(client, mock_session, recaptcha_enabled):
    recaptcha_enabled.payload = {"success": False}
    response = client.post(
        "/api/v1/auth/signup",
        json={
            "email": "u@example.com",
            "password": "secret123",
            "name": "Test",
            "recaptcha_token": "bad-token",
        },
    )
    assert response.status_code == 400


def test_signup_passes_with_valid_recaptcha(client, mock_session, recaptcha_enabled):
    mock_session.exec.return_value.first.return_value = None
    response = client.post(
        "/api/v1/auth/signup",
        json={
            "email": "u@example.com",
            "password": "secret123",
            "name": "Test",
            "recaptcha_token": "good-token",
        },
    )
    assert response.status_code == 201


def test_login_rejects_failed_recaptcha(client, mock_session, user_with_known_password, recaptcha_enabled):
    recaptcha_enabled.payload = {"success": False}
    user, plain = user_with_known_password
    mock_session.exec.return_value.first.return_value = user
    response = client.post(
        "/api/v1/auth/login",
        json={"email": user.email, "password": plain, "recaptcha_token": "bad-token"},
    )
    assert response.status_code == 400


def test_recaptcha_fails_open_when_google_unreachable(client, mock_session, user_with_known_password, recaptcha_enabled):
    recaptcha_enabled.error = httpx.ConnectError("boom")
    user, plain = user_with_known_password
    mock_session.exec.return_value.first.return_value = user
    response = client.post(
        "/api/v1/auth/login",
        json={"email": user.email, "password": plain, "recaptcha_token": "any"},
    )
    assert response.status_code == 200
