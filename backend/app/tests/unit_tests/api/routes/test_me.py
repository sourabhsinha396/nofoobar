import pytest

HOSTS = ["localhost", "acme.algoholic.app"]


@pytest.mark.parametrize("host", HOSTS)
def test_me_returns_user_when_authenticated(client, authed_user, host):
    response = client.get("/api/v1/me", headers={"Host": host})
    assert response.status_code == 200
    body = response.json()
    assert body["email"] == authed_user.email
    assert body["name"] == authed_user.name
    assert body["id"] == str(authed_user.id)
    assert "password_hash" not in body


@pytest.mark.parametrize("host", HOSTS)
def test_me_returns_401_when_unauthenticated(client, mock_session, host):
    response = client.get("/api/v1/me", headers={"Host": host})
    assert response.status_code == 401
