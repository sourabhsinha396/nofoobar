from unittest.mock import MagicMock, patch
from uuid import uuid4

import pytest
import stripe
from cryptography.fernet import Fernet

from app.core import encryption
from app.core.config import settings
from app.core.encryption import encrypt
from app.db.models.course import CourseVisibility
from app.db.models.membership import Role
from app.db.models.payment_account import OrgPaymentAccount, PaymentProvider
from app.db.models.payment_attempt import PaymentStatus
from app.tests.factories.course import CourseFactory
from app.tests.factories.payment_attempt import PaymentAttemptFactory


def _exec_results(*first_values):
    return [MagicMock(first=MagicMock(return_value=v)) for v in first_values]


def _stripe_account(fake_org, *, key_id="pk_test_x", secret_plain="sk_test_x"):
    return OrgPaymentAccount(
        org_id=fake_org.id,
        provider=PaymentProvider.STRIPE,
        key_id=key_id,
        secret_key=encrypt(secret_plain),
    )


@pytest.fixture(autouse=True)
def _encryption_key(monkeypatch):
    monkeypatch.setattr(settings, "SECRETS_ENCRYPTION_KEY", Fernet.generate_key().decode())
    encryption._cipher.cache_clear()
    monkeypatch.setattr(
        settings, "CORS_ORIGIN_REGEX", r"^http://([a-z0-9-]+\.)?testholic\.test:3000$"
    )
    yield
    encryption._cipher.cache_clear()


# ---------- GET /orgs/{slug}/payment-accounts ----------


def test_list_accounts_requires_authentication(client, mock_session):
    response = client.get(
        "/api/v1/orgs/acme/payment-accounts", headers={"Host": "localhost"}
    )
    assert response.status_code == 401


def test_list_accounts_rejects_non_owners(client, mock_session, fake_membership):
    fake_membership.role = Role.INSTRUCTOR
    response = client.get(
        f"/api/v1/orgs/{fake_membership.org_id}/payment-accounts",
        headers={"Host": "localhost"},
    )
    assert response.status_code == 403


def test_list_accounts_returns_summaries(
    client, mock_session, fake_membership, fake_org
):
    fake_org.slug = "acme"
    fake_membership.role = Role.OWNER
    accounts = [_stripe_account(fake_org, key_id="pk_test_abc")]
    mock_session.exec.return_value.all.return_value = accounts

    response = client.get(
        "/api/v1/orgs/acme/payment-accounts", headers={"Host": "localhost"}
    )
    assert response.status_code == 200
    body = response.json()
    assert body == [{"provider": "stripe", "key_id": "pk_test_abc"}]
    # secret_key MUST NOT leak into the response.
    assert "secret_key" not in body[0]


# ---------- PUT /orgs/{slug}/payment-accounts/{provider} ----------


def test_upsert_account_requires_authentication(client, mock_session):
    response = client.put(
        "/api/v1/orgs/acme/payment-accounts/stripe",
        json={"key_id": "pk_test_x", "secret_key": "sk_test_x"},
        headers={"Host": "localhost"},
    )
    assert response.status_code == 401


def test_upsert_account_rejects_non_owners(client, mock_session, fake_membership):
    fake_membership.role = Role.STUDENT
    response = client.put(
        f"/api/v1/orgs/{fake_membership.org_id}/payment-accounts/stripe",
        json={"key_id": "pk_test_x", "secret_key": "sk_test_x"},
        headers={"Host": "localhost"},
    )
    assert response.status_code == 403


def test_upsert_account_creates_new(
    client, mock_session, fake_membership, fake_org
):
    fake_org.slug = "acme"
    fake_membership.role = Role.OWNER
    # No existing account.
    mock_session.exec.side_effect = _exec_results(None)

    with patch("stripe.Balance.retrieve") as balance_retrieve:
        balance_retrieve.return_value = MagicMock()
        response = client.put(
            "/api/v1/orgs/acme/payment-accounts/stripe",
            json={"key_id": "pk_test_abc", "secret_key": "sk_test_abc"},
            headers={"Host": "localhost"},
        )

    assert response.status_code == 200
    assert response.json() == {"provider": "stripe", "key_id": "pk_test_abc"}
    balance_retrieve.assert_called_once_with(api_key="sk_test_abc")

    added = [c.args[0] for c in mock_session.add.call_args_list]
    accounts = [obj for obj in added if isinstance(obj, OrgPaymentAccount)]
    assert len(accounts) == 1
    assert accounts[0].key_id == "pk_test_abc"
    assert accounts[0].provider == PaymentProvider.STRIPE
    # secret_key was encrypted before storage.
    assert isinstance(accounts[0].secret_key, bytes)
    assert b"sk_test_abc" not in accounts[0].secret_key  # not plaintext


