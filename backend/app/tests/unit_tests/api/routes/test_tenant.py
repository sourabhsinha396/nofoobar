from unittest.mock import MagicMock

from app.db.models.membership import Role
from app.db.models.org_integration import IntegrationProvider, OrgIntegration
from app.db.models.payment_account import OrgPaymentAccount, PaymentProvider


def test_tenant_endpoint_returns_resolved_org(client, mock_session, fake_org):
    # Empty payment_accounts list - fresh tenant with no provider connected.
    mock_session.exec.return_value.all.return_value = []
    mock_session.exec.return_value.first.return_value = None  # no posthog integration
    response = client.get("/api/v1/tenant", headers={"X-Tenant-Slug": "ignored"})
    assert response.status_code == 200
    data = response.json()
    assert data["slug"] == fake_org.slug
    assert data["name"] == fake_org.name
    assert data["id"] == str(fake_org.id)
    assert data["payment_accounts"] == []
    assert data["posthog"] is None
    # Anonymous visitor: no role.
    assert data["viewer_role"] is None


def test_tenant_endpoint_projects_payment_accounts(client, mock_session, fake_org):
    account = OrgPaymentAccount(
        org_id=fake_org.id,
        provider=PaymentProvider.STRIPE,
        key_id="pk_test_visible",
        secret_key=b"opaque-bytes",
    )
    mock_session.exec.return_value.all.return_value = [account]
    mock_session.exec.return_value.first.return_value = None
    response = client.get("/api/v1/tenant", headers={"X-Tenant-Slug": "ignored"})
    assert response.status_code == 200
    data = response.json()
    assert data["payment_accounts"] == [{"provider": "stripe", "key_id": "pk_test_visible"}]


def test_tenant_includes_posthog_when_enabled(client, mock_session, fake_org):
    posthog_row = OrgIntegration(
        org_id=fake_org.id,
        provider=IntegrationProvider.POSTHOG,
        enabled=True,
        encrypted_config=OrgIntegration.encrypt_config(
            {"project_api_key": "phc_abc123", "host": "https://eu.i.posthog.com"}
        ),
    )
    mock_session.exec.return_value.all.return_value = []  # payment accounts
    mock_session.exec.return_value.first.return_value = posthog_row  # posthog lookup
    response = client.get("/api/v1/tenant", headers={"X-Tenant-Slug": "ignored"})
    assert response.status_code == 200
    data = response.json()
    # The public, browser-safe key is returned (not masked - it's public by design).
    assert data["posthog"] == {
        "project_api_key": "phc_abc123",
        "host": "https://eu.i.posthog.com",
    }


def test_tenant_reports_viewer_role_for_member(client, mock_session, fake_org, authed_user):
    # exec order: payment accounts (.all), posthog (.first), viewer role (.first).
    mock_session.exec.side_effect = [
        MagicMock(all=MagicMock(return_value=[])),
        MagicMock(first=MagicMock(return_value=None)),
        MagicMock(first=MagicMock(return_value=Role.OWNER)),
    ]
    response = client.get("/api/v1/tenant", headers={"X-Tenant-Slug": "ignored"})
    assert response.status_code == 200
    assert response.json()["viewer_role"] == "owner"


def test_tenant_returns_404_when_session_yields_no_org(client, mock_session):
    mock_session.exec.return_value.first.return_value = None
    response = client.get(
        "/api/v1/tenant",
        headers={"Host": "localhost", "X-Tenant-Slug": "ghost"},
    )
    assert response.status_code == 404
