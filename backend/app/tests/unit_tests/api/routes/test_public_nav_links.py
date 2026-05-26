import pytest

from app.db.models.nav_link import NavLinkLocation
from app.tests.factories.nav_link import NavLinkFactory

HOSTS = ["localhost", "acme.algoholic.app"]
PATH = "/api/v1/public/nav-links"


@pytest.mark.parametrize("host", HOSTS)
def test_list_public_nav_links_returns_empty_when_none(client, mock_session, fake_org, host):
    mock_session.exec.return_value.all.return_value = []
    response = client.get(f"{PATH}?location=header", headers={"Host": host})
    assert response.status_code == 200
    assert response.json() == []


def test_list_public_nav_links_does_not_require_authentication(client, mock_session, fake_org):
    mock_session.exec.return_value.all.return_value = []
    response = client.get(f"{PATH}?location=header", headers={"Host": "localhost"})
    assert response.status_code == 200


def test_list_public_nav_links_returns_row_shape(client, mock_session, fake_org):
    link = NavLinkFactory.build(
        org_id=fake_org.id,
        location=NavLinkLocation.HEADER,
        label="Pricing",
        href="/pricing",
        open_in_new_tab=False,
        position=0,
        is_enabled=True,
    )
    mock_session.exec.return_value.all.return_value = [link]
    response = client.get(f"{PATH}?location=header", headers={"Host": "localhost"})
    body = response.json()
    assert len(body) == 1
    item = body[0]
    assert set(item.keys()) == {
        "id",
        "location",
        "label",
        "href",
        "open_in_new_tab",
        "position",
        "is_enabled",
    }
    assert item["label"] == "Pricing"
    assert item["open_in_new_tab"] is False


def test_list_public_nav_links_requires_location_param(client, mock_session, fake_org):
    response = client.get(PATH, headers={"Host": "localhost"})
    assert response.status_code == 422


def test_list_public_nav_links_rejects_unknown_location(client, mock_session, fake_org):
    response = client.get(f"{PATH}?location=sidebar", headers={"Host": "localhost"})
    assert response.status_code == 422


def test_list_public_nav_links_query_filters(client, mock_session, fake_org):
    mock_session.exec.return_value.all.return_value = []
    client.get(f"{PATH}?location=footer", headers={"Host": "localhost"})
    called_stmt = mock_session.exec.call_args.args[0]
    compiled = str(called_stmt.compile(compile_kwargs={"literal_binds": True})).lower()
    assert "org_id" in compiled
    assert fake_org.id.hex in compiled
    assert "location" in compiled
    assert "footer" in compiled
    assert "is_enabled" in compiled
    assert "order by" in compiled
    assert "position" in compiled
