import pytest

from app.tests.factories.page import PageFactory

HOSTS = ["localhost", "acme.algoholic.app"]
PATH = "/api/v1/public/pages"


# ---------- list ----------


@pytest.mark.parametrize("host", HOSTS)
def test_list_pages_returns_summary_shape(client, mock_session, fake_org, host):
    page = PageFactory.build(org_id=fake_org.id, slug="terms", show_in_footer=True)
    mock_session.exec.return_value.all.return_value = [page]
    response = client.get(PATH, headers={"Host": host})
    assert response.status_code == 200
    body = response.json()
    assert len(body) == 1
    assert "body" not in body[0]
    assert body[0]["slug"] == "terms"


def test_list_pages_does_not_require_authentication(client, mock_session, fake_org):
    mock_session.exec.return_value.all.return_value = []
    response = client.get(PATH, headers={"Host": "localhost"})
    assert response.status_code == 200


def test_list_pages_query_filters_to_published(client, mock_session, fake_org):
    mock_session.exec.return_value.all.return_value = []
    client.get(PATH, headers={"Host": "localhost"})
    called_stmt = mock_session.exec.call_args.args[0]
    compiled = str(called_stmt.compile(compile_kwargs={"literal_binds": True})).lower()
    assert "is_published" in compiled
    assert "org_id" in compiled
    assert fake_org.id.hex in compiled


# ---------- get one ----------


def test_get_page_returns_full_body(client, mock_session, fake_org):
    page = PageFactory.build(org_id=fake_org.id, slug="terms")
    mock_session.exec.return_value.first.return_value = page
    response = client.get(f"{PATH}/terms", headers={"Host": "localhost"})
    assert response.status_code == 200
    body = response.json()
    assert body["slug"] == "terms"
    assert "body" in body


def test_get_page_404s_for_unpublished(client, mock_session, fake_org):
    # Query filter is_published=True drops drafts → handler sees None → 404.
    # Same shape as a totally missing slug so we don't leak existence.
    mock_session.exec.return_value.first.return_value = None
    response = client.get(f"{PATH}/draft", headers={"Host": "localhost"})
    assert response.status_code == 404


def test_get_page_query_includes_published_filter(client, mock_session, fake_org):
    mock_session.exec.return_value.first.return_value = None
    client.get(f"{PATH}/anything", headers={"Host": "localhost"})
    called_stmt = mock_session.exec.call_args.args[0]
    compiled = str(called_stmt.compile(compile_kwargs={"literal_binds": True})).lower()
    assert "is_published" in compiled
    assert "anything" in compiled
