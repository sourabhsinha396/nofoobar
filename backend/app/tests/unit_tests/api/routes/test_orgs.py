import pytest

from app.db.models.organization import Organization
from app.tests.factories.organization import OrganizationFactory

HOSTS = ["localhost", "acme.algoholic.app"]


@pytest.mark.parametrize("host", HOSTS)
def test_create_org_succeeds_when_slug_available(client, mock_session, authed_user, host):
    mock_session.exec.return_value.first.return_value = None
    response = client.post(
        "/api/v1/orgs",
        json={"slug": "acme", "name": "Acme Inc"},
        headers={"Host": host},
    )
    assert response.status_code == 201
    body = response.json()
    assert body["slug"] == "acme"
    assert body["name"] == "Acme Inc"
    assert "id" in body


@pytest.mark.parametrize("host", HOSTS)
def test_create_org_persists_owner_membership(client, mock_session, authed_user, host):
    mock_session.exec.return_value.first.return_value = None
    client.post(
        "/api/v1/orgs",
        json={"slug": "acme", "name": "Acme Inc"},
        headers={"Host": host},
    )
    # session.add is called twice: once for Organization, once for UserOrgMembership(owner)
    assert mock_session.add.call_count == 2
    added_membership = mock_session.add.call_args_list[1].args[0]
    assert added_membership.user_id == authed_user.id
    assert added_membership.role.value == "owner"


@pytest.mark.parametrize("host", HOSTS)
def test_create_org_rejects_duplicate_slug(client, mock_session, authed_user, host):
    existing: Organization = OrganizationFactory.build(slug="acme")
    mock_session.exec.return_value.first.return_value = existing
    response = client.post(
        "/api/v1/orgs",
        json={"slug": "acme", "name": "Acme Inc"},
        headers={"Host": host},
    )
    assert response.status_code == 409


def test_create_org_requires_authentication(client, mock_session):
    response = client.post(
        "/api/v1/orgs",
        json={"slug": "acme", "name": "Acme Inc"},
        headers={"Host": "localhost"},
    )
    assert response.status_code == 401


@pytest.mark.parametrize("bad_slug", ["", "ACME", "1acme", "-acme", "acme!", "a" * 64])
def test_create_org_rejects_invalid_slug(client, mock_session, authed_user, bad_slug):
    response = client.post(
        "/api/v1/orgs",
        json={"slug": bad_slug, "name": "Acme Inc"},
        headers={"Host": "localhost"},
    )
    assert response.status_code == 422
