import pytest

from app.db.models.membership import Role
from app.db.models.organization import Organization
from app.tests.factories.organization import OrganizationFactory

HOSTS = ["localhost", "acme.nofoobar.app"]


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


# ---------- PATCH /orgs/{slug} ----------


def _patch_path(slug: str = "acme") -> str:
    return f"/api/v1/orgs/{slug}"


def test_patch_org_owner_can_edit_brand_fields(client, mock_session, fake_membership):
    fake_membership.role = Role.OWNER
    org = OrganizationFactory.build(id=fake_membership.org_id, slug="acme", name="Old name")
    mock_session.exec.return_value.first.return_value = org
    response = client.patch(
        _patch_path(),
        json={
            "name": "Acme Academy",
            "tagline": "Learn FastAPI",
            "footer_text": "© 2026 Acme",
            "contact_email": "hello@acme.test",
            "social_links": [{"platform": "github", "url": "https://github.com/acme"}],
        },
        headers={"Host": "localhost"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["name"] == "Acme Academy"
    assert body["tagline"] == "Learn FastAPI"
    assert body["contact_email"] == "hello@acme.test"
    assert body["social_links"] == [
        {"platform": "github", "url": "https://github.com/acme"}
    ]


def test_patch_org_rejects_instructor(client, mock_session, fake_membership):
    fake_membership.role = Role.INSTRUCTOR
    response = client.patch(
        _patch_path(),
        json={"tagline": "x"},
        headers={"Host": "localhost"},
    )
    assert response.status_code == 403


def test_patch_org_rejects_student(client, mock_session, fake_membership):
    fake_membership.role = Role.STUDENT
    response = client.patch(
        _patch_path(),
        json={"tagline": "x"},
        headers={"Host": "localhost"},
    )
    assert response.status_code == 403


def test_patch_org_requires_authentication(client, mock_session):
    response = client.patch(
        _patch_path(),
        json={"tagline": "x"},
        headers={"Host": "localhost"},
    )
    assert response.status_code == 401


def test_patch_org_404_when_slug_doesnt_match_membership_org(client, mock_session, fake_membership):
    fake_membership.role = Role.OWNER
    mock_session.exec.return_value.first.return_value = None
    response = client.patch(
        _patch_path("not-mine"),
        json={"tagline": "x"},
        headers={"Host": "localhost"},
    )
    assert response.status_code == 404


def test_patch_org_supports_partial_update(client, mock_session, fake_membership):
    # Sending only `tagline` should NOT clear the other fields. We test this
    # by asserting setattr was only called for `tagline`.
    fake_membership.role = Role.OWNER
    org = OrganizationFactory.build(
        id=fake_membership.org_id, slug="acme", name="Existing", description="Existing desc"
    )
    mock_session.exec.return_value.first.return_value = org
    response = client.patch(
        _patch_path(),
        json={"tagline": "Just a tagline"},
        headers={"Host": "localhost"},
    )
    assert response.status_code == 200
    # description should remain whatever it was on the loaded row.
    assert org.tagline == "Just a tagline"
    assert org.description == "Existing desc"


def test_patch_org_can_explicitly_null_a_field(client, mock_session, fake_membership):
    # Sending `"logo_url": null` should clear the logo.
    fake_membership.role = Role.OWNER
    org = OrganizationFactory.build(
        id=fake_membership.org_id, slug="acme", logo_url="https://old.example.com/logo.png"
    )
    mock_session.exec.return_value.first.return_value = org
    response = client.patch(
        _patch_path(),
        json={"logo_url": None},
        headers={"Host": "localhost"},
    )
    assert response.status_code == 200
    assert org.logo_url is None


def test_patch_org_rejects_bad_email(client, mock_session, fake_membership):
    fake_membership.role = Role.OWNER
    response = client.patch(
        _patch_path(),
        json={"contact_email": "not-an-email"},
        headers={"Host": "localhost"},
    )
    assert response.status_code == 422


def test_patch_org_rejects_unknown_social_platform(client, mock_session, fake_membership):
    fake_membership.role = Role.OWNER
    response = client.patch(
        _patch_path(),
        json={"social_links": [{"platform": "myspace", "url": "https://example.com"}]},
        headers={"Host": "localhost"},
    )
    assert response.status_code == 422


def test_patch_org_caps_social_link_count(client, mock_session, fake_membership):
    fake_membership.role = Role.OWNER
    too_many = [{"platform": "website", "url": f"https://e{i}.test"} for i in range(17)]
    response = client.patch(
        _patch_path(),
        json={"social_links": too_many},
        headers={"Host": "localhost"},
    )
    assert response.status_code == 422
