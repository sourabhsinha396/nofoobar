from app.tests.factories.organization import OrganizationFactory


def _org_with_domain(domain: str):
    org = OrganizationFactory.build()
    org.custom_domain = domain
    return org


def test_check_returns_200_with_slug_for_registered_domain(client, mock_session):
    org = _org_with_domain("fastapitutorial.com")
    mock_session.exec.return_value.first.return_value = org
    response = client.get("/api/v1/domains/check?domain=fastapitutorial.com")
    assert response.status_code == 200
    assert response.json() == {"domain": "fastapitutorial.com", "slug": org.slug}


def test_check_returns_404_for_unregistered_domain(client, mock_session):
    mock_session.exec.return_value.first.return_value = None
    response = client.get("/api/v1/domains/check?domain=stranger.example.com")
    assert response.status_code == 404


def test_check_normalizes_port_case_and_trailing_dot(client, mock_session):
    org = _org_with_domain("learn.acme.com")
    mock_session.exec.return_value.first.return_value = org
    response = client.get("/api/v1/domains/check?domain=Learn.ACME.com.:443")
    assert response.status_code == 200
    assert response.json()["domain"] == "learn.acme.com"


def test_check_rejects_garbage_domains(client, mock_session):
    for bad in ["", "no-dots", "evil/path.com"]:
        response = client.get(f"/api/v1/domains/check?domain={bad}")
        assert response.status_code in (400, 422), bad


def test_check_requires_domain_param(client, mock_session):
    response = client.get("/api/v1/domains/check")
    assert response.status_code == 422
