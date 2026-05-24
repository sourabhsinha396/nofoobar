import pytest

from app.db.models.membership import Role
from app.tests.factories.membership import UserOrgMembershipFactory
from app.tests.factories.organization import OrganizationFactory

HOSTS = ["localhost", "acme.algoholic.app"]


@pytest.mark.parametrize("host", HOSTS)
def test_me_orgs_returns_empty_when_no_memberships(client, mock_session, authed_user, host):
    mock_session.exec.return_value.all.return_value = []
    response = client.get("/api/v1/me/orgs", headers={"Host": host})
    assert response.status_code == 200
    assert response.json() == []


@pytest.mark.parametrize("host", HOSTS)
def test_me_orgs_returns_memberships_with_role(client, mock_session, authed_user, host):
    org_a = OrganizationFactory.build(slug="acme", name="Acme")
    org_b = OrganizationFactory.build(slug="beta", name="Beta")
    membership_a = UserOrgMembershipFactory.build(user_id=authed_user.id, org_id=org_a.id, role=Role.OWNER)
    membership_b = UserOrgMembershipFactory.build(user_id=authed_user.id, org_id=org_b.id, role=Role.STUDENT)
    membership_a.org = org_a
    membership_b.org = org_b
    mock_session.exec.return_value.all.return_value = [membership_a, membership_b]

    response = client.get("/api/v1/me/orgs", headers={"Host": host})
    assert response.status_code == 200
    body = response.json()
    assert len(body) == 2
    assert {b["role"] for b in body} == {"owner", "student"}
    assert {b["org"]["slug"] for b in body} == {"acme", "beta"}


@pytest.mark.parametrize("host", HOSTS)
def test_me_orgs_returns_401_when_unauthenticated(client, mock_session, host):
    response = client.get("/api/v1/me/orgs", headers={"Host": host})
    assert response.status_code == 401
