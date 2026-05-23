def test_tenant_endpoint_returns_resolved_org(client, fake_org):
    response = client.get("/api/v1/tenant", headers={"X-Tenant-Slug": "ignored"})
    assert response.status_code == 200
    data = response.json()
    assert data["slug"] == fake_org.slug
    assert data["name"] == fake_org.name
    assert data["id"] == str(fake_org.id)


def test_tenant_returns_404_when_session_yields_no_org(client, mock_session):
    mock_session.exec.return_value.first.return_value = None
    response = client.get("/api/v1/tenant", headers={"X-Tenant-Slug": "ghost"})
    assert response.status_code == 404
