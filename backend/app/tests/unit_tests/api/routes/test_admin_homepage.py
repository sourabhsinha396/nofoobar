from unittest.mock import AsyncMock

import pytest

from app.db.models.homepage_block import HomepageBlockType
from app.db.models.membership import Role
from app.tests.factories.homepage_block import HomepageBlockFactory

HOSTS = ["localhost", "acme.nofoobar.app"]
HOMEPAGE_PATH = "/api/v1/admin/homepage"


# ---------- GET /admin/homepage ----------


@pytest.mark.parametrize("host", HOSTS)
def test_list_admin_blocks_returns_all_for_member(client, mock_session, fake_membership, host):
    blocks = [
        HomepageBlockFactory.build(
            org_id=fake_membership.org_id,
            type=HomepageBlockType.HERO,
            position=0,
            is_enabled=True,
            config={"type": "hero", "headline": "A"},
        ),
        HomepageBlockFactory.build(
            org_id=fake_membership.org_id,
            type=HomepageBlockType.STATS,
            position=1,
            is_enabled=False,
            config={"type": "stats", "items": [{"value": "1", "label": "x"}]},
        ),
    ]
    mock_session.exec.return_value.all.return_value = blocks
    response = client.get(HOMEPAGE_PATH, headers={"Host": host})
    assert response.status_code == 200
    body = response.json()
    # Admin variant includes disabled rows so the editor can show them as
    # toggleable items.
    assert [b["is_enabled"] for b in body] == [True, False]


def test_list_admin_blocks_requires_authentication(client, mock_session):
    # Membership requirement is enforced by the shared CurrentMembershipDep
    # and tested in conftest-level fixtures; here we just confirm the auth
    # leg of that dep stack still gates the route.
    response = client.get(HOMEPAGE_PATH, headers={"Host": "localhost"})
    assert response.status_code == 401


def test_list_admin_blocks_query_filters_by_org_and_orders_by_position(
    client, mock_session, fake_membership
):
    mock_session.exec.return_value.all.return_value = []
    client.get(HOMEPAGE_PATH, headers={"Host": "localhost"})
    called_stmt = mock_session.exec.call_args.args[0]
    compiled = str(called_stmt.compile(compile_kwargs={"literal_binds": True})).lower()
    assert "org_id" in compiled
    assert fake_membership.org_id.hex in compiled
    assert "order by" in compiled
    assert "position" in compiled


# ---------- PUT /admin/homepage ----------


@pytest.mark.parametrize("role", [Role.OWNER, Role.INSTRUCTOR])
def test_put_homepage_succeeds_for_authors(client, mock_session, fake_membership, role):
    fake_membership.role = role
    # First exec is the "load existing" SELECT for deletion — empty in this case.
    mock_session.exec.return_value.all.return_value = []
    payload = {
        "blocks": [
            {"config": {"type": "hero", "headline": "Welcome"}},
        ]
    }
    response = client.put(HOMEPAGE_PATH, json=payload, headers={"Host": "localhost"})
    assert response.status_code == 200
    body = response.json()
    assert len(body) == 1
    assert body[0]["type"] == "hero"
    assert body[0]["position"] == 0
    assert body[0]["config"]["headline"] == "Welcome"


def test_put_homepage_rejects_students(client, mock_session, fake_membership):
    fake_membership.role = Role.STUDENT
    response = client.put(
        HOMEPAGE_PATH,
        json={"blocks": [{"config": {"type": "hero", "headline": "x"}}]},
        headers={"Host": "localhost"},
    )
    assert response.status_code == 403


def test_put_homepage_requires_authentication(client, mock_session):
    response = client.put(
        HOMEPAGE_PATH,
        json={"blocks": [{"config": {"type": "hero", "headline": "x"}}]},
        headers={"Host": "localhost"},
    )
    assert response.status_code == 401


def test_put_homepage_validates_block_configs(client, mock_session, fake_membership):
    # Hero requires headline — payload missing it should 422 at the schema layer
    # before any DB work happens.
    response = client.put(
        HOMEPAGE_PATH,
        json={"blocks": [{"config": {"type": "hero"}}]},
        headers={"Host": "localhost"},
    )
    assert response.status_code == 422


def test_put_homepage_deletes_existing_blocks_for_org(client, mock_session, fake_membership):
    existing = HomepageBlockFactory.build(
        org_id=fake_membership.org_id, type=HomepageBlockType.HERO, position=0
    )
    # session.exec(select(...)) is called once for "load existing rows", and
    # session.delete is called per row.
    mock_session.exec.return_value.all.return_value = [existing]
    mock_session.delete = AsyncMock()
    response = client.put(
        HOMEPAGE_PATH,
        json={"blocks": [{"config": {"type": "hero", "headline": "New"}}]},
        headers={"Host": "localhost"},
    )
    assert response.status_code == 200
    # Existing block deleted before the new ones were added.
    assert mock_session.delete.call_count == 1


def test_put_homepage_assigns_dense_positions_in_array_order(client, mock_session, fake_membership):
    mock_session.exec.return_value.all.return_value = []
    payload = {
        "blocks": [
            {"config": {"type": "hero", "headline": "H"}},
            {"config": {"type": "stats", "items": [{"value": "1", "label": "x"}]}},
            {"config": {"type": "faqs", "items": [{"question": "Q?", "answer": "A."}]}},
        ]
    }
    response = client.put(HOMEPAGE_PATH, json=payload, headers={"Host": "localhost"})
    body = response.json()
    assert [b["position"] for b in body] == [0, 1, 2]
    assert [b["type"] for b in body] == ["hero", "stats", "faqs"]


def test_put_homepage_scopes_org_id_from_membership(client, mock_session, fake_membership):
    mock_session.exec.return_value.all.return_value = []
    client.put(
        HOMEPAGE_PATH,
        json={"blocks": [{"config": {"type": "hero", "headline": "x"}}]},
        headers={"Host": "localhost"},
    )
    # session.add is called once per new block.
    added = mock_session.add.call_args.args[0]
    assert added.org_id == fake_membership.org_id


def test_put_homepage_accepts_empty_blocks_list(client, mock_session, fake_membership):
    # Empty list = "clear my homepage back to the synthetic default".
    mock_session.exec.return_value.all.return_value = []
    response = client.put(HOMEPAGE_PATH, json={"blocks": []}, headers={"Host": "localhost"})
    assert response.status_code == 200
    assert response.json() == []


def test_put_homepage_persists_is_enabled_flag(client, mock_session, fake_membership):
    mock_session.exec.return_value.all.return_value = []
    response = client.put(
        HOMEPAGE_PATH,
        json={
            "blocks": [
                {"config": {"type": "hero", "headline": "On"}, "is_enabled": True},
                {"config": {"type": "hero", "headline": "Off"}, "is_enabled": False},
            ]
        },
        headers={"Host": "localhost"},
    )
    body = response.json()
    assert [b["is_enabled"] for b in body] == [True, False]