def test_upsert_account_updates_existing(
    client, mock_session, fake_membership, fake_org
):
    fake_org.slug = "acme"
    fake_membership.role = Role.OWNER
    existing = _stripe_account(fake_org, key_id="pk_test_old", secret_plain="sk_test_old")
    mock_session.exec.side_effect = _exec_results(existing)

    with patch("stripe.Balance.retrieve"):
        response = client.put(
            "/api/v1/orgs/acme/payment-accounts/stripe",
            json={"key_id": "pk_test_new", "secret_key": "sk_test_new"},
            headers={"Host": "localhost"},
        )

    assert response.status_code == 200
    assert response.json()["key_id"] == "pk_test_new"
    assert existing.key_id == "pk_test_new"
    # No new account added — existing row was mutated.
    added_accounts = [
        c.args[0]
        for c in mock_session.add.call_args_list
        if isinstance(c.args[0], OrgPaymentAccount)
    ]
    assert added_accounts == []


def test_upsert_account_400_when_credentials_invalid(
    client, mock_session, fake_membership, fake_org
):
    fake_org.slug = "acme"
    fake_membership.role = Role.OWNER

    with patch("stripe.Balance.retrieve") as balance_retrieve:
        balance_retrieve.side_effect = stripe.AuthenticationError("bad key")
        response = client.put(
            "/api/v1/orgs/acme/payment-accounts/stripe",
            json={"key_id": "pk_test_bad", "secret_key": "sk_test_bad"},
            headers={"Host": "localhost"},
        )

    assert response.status_code == 400
    # The bad creds should never have been persisted.
    added_accounts = [
        c.args[0]
        for c in mock_session.add.call_args_list
        if isinstance(c.args[0], OrgPaymentAccount)
    ]
    assert added_accounts == []


def test_upsert_razorpay_account_creates_new(
    client, mock_session, fake_membership, fake_org
):
    fake_org.slug = "acme"
    fake_membership.role = Role.OWNER
    mock_session.exec.side_effect = _exec_results(None)

    with patch("razorpay.resources.order.Order.all") as order_all:
        order_all.return_value = {"items": []}
        response = client.put(
            "/api/v1/orgs/acme/payment-accounts/razorpay",
            json={"key_id": "rzp_test_abc", "secret_key": "rzp_secret_abc"},
            headers={"Host": "localhost"},
        )

    assert response.status_code == 200
    assert response.json() == {"provider": "razorpay", "key_id": "rzp_test_abc"}
    order_all.assert_called_once_with({"count": 1})

    added = [c.args[0] for c in mock_session.add.call_args_list]
    accounts = [obj for obj in added if isinstance(obj, OrgPaymentAccount)]
    assert len(accounts) == 1
    assert accounts[0].provider == PaymentProvider.RAZORPAY
    assert isinstance(accounts[0].secret_key, bytes)
    assert b"rzp_secret_abc" not in accounts[0].secret_key  # encrypted


def test_upsert_razorpay_400_when_credentials_invalid(
    client, mock_session, fake_membership, fake_org
):
    import razorpay.errors

    fake_org.slug = "acme"
    fake_membership.role = Role.OWNER

    with patch("razorpay.resources.order.Order.all") as order_all:
        order_all.side_effect = razorpay.errors.BadRequestError("bad key")
        response = client.put(
            "/api/v1/orgs/acme/payment-accounts/razorpay",
            json={"key_id": "rzp_test_bad", "secret_key": "rzp_secret_bad"},
            headers={"Host": "localhost"},
        )

    assert response.status_code == 400


def test_upsert_account_404_for_unknown_provider(
    client, mock_session, fake_membership
):
    fake_membership.role = Role.OWNER
    response = client.put(
        f"/api/v1/orgs/{fake_membership.org_id}/payment-accounts/bitcoin",
        json={"key_id": "k", "secret_key": "s"},
        headers={"Host": "localhost"},
    )
    # FastAPI rejects unknown enum values at the path-param validation layer.
    assert response.status_code == 422


