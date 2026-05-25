from app.db.models.payment_account import OrgPaymentAccount, PaymentProvider


def test_tenant_endpoint_returns_resolved_org(client, mock_session, fake_org):
    # Empty payment_accounts list — fresh tenant with no provider connected.
    mock_session.exec.return_value.all.return_value = []
    response = client.get("/api/v1/tenant", headers={"X-Tenant-Slug": "ignored"})
    assert response.status_code == 200
    data = response.json()
    assert data["slug"] == fake_org.slug
    assert data["name"] == fake_org.name
    assert data["id"] == str(fake_org.id)
    assert data["payment_accounts"] == []


def test_tenant_endpoint_projects_payment_accounts(client, mock_session, fake_org):
    account = OrgPaymentAccount(
        org_id=fake_org.id,
        provider=PaymentProvider.STRIPE,
        key_id="pk_test_visible",
        secret_key=b"opaque-bytes",
    )
    mock_session.exec.return_value.all.return_value = [account]
    response = client.get("/api/v1/tenant", headers={"X-Tenant-Slug": "ignored"})
    assert response.status_code == 200
    data = response.json()
    assert data["payment_accounts"] == [{"provider": "stripe", "key_id": "pk_test_visible"}]


def test_tenant_returns_404_when_session_yields_no_org(client, mock_session):
    mock_session.exec.return_value.first.return_value = None
    response = client.get(
        "/api/v1/tenant",
        headers={"Host": "localhost", "X-Tenant-Slug": "ghost"},
    )
    assert response.status_code == 404
