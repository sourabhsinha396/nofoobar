from app.db.models.membership import Role
from app.tests.factories.lesson import tiptap_doc
from app.tests.factories.page import PageFactory

PATH = "/api/v1/admin/pages"


def _payload(slug: str = "privacy-policy", **overrides) -> dict:
    base = {
        "slug": slug,
        "title": "Privacy",
        "body": tiptap_doc("body"),
        "kind": "privacy",
    }
    base.update(overrides)
    return base


# ---------- list ----------


def test_list_pages_returns_summary_shape(client, mock_session, fake_membership):
    page = PageFactory.build(org_id=fake_membership.org_id)
    mock_session.exec.return_value.all.return_value = [page]
    response = client.get(PATH, headers={"Host": "localhost"})
    assert response.status_code == 200
    body = response.json()
    assert len(body) == 1
    # Summary doesn't include the body blob.
    assert "body" not in body[0]
    assert set(body[0].keys()) == {
        "id", "slug", "title", "kind", "is_published", "show_in_footer", "footer_position",
    }


def test_list_pages_requires_authentication(client, mock_session):
    response = client.get(PATH, headers={"Host": "localhost"})
    assert response.status_code == 401


# ---------- create ----------


def test_create_page_succeeds_for_owner(client, mock_session, fake_membership):
    fake_membership.role = Role.OWNER
    mock_session.exec.return_value.first.return_value = None  # no slug collision
    response = client.post(PATH, json=_payload(), headers={"Host": "localhost"})
    assert response.status_code == 201
    body = response.json()
    assert body["slug"] == "privacy-policy"
    assert body["kind"] == "privacy"


def test_create_page_rejects_instructor(client, mock_session, fake_membership):
    fake_membership.role = Role.INSTRUCTOR
    mock_session.exec.return_value.first.return_value = None
    response = client.post(PATH, json=_payload(), headers={"Host": "localhost"})
    assert response.status_code == 403


def test_create_page_rejects_reserved_slug(client, mock_session, fake_membership):
    fake_membership.role = Role.OWNER
    response = client.post(
        PATH, json=_payload(slug="courses"), headers={"Host": "localhost"}
    )
    assert response.status_code == 422


def test_create_page_rejects_duplicate_slug(client, mock_session, fake_membership):
    fake_membership.role = Role.OWNER
    existing = PageFactory.build(slug="privacy-policy", org_id=fake_membership.org_id)
    mock_session.exec.return_value.first.return_value = existing
    response = client.post(PATH, json=_payload(), headers={"Host": "localhost"})
    assert response.status_code == 409


def test_create_page_scopes_org_id_from_membership(client, mock_session, fake_membership):
    fake_membership.role = Role.OWNER
    mock_session.exec.return_value.first.return_value = None
    client.post(PATH, json=_payload(), headers={"Host": "localhost"})
    added = mock_session.add.call_args.args[0]
    assert added.org_id == fake_membership.org_id


# ---------- get one ----------


def test_get_page_returns_full_body(client, mock_session, fake_membership):
    page = PageFactory.build(slug="terms", org_id=fake_membership.org_id)
    mock_session.exec.return_value.first.return_value = page
    response = client.get(f"{PATH}/terms", headers={"Host": "localhost"})
    body = response.json()
    assert "body" in body
    assert body["body"]["type"] == "doc"


def test_get_page_404s_when_missing(client, mock_session, fake_membership):
    mock_session.exec.return_value.first.return_value = None
    response = client.get(f"{PATH}/nope", headers={"Host": "localhost"})
    assert response.status_code == 404


# ---------- update ----------


def test_update_page_succeeds_for_owner(client, mock_session, fake_membership):
    fake_membership.role = Role.OWNER
    page = PageFactory.build(slug="privacy", org_id=fake_membership.org_id)
    mock_session.exec.return_value.first.return_value = page
    response = client.patch(
        f"{PATH}/privacy",
        json={"title": "Updated Title"},
        headers={"Host": "localhost"},
    )
    assert response.status_code == 200
    assert page.title == "Updated Title"


def test_update_page_rejects_instructor(client, mock_session, fake_membership):
    fake_membership.role = Role.INSTRUCTOR
    response = client.patch(
        f"{PATH}/privacy",
        json={"title": "x"},
        headers={"Host": "localhost"},
    )
    assert response.status_code == 403


def test_update_page_409_on_slug_collision(client, mock_session, fake_membership):
    fake_membership.role = Role.OWNER
    page = PageFactory.build(slug="privacy", org_id=fake_membership.org_id)
    other = PageFactory.build(slug="terms", org_id=fake_membership.org_id)
    # First exec = load original; second exec = check rename collision.
    mock_session.exec.return_value.first.side_effect = [page, other]
    response = client.patch(
        f"{PATH}/privacy",
        json={"slug": "terms"},
        headers={"Host": "localhost"},
    )
    assert response.status_code == 409


def test_update_page_rejects_reserved_slug(client, mock_session, fake_membership):
    fake_membership.role = Role.OWNER
    response = client.patch(
        f"{PATH}/privacy",
        json={"slug": "admin"},
        headers={"Host": "localhost"},
    )
    assert response.status_code == 422


# ---------- delete ----------


def test_delete_page_succeeds_for_owner(client, mock_session, fake_membership):
    fake_membership.role = Role.OWNER
    page = PageFactory.build(slug="privacy", org_id=fake_membership.org_id)
    mock_session.exec.return_value.first.return_value = page
    response = client.delete(f"{PATH}/privacy", headers={"Host": "localhost"})
    assert response.status_code == 204


def test_delete_page_rejects_instructor(client, mock_session, fake_membership):
    fake_membership.role = Role.INSTRUCTOR
    response = client.delete(f"{PATH}/privacy", headers={"Host": "localhost"})
    assert response.status_code == 403
