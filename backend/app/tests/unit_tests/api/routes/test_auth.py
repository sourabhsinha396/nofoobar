import pytest

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
