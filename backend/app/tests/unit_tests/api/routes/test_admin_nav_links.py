from unittest.mock import AsyncMock

from app.db.models.membership import Role
from app.db.models.nav_link import NavLinkLocation
from app.tests.factories.nav_link import NavLinkFactory

PATH = "/api/v1/admin/nav-links"


# ---------- GET ----------


def test_list_admin_nav_links_returns_all_including_disabled(
    client, mock_session, fake_membership
):
    rows = [
        NavLinkFactory.build(
            org_id=fake_membership.org_id,
            location=NavLinkLocation.HEADER,
            position=0,
            is_enabled=True,
        ),
        NavLinkFactory.build(
            org_id=fake_membership.org_id,
            location=NavLinkLocation.HEADER,
            position=1,
            is_enabled=False,
        ),
    ]
    mock_session.exec.return_value.all.return_value = rows
    response = client.get(f"{PATH}?location=header", headers={"Host": "localhost"})
    assert response.status_code == 200
    body = response.json()
    assert [b["is_enabled"] for b in body] == [True, False]


def test_list_admin_nav_links_requires_authentication(client, mock_session):
    response = client.get(f"{PATH}?location=header", headers={"Host": "localhost"})
    assert response.status_code == 401


def test_list_admin_nav_links_query_filters_by_org_and_location(
    client, mock_session, fake_membership
):
    mock_session.exec.return_value.all.return_value = []
    client.get(f"{PATH}?location=footer", headers={"Host": "localhost"})
    called_stmt = mock_session.exec.call_args.args[0]
    compiled = str(called_stmt.compile(compile_kwargs={"literal_binds": True})).lower()
    assert "org_id" in compiled
    assert fake_membership.org_id.hex in compiled
    assert "location" in compiled
    assert "footer" in compiled


# ---------- PUT ----------


def test_put_nav_links_succeeds_for_owner(client, mock_session, fake_membership):
    fake_membership.role = Role.OWNER
    mock_session.exec.return_value.all.return_value = []
    payload = {
        "links": [
            {"label": "Blog", "href": "https://blog.example.com", "open_in_new_tab": True},
            {"label": "Pricing", "href": "/pricing", "open_in_new_tab": False},
        ]
    }
    response = client.put(
        f"{PATH}?location=header", json=payload, headers={"Host": "localhost"}
    )
    assert response.status_code == 200
    body = response.json()
    assert [(b["label"], b["position"]) for b in body] == [("Blog", 0), ("Pricing", 1)]


def test_put_nav_links_rejects_instructor(client, mock_session, fake_membership):
    fake_membership.role = Role.INSTRUCTOR
    response = client.put(
        f"{PATH}?location=header",
        json={"links": [{"label": "x", "href": "https://x.test"}]},
        headers={"Host": "localhost"},
    )
    assert response.status_code == 403


def test_put_nav_links_rejects_student(client, mock_session, fake_membership):
    fake_membership.role = Role.STUDENT
    response = client.put(
        f"{PATH}?location=header",
        json={"links": [{"label": "x", "href": "https://x.test"}]},
        headers={"Host": "localhost"},
    )
    assert response.status_code == 403


def test_put_nav_links_requires_authentication(client, mock_session):
    response = client.put(
        f"{PATH}?location=header",
        json={"links": [{"label": "x", "href": "https://x.test"}]},
        headers={"Host": "localhost"},
    )
    assert response.status_code == 401


def test_put_nav_links_rejects_empty_label(client, mock_session, fake_membership):
    fake_membership.role = Role.OWNER
    response = client.put(
        f"{PATH}?location=header",
        json={"links": [{"label": "", "href": "https://x.test"}]},
        headers={"Host": "localhost"},
    )
    assert response.status_code == 422


def test_put_nav_links_caps_link_count(client, mock_session, fake_membership):
    fake_membership.role = Role.OWNER
    too_many = [
        {"label": f"L{i}", "href": f"https://e{i}.test"} for i in range(25)
    ]
    response = client.put(
        f"{PATH}?location=header",
        json={"links": too_many},
        headers={"Host": "localhost"},
    )
    assert response.status_code == 422


def test_put_nav_links_accepts_empty_list(client, mock_session, fake_membership):
    fake_membership.role = Role.OWNER
    mock_session.exec.return_value.all.return_value = []
    response = client.put(
        f"{PATH}?location=header", json={"links": []}, headers={"Host": "localhost"}
    )
    assert response.status_code == 200
    assert response.json() == []


def test_put_nav_links_deletes_existing_at_same_location(
    client, mock_session, fake_membership
):
    fake_membership.role = Role.OWNER
    existing = NavLinkFactory.build(
        org_id=fake_membership.org_id, location=NavLinkLocation.HEADER, position=0
    )
    mock_session.exec.return_value.all.return_value = [existing]
    mock_session.delete = AsyncMock()
    response = client.put(
        f"{PATH}?location=header",
        json={"links": [{"label": "New", "href": "https://new.test"}]},
        headers={"Host": "localhost"},
    )
    assert response.status_code == 200
    assert mock_session.delete.call_count == 1


def test_put_nav_links_assigns_dense_positions(client, mock_session, fake_membership):
    fake_membership.role = Role.OWNER
    mock_session.exec.return_value.all.return_value = []
    response = client.put(
        f"{PATH}?location=footer",
        json={
            "links": [
                {"label": "Terms", "href": "/terms"},
                {"label": "Privacy", "href": "/privacy"},
                {"label": "Refund", "href": "/refund"},
            ]
        },
        headers={"Host": "localhost"},
    )
    body = response.json()
    assert [b["position"] for b in body] == [0, 1, 2]
    assert all(b["location"] == "footer" for b in body)


def test_put_nav_links_scoped_delete_does_not_touch_other_location(
    client, mock_session, fake_membership
):
    # Confirms the wipe query includes the location filter - editing the
    # header must not touch footer rows.
    fake_membership.role = Role.OWNER
    mock_session.exec.return_value.all.return_value = []
    client.put(
        f"{PATH}?location=header",
        json={"links": []},
        headers={"Host": "localhost"},
    )
    # First exec is the SELECT for deletion.
    select_stmt = mock_session.exec.call_args_list[0].args[0]
    compiled = str(select_stmt.compile(compile_kwargs={"literal_binds": True})).lower()
    assert "location" in compiled
    assert "header" in compiled