# ---------- DELETE /orgs/{slug}/payment-accounts/{provider} ----------


def test_delete_account_rejects_non_owners(client, mock_session, fake_membership):
    fake_membership.role = Role.INSTRUCTOR
    response = client.delete(
        f"/api/v1/orgs/{fake_membership.org_id}/payment-accounts/stripe",
        headers={"Host": "localhost"},
    )
    assert response.status_code == 403


def test_delete_account_404_when_missing(
    client, mock_session, fake_membership, fake_org
):
    fake_org.slug = "acme"
    fake_membership.role = Role.OWNER
    mock_session.exec.side_effect = _exec_results(None)
    response = client.delete(
        "/api/v1/orgs/acme/payment-accounts/stripe",
        headers={"Host": "localhost"},
    )
    assert response.status_code == 404


def test_delete_account_success(
    client, mock_session, fake_membership, fake_org
):
    fake_org.slug = "acme"
    fake_membership.role = Role.OWNER
    account = _stripe_account(fake_org)
    mock_session.exec.side_effect = _exec_results(account)

    response = client.delete(
        "/api/v1/orgs/acme/payment-accounts/stripe",
        headers={"Host": "localhost"},
    )
    assert response.status_code == 204
    mock_session.delete.assert_called_once_with(account)


# ---------- POST /courses/{slug}/checkout ----------


_STRIPE_BODY = {
    "return_url_base": "http://acme.testholic.test:3000",
    "provider": "stripe",
    "currency": "USD",
}

_RAZORPAY_BODY = {
    "return_url_base": "http://acme.testholic.test:3000",
    "provider": "razorpay",
    "currency": "INR",
}


def test_checkout_requires_authentication(client, mock_session, fake_org):
    response = client.post(
        "/api/v1/courses/intro/checkout",
        json=_STRIPE_BODY,
        headers={"Host": "localhost"},
    )
    assert response.status_code == 401


def test_checkout_400_when_razorpay_paired_with_non_inr(
    client, mock_session, fake_org, authed_user
):
    response = client.post(
        "/api/v1/courses/paid/checkout",
        json={**_RAZORPAY_BODY, "currency": "USD"},
        headers={"Host": "localhost"},
    )
    assert response.status_code == 400


def test_checkout_400_when_return_url_origin_unknown(
    client, mock_session, fake_org, authed_user
):
    fake_org.custom_domain = None
    response = client.post(
        "/api/v1/courses/paid/checkout",
        json={**_STRIPE_BODY, "return_url_base": "https://evil.example"},
        headers={"Host": "localhost"},
    )
    assert response.status_code == 400
    assert response.json()["detail"] == "URL must match an allowed origin."


@pytest.mark.parametrize(
    "return_url_base",
    [
        "http://learn.acme.example",  # custom domain only trusted over https
        "https://other.example",  # unrelated domain stays rejected
        "https://sub.learn.acme.example",  # exact host match, no subdomains
    ],
)
def test_checkout_400_when_origin_not_org_custom_domain(
    client, mock_session, fake_org, authed_user, return_url_base
):
    fake_org.custom_domain = "learn.acme.example"
    response = client.post(
        "/api/v1/courses/paid/checkout",
        json={**_STRIPE_BODY, "return_url_base": return_url_base},
        headers={"Host": "localhost"},
    )
    assert response.status_code == 400
    assert response.json()["detail"] == "URL must match an allowed origin."


def test_checkout_accepts_org_custom_domain_origin(
    client, mock_session, fake_org, authed_user
):
    fake_org.custom_domain = "learn.acme.example"
    course = CourseFactory.build(
        slug="paid",
        title="Paid course",
        description=None,
        org_id=fake_org.id,
        visibility=CourseVisibility.PUBLISHED,
        price_cents=9900,
        currency="USD",
    )
    account = _stripe_account(fake_org)
    mock_session.exec.side_effect = _exec_results(course, account, None)

    with patch("stripe.checkout.Session.create") as create:
        create.return_value = MagicMock(
            id="cs_custom", url="https://checkout.stripe.com/pay/cs_custom"
        )
        response = client.post(
            "/api/v1/courses/paid/checkout",
            json={**_STRIPE_BODY, "return_url_base": "https://learn.acme.example"},
            headers={"Host": "localhost"},
        )

    assert response.status_code == 200
    call_kwargs = create.call_args.kwargs
    assert call_kwargs["success_url"].startswith("https://learn.acme.example/courses/paid")
    assert call_kwargs["cancel_url"] == "https://learn.acme.example/courses/paid"


