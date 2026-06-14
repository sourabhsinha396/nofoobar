from unittest.mock import MagicMock

from app.api.deps import get_current_membership
from app.core.entitlements import PlanTier
from app.db.models.membership import Role
from app.db.models.org_integration import IntegrationProvider, OrgIntegration
from app.main import app
from app.services.integrations.webhook import WebhookIntegration
from app.tests.factories.membership import UserOrgMembershipFactory

BASE = "/api/v1/admin/integrations"
HEADERS = {"Host": "localhost"}
WEBHOOK_CONFIG = {"url": "https://hooks.example.com/x", "signing_secret": "shh"}


def _exec_results(*values):
    return [MagicMock(first=MagicMock(return_value=v)) for v in values]


def _stored_row(org_id, *, enabled=True, secret="shh"):
    return OrgIntegration(
        org_id=org_id,
        provider=IntegrationProvider.WEBHOOK,
        enabled=enabled,
        encrypted_config=OrgIntegration.encrypt_config(
            {"url": "https://hooks.example.com/x", "signing_secret": secret}
        ),
    )


# ---------- auth ----------


def test_manage_requires_authentication(client, mock_session, fake_org):
    assert client.get(BASE, headers=HEADERS).status_code == 401


def test_create_forbidden_for_non_owner(client, mock_session, fake_org, authed_user):
    membership = UserOrgMembershipFactory.build(
        user_id=authed_user.id, org_id=fake_org.id, role=Role.STUDENT
    )

    async def _override():
        return membership

    app.dependency_overrides[get_current_membership] = _override

    response = client.post(
        BASE, json={"provider": "webhook", "config": WEBHOOK_CONFIG}, headers=HEADERS
    )
    assert response.status_code == 403


# ---------- create ----------


def test_create_integration_encrypts_and_masks_secret(
    client, mock_session, fake_org, authed_user, fake_membership
):
    mock_session.exec.side_effect = _exec_results(PlanTier.FREE)  # plan_for_org

    response = client.post(
        BASE, json={"provider": "webhook", "config": WEBHOOK_CONFIG}, headers=HEADERS
    )
    assert response.status_code == 201
    body = response.json()
    assert body["provider"] == "webhook"
    assert body["enabled"] is True
    assert body["config"]["url"] == "https://hooks.example.com/x"
    # Secret is never returned in the clear.
    assert body["config"]["signing_secret"] != "shh"

    rows = [
        c.args[0] for c in mock_session.add.call_args_list if isinstance(c.args[0], OrgIntegration)
    ]
    assert len(rows) == 1
    assert rows[0].org_id == fake_org.id
    # Stored blob round-trips to the real secret, but isn't the plaintext itself.
    assert b"shh" not in rows[0].encrypted_config
    assert rows[0].config["signing_secret"] == "shh"


def test_create_blocked_when_plan_below_min(
    client, mock_session, fake_org, authed_user, fake_membership, monkeypatch
):
    monkeypatch.setattr(WebhookIntegration, "min_plan", PlanTier.PRO)
    mock_session.exec.side_effect = _exec_results(PlanTier.FREE)

    response = client.post(
        BASE, json={"provider": "webhook", "config": WEBHOOK_CONFIG}, headers=HEADERS
    )
    assert response.status_code == 403
    assert "plan" in response.json()["detail"].lower()


def test_create_rejects_invalid_config(
    client, mock_session, fake_org, authed_user, fake_membership
):
    mock_session.exec.side_effect = _exec_results(PlanTier.FREE)
    response = client.post(
        BASE, json={"provider": "webhook", "config": {"url": "not-a-url"}}, headers=HEADERS
    )
    assert response.status_code == 422


# Slack is a real pro-tier provider, so it exercises plan gating without stubbing.
SLACK_CONFIG = {"webhook_url": "https://hooks.slack.com/services/T000/B000/xxxx"}


def test_create_slack_blocked_on_free_plan(
    client, mock_session, fake_org, authed_user, fake_membership
):
    mock_session.exec.side_effect = _exec_results(PlanTier.FREE)
    response = client.post(
        BASE, json={"provider": "slack", "config": SLACK_CONFIG}, headers=HEADERS
    )
    assert response.status_code == 403
    assert "plan" in response.json()["detail"].lower()


def test_create_slack_allowed_on_pro_plan(
    client, mock_session, fake_org, authed_user, fake_membership
):
    mock_session.exec.side_effect = _exec_results(PlanTier.PRO)
    response = client.post(
        BASE, json={"provider": "slack", "config": SLACK_CONFIG}, headers=HEADERS
    )
    assert response.status_code == 201
    assert response.json()["provider"] == "slack"


# ---------- list / available ----------


def test_list_masks_secrets(client, mock_session, fake_org, authed_user, fake_membership):
    mock_session.exec.return_value.all.return_value = [_stored_row(fake_org.id)]

    response = client.get(BASE, headers=HEADERS)
    assert response.status_code == 200
    body = response.json()
    assert len(body) == 1
    assert body[0]["config"]["url"] == "https://hooks.example.com/x"
    assert body[0]["config"]["signing_secret"] != "shh"


def test_available_lists_webhook_with_schema_and_plan(
    client, mock_session, fake_org, authed_user, fake_membership
):
    mock_session.exec.side_effect = _exec_results(PlanTier.PRO)  # plan_for_org
    response = client.get(f"{BASE}/available", headers=HEADERS)
    assert response.status_code == 200
    webhook = next(p for p in response.json() if p["provider"] == "webhook")
    assert webhook["min_plan"] == "free"
    assert "properties" in webhook["config_schema"]


def test_available_marks_pro_provider_disallowed_on_free_plan(
    client, mock_session, fake_org, authed_user, fake_membership
):
    mock_session.exec.side_effect = _exec_results(PlanTier.FREE)
    response = client.get(f"{BASE}/available", headers=HEADERS)
    by_provider = {p["provider"]: p for p in response.json()}
    # Webhook is free-tier (allowed); Slack is pro (locked on a free plan).
    assert by_provider["webhook"]["allowed"] is True
    assert by_provider["slack"]["allowed"] is False


# ---------- update / delete ----------


def test_update_toggles_enabled(client, mock_session, fake_org, authed_user, fake_membership):
    row = _stored_row(fake_org.id, enabled=True)
    mock_session.exec.side_effect = _exec_results(row)  # _get_owned

    response = client.patch(f"{BASE}/{row.id}", json={"enabled": False}, headers=HEADERS)
    assert response.status_code == 200
    assert response.json()["enabled"] is False
    assert row.enabled is False


def test_delete_removes_row(client, mock_session, fake_org, authed_user, fake_membership):
    row = _stored_row(fake_org.id)
    mock_session.exec.side_effect = _exec_results(row)  # _get_owned

    response = client.delete(f"{BASE}/{row.id}", headers=HEADERS)
    assert response.status_code == 204
    mock_session.delete.assert_called_once()


def test_get_owned_404_for_other_org(client, mock_session, fake_org, authed_user, fake_membership):
    mock_session.exec.side_effect = _exec_results(None)  # not found / wrong org
    response = client.delete(f"{BASE}/{fake_org.id}", headers=HEADERS)
    assert response.status_code == 404
