import pytest

from app.db.models.homepage_block import HomepageBlockType
from app.tests.factories.homepage_block import HomepageBlockFactory

HOSTS = ["localhost", "acme.nofoobar.app"]
HOMEPAGE_PATH = "/api/v1/public/homepage"


# ---------- read ----------


@pytest.mark.parametrize("host", HOSTS)
def test_list_homepage_blocks_returns_empty_for_new_org(client, mock_session, fake_org, host):
    mock_session.exec.return_value.all.return_value = []
    response = client.get(HOMEPAGE_PATH, headers={"Host": host})
    assert response.status_code == 200
    assert response.json() == []


def test_list_homepage_blocks_does_not_require_authentication(client, mock_session, fake_org):
    mock_session.exec.return_value.all.return_value = []
    response = client.get(HOMEPAGE_PATH, headers={"Host": "localhost"})
    assert response.status_code == 200


def test_list_homepage_blocks_returns_block_shape(client, mock_session, fake_org):
    block = HomepageBlockFactory.build(
        org_id=fake_org.id,
        type=HomepageBlockType.HERO,
        position=0,
        is_enabled=True,
        config={"type": "hero", "headline": "Welcome", "cta_label": "Start"},
    )
    mock_session.exec.return_value.all.return_value = [block]
    response = client.get(HOMEPAGE_PATH, headers={"Host": "localhost"})
    body = response.json()
    assert len(body) == 1
    item = body[0]
    assert set(item.keys()) == {"id", "type", "position", "is_enabled", "config"}
    assert item["type"] == "hero"
    assert item["config"]["headline"] == "Welcome"
    assert item["config"]["cta_label"] == "Start"


def test_list_homepage_blocks_preserves_position_order(client, mock_session, fake_org):
    # Server is responsible for ORDER BY position; we simulate it by feeding
    # rows in the order the query would return them.
    blocks = [
        HomepageBlockFactory.build(
            org_id=fake_org.id,
            type=HomepageBlockType.HERO,
            position=0,
            config={"type": "hero", "headline": "First"},
        ),
        HomepageBlockFactory.build(
            org_id=fake_org.id,
            type=HomepageBlockType.STATS,
            position=1,
            config={
                "type": "stats",
                "items": [{"value": "500+", "label": "Students"}],
            },
        ),
    ]
    mock_session.exec.return_value.all.return_value = blocks
    response = client.get(HOMEPAGE_PATH, headers={"Host": "localhost"})
    body = response.json()
    assert [b["type"] for b in body] == ["hero", "stats"]


def test_list_homepage_blocks_query_filters_by_org_and_enabled_and_orders_by_position(
    client, mock_session, fake_org
):
    mock_session.exec.return_value.all.return_value = []
    client.get(HOMEPAGE_PATH, headers={"Host": "localhost"})
    called_stmt = mock_session.exec.call_args.args[0]
    compiled = str(called_stmt.compile(compile_kwargs={"literal_binds": True})).lower()
    assert "org_id" in compiled
    assert fake_org.id.hex in compiled
    assert "is_enabled" in compiled
    # Query must order by position so the client doesn't have to.
    assert "order by" in compiled
    assert "position" in compiled