def test_checkout_404_when_course_missing(
    client, mock_session, fake_org, authed_user
):
    mock_session.exec.side_effect = _exec_results(None)
    response = client.post(
        "/api/v1/courses/ghost/checkout",
        json=_STRIPE_BODY,
        headers={"Host": "localhost"},
    )
    assert response.status_code == 404


def test_checkout_400_when_course_is_free(client, mock_session, fake_org, authed_user):
    course = CourseFactory.build(
        slug="intro",
        org_id=fake_org.id,
        visibility=CourseVisibility.PUBLISHED,
        price_cents=None,
    )
    mock_session.exec.side_effect = _exec_results(course)
    response = client.post(
        "/api/v1/courses/intro/checkout",
        json=_STRIPE_BODY,
        headers={"Host": "localhost"},
    )
    assert response.status_code == 400


def test_checkout_400_when_org_has_no_account(
    client, mock_session, fake_org, authed_user
):
    course = CourseFactory.build(
        slug="paid",
        org_id=fake_org.id,
        visibility=CourseVisibility.PUBLISHED,
        price_cents=9900,
        currency="USD",
    )
    mock_session.exec.side_effect = _exec_results(course, None)
    response = client.post(
        "/api/v1/courses/paid/checkout",
        json=_STRIPE_BODY,
        headers={"Host": "localhost"},
    )
    assert response.status_code == 400


def test_checkout_409_when_already_enrolled(client, mock_session, fake_org, authed_user):
    course = CourseFactory.build(
        slug="paid",
        org_id=fake_org.id,
        visibility=CourseVisibility.PUBLISHED,
        price_cents=9900,
        currency="USD",
    )
    account = _stripe_account(fake_org)
    existing_enrollment = MagicMock()
    mock_session.exec.side_effect = _exec_results(course, account, existing_enrollment)
    response = client.post(
        "/api/v1/courses/paid/checkout",
        json=_STRIPE_BODY,
        headers={"Host": "localhost"},
    )
    assert response.status_code == 409


def test_checkout_creates_session_and_attempt(
    client, mock_session, fake_org, authed_user
):
    course = CourseFactory.build(
        slug="paid",
        title="Paid course",
        description="A great course",
        org_id=fake_org.id,
        visibility=CourseVisibility.PUBLISHED,
        price_cents=9900,
        currency="USD",
    )
    account = _stripe_account(fake_org, secret_plain="sk_test_tenant")
    mock_session.exec.side_effect = _exec_results(course, account, None)

    with patch("stripe.checkout.Session.create") as create:
        create.return_value = MagicMock(
            id="cs_test_123", url="https://checkout.stripe.com/pay/cs_test_123"
        )
        response = client.post(
            "/api/v1/courses/paid/checkout",
            json=_STRIPE_BODY,  # buyer chooses USD; same as course base → no PPP shift
            headers={"Host": "localhost"},
        )

    assert response.status_code == 200
    body = response.json()
    assert body["payload"]["kind"] == "stripe_redirect"
    assert body["payload"]["redirect_url"] == "https://checkout.stripe.com/pay/cs_test_123"

    call_kwargs = create.call_args.kwargs
    assert call_kwargs["api_key"] == "sk_test_tenant"
    assert "stripe_account" not in call_kwargs
    assert call_kwargs["mode"] == "payment"
    assert call_kwargs["line_items"][0]["price_data"]["unit_amount"] == 9900
    assert call_kwargs["line_items"][0]["price_data"]["currency"] == "usd"
    assert call_kwargs["line_items"][0]["price_data"]["product_data"]["name"] == "Paid course"
    assert call_kwargs["metadata"]["course_id"] == str(course.id)

    added = [c.args[0] for c in mock_session.add.call_args_list]
    payment_attempts = [obj for obj in added if hasattr(obj, "gateway_session_id")]
    assert len(payment_attempts) == 1
    assert payment_attempts[0].gateway_session_id == "cs_test_123"
    assert payment_attempts[0].status == PaymentStatus.PENDING
    assert payment_attempts[0].provider == PaymentProvider.STRIPE
    assert payment_attempts[0].amount_cents == 9900
    assert payment_attempts[0].currency == "USD"


def test_checkout_ppp_converts_when_buyer_currency_differs_from_course(
    client, mock_session, fake_org, authed_user
):
    """Buyer chooses INR for a USD-base course; backend PPP-converts so the
    Stripe Session and PaymentAttempt reflect the INR amount, not the USD one."""
    course = CourseFactory.build(
        slug="usd-base",
        title="USD-base course",
        description=None,
        org_id=fake_org.id,
        visibility=CourseVisibility.PUBLISHED,
        price_cents=2900,  # $29 base
        currency="USD",
    )
    account = _stripe_account(fake_org, secret_plain="sk_test_tenant")
    mock_session.exec.side_effect = _exec_results(course, account, None)

    with patch("stripe.checkout.Session.create") as create:
        create.return_value = MagicMock(id="cs_inr", url="https://checkout.stripe.com/pay/cs_inr")
        response = client.post(
            "/api/v1/courses/usd-base/checkout",
            json={
                "return_url_base": "http://acme.testholic.test:3000",
                "provider": "stripe",
                "currency": "INR",
            },
            headers={"Host": "localhost"},
        )

    assert response.status_code == 200
    # $29 USD = 2900 cents → PPP-converted to 188000 paise (₹1880).
    call_kwargs = create.call_args.kwargs
    assert call_kwargs["line_items"][0]["price_data"]["currency"] == "inr"
    assert call_kwargs["line_items"][0]["price_data"]["unit_amount"] == 188000

    added = [c.args[0] for c in mock_session.add.call_args_list]
    attempts = [obj for obj in added if hasattr(obj, "gateway_session_id")]
    assert attempts[0].amount_cents == 188000
    assert attempts[0].currency == "INR"


def test_checkout_razorpay_returns_modal_payload(
    client, mock_session, fake_org, authed_user
):
    course = CourseFactory.build(
        slug="paid-inr",
        title="INR course",
        description=None,
        org_id=fake_org.id,
        visibility=CourseVisibility.PUBLISHED,
        price_cents=49900,
        currency="INR",
    )
    account = OrgPaymentAccount(
        org_id=fake_org.id,
        provider=PaymentProvider.RAZORPAY,
        key_id="rzp_test_tenant",
        secret_key=encrypt("secret_rzp"),
    )
    mock_session.exec.side_effect = _exec_results(course, account, None)

    fake_order = {"id": "order_test_xyz", "status": "created"}
    with patch("razorpay.resources.order.Order.create") as create:
        create.return_value = fake_order
        response = client.post(
            "/api/v1/courses/paid-inr/checkout",
            json=_RAZORPAY_BODY,
            headers={"Host": "localhost"},
        )

    assert response.status_code == 200
    body = response.json()
    assert body["payload"]["kind"] == "razorpay_modal"
    assert body["payload"]["order_id"] == "order_test_xyz"
    assert body["payload"]["key_id"] == "rzp_test_tenant"
    assert body["payload"]["amount"] == 49900
    assert body["payload"]["currency"] == "INR"
    assert body["payload"]["success_redirect_url"].endswith(
        f"?payment_attempt={body['payment_attempt_id']}"
    )

    create_args = create.call_args.args[0]
    assert create_args["amount"] == 49900
    assert create_args["currency"] == "INR"
    assert create_args["notes"]["course_id"] == str(course.id)

    added = [c.args[0] for c in mock_session.add.call_args_list]
    payment_attempts = [obj for obj in added if hasattr(obj, "gateway_session_id")]
    assert len(payment_attempts) == 1
    assert payment_attempts[0].gateway_session_id == "order_test_xyz"
    assert payment_attempts[0].provider == PaymentProvider.RAZORPAY


# ---------- POST /payment-attempts/{id}/verify ----------


def test_verify_requires_authentication(client, mock_session, fake_org):
    response = client.post(
        f"/api/v1/payment-attempts/{uuid4()}/verify",
        headers={"Host": "localhost"},
    )
    assert response.status_code == 401


def test_verify_404_when_attempt_not_found(client, mock_session, fake_org, authed_user):
    mock_session.exec.side_effect = _exec_results(None)
    response = client.post(
        f"/api/v1/payment-attempts/{uuid4()}/verify",
        headers={"Host": "localhost"},
    )
    assert response.status_code == 404


def test_verify_400_when_account_disconnected(
    client, mock_session, fake_org, authed_user
):
    attempt = PaymentAttemptFactory.build(
        user_id=authed_user.id,
        org_id=fake_org.id,
        status=PaymentStatus.PENDING,
        provider=PaymentProvider.STRIPE,
    )
    # Tenant has since disconnected — account lookup returns None.
    mock_session.exec.side_effect = _exec_results(attempt, None)
    response = client.post(
        f"/api/v1/payment-attempts/{attempt.id}/verify",
        headers={"Host": "localhost"},
    )
    assert response.status_code == 400


def test_verify_marks_paid_and_grants_enrollment(
    client, mock_session, fake_org, authed_user
):
    attempt = PaymentAttemptFactory.build(
        user_id=authed_user.id,
        org_id=fake_org.id,
        status=PaymentStatus.PENDING,
        provider=PaymentProvider.STRIPE,
        gateway_session_id="cs_test_paid",
        amount_cents=9900,
        currency="USD",
    )
    account = _stripe_account(fake_org, secret_plain="sk_test_tenant")
    # exec order: attempt, account, enrollment (None), membership (None).
    mock_session.exec.side_effect = _exec_results(attempt, account, None, None)

    with patch("stripe.checkout.Session.retrieve") as retrieve:
        retrieve.return_value = MagicMock(payment_status="paid", status="complete")
        response = client.post(
            f"/api/v1/payment-attempts/{attempt.id}/verify",
            headers={"Host": "localhost"},
        )

    assert response.status_code == 200
    body = response.json()
    assert body["enrolled"] is True
    assert body["attempt"]["status"] == "paid"
    assert attempt.status == PaymentStatus.PAID
    retrieve.assert_called_once_with("cs_test_paid", api_key="sk_test_tenant")


def test_verify_idempotent_when_already_paid(
    client, mock_session, fake_org, authed_user
):
    attempt = PaymentAttemptFactory.build(
        user_id=authed_user.id,
        org_id=fake_org.id,
        status=PaymentStatus.PAID,
        provider=PaymentProvider.STRIPE,
    )
    existing_enrollment = MagicMock()
    mock_session.exec.side_effect = _exec_results(attempt, existing_enrollment)

    with patch("stripe.checkout.Session.retrieve") as retrieve:
        response = client.post(
            f"/api/v1/payment-attempts/{attempt.id}/verify",
            headers={"Host": "localhost"},
        )
    assert response.status_code == 200
    assert response.json()["enrolled"] is True
    # No Stripe API call needed — short-circuit fast path.
    retrieve.assert_not_called()


def test_verify_returns_not_enrolled_when_session_unpaid(
    client, mock_session, fake_org, authed_user
):
    attempt = PaymentAttemptFactory.build(
        user_id=authed_user.id,
        org_id=fake_org.id,
        status=PaymentStatus.PENDING,
        provider=PaymentProvider.STRIPE,
    )
    account = _stripe_account(fake_org)
    mock_session.exec.side_effect = _exec_results(attempt, account)

    with patch("stripe.checkout.Session.retrieve") as retrieve:
        retrieve.return_value = MagicMock(payment_status="unpaid", status="open")
        response = client.post(
            f"/api/v1/payment-attempts/{attempt.id}/verify",
            headers={"Host": "localhost"},
        )
    assert response.status_code == 200
    assert response.json()["enrolled"] is False
    assert attempt.status == PaymentStatus.PENDING


def test_verify_razorpay_marks_paid(client, mock_session, fake_org, authed_user):
    attempt = PaymentAttemptFactory.build(
        user_id=authed_user.id,
        org_id=fake_org.id,
        status=PaymentStatus.PENDING,
        provider=PaymentProvider.RAZORPAY,
        gateway_session_id="order_test_xyz",
        amount_cents=49900,
        currency="INR",
    )
    account = OrgPaymentAccount(
        org_id=fake_org.id,
        provider=PaymentProvider.RAZORPAY,
        key_id="rzp_test_tenant",
        secret_key=encrypt("secret_rzp"),
    )
    mock_session.exec.side_effect = _exec_results(attempt, account, None, None)

    with patch("razorpay.resources.order.Order.fetch") as fetch:
        fetch.return_value = {"id": "order_test_xyz", "status": "paid"}
        response = client.post(
            f"/api/v1/payment-attempts/{attempt.id}/verify",
            headers={"Host": "localhost"},
        )

    assert response.status_code == 200
    assert response.json()["enrolled"] is True
    assert attempt.status == PaymentStatus.PAID
    fetch.assert_called_once_with("order_test_xyz")
