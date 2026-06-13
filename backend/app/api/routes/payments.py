import logging
import re
from urllib.parse import urlparse
from uuid import UUID, uuid4

from fastapi import APIRouter, HTTPException, Response, status
from sqlmodel import select

from app.api.deps import CurrentMembershipDep, CurrentOrgDep, CurrentUserDep, SessionDep
from app.core.config import settings
from app.core.encryption import EncryptionError, encrypt
from app.core.pricing import Currency, convert_ppp_cents
from app.db.models.course import Course, CourseVisibility
from app.db.models.enrollment import Enrollment
from app.db.models.membership import Role, UserOrgMembership
from app.db.models.organization import Organization
from app.db.models.payment_account import OrgPaymentAccount, PaymentProvider
from app.db.models.payment_attempt import PaymentAttempt, PaymentStatus
from app.schemas.payment import (
    CheckoutRequest,
    CheckoutResponse,
    PaymentAccountCredentials,
    PaymentAccountSummary,
    RazorpayModalPayload,
    StripeRedirectPayload,
    VerifyResponse,
)
from app.services.payments.base import GatewayCredentials, PaymentGateway
from app.services.payments.registry import get_gateway

logger = logging.getLogger(__name__)

router = APIRouter(tags=["payments"])

_OWNER_ROLES = {Role.OWNER}


def _ensure_owner(membership: UserOrgMembership, action: str) -> None:
    if membership.role not in _OWNER_ROLES:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN, f"Only the org owner can {action}."
        )


def _ensure_org_slug_matches(org: CurrentOrgDep, expected_slug: str) -> None:
    if org.slug != expected_slug:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Org not found")


def _validate_origin(url: str, org: Organization) -> None:
    """Reject URLs whose origin (scheme://host[:port]) is neither a platform
    domain (CORS regex) nor the org's own custom domain (https, exact host)."""
    parsed = urlparse(url)
    origin = f"{parsed.scheme}://{parsed.netloc}"
    if re.match(settings.CORS_ORIGIN_REGEX, origin):
        return
    if org.custom_domain and origin == f"https://{org.custom_domain}":
        return
    raise HTTPException(
        status.HTTP_400_BAD_REQUEST, "URL must match an allowed origin."
    )


async def _grant_enrollment_idempotent(
    session: SessionDep, user_id: UUID, org_id: UUID, course_id: UUID
) -> bool:
    """Create enrollment + student membership if not already present."""
    existing_result = await session.exec(
        select(Enrollment)
        .where(Enrollment.user_id == user_id)
        .where(Enrollment.course_id == course_id)
    )
    if existing_result.first() is not None:
        return False

    membership_result = await session.exec(
        select(UserOrgMembership)
        .where(UserOrgMembership.user_id == user_id)
        .where(UserOrgMembership.org_id == org_id)
    )
    if membership_result.first() is None:
        session.add(UserOrgMembership(user_id=user_id, org_id=org_id, role=Role.STUDENT))

    session.add(Enrollment(user_id=user_id, org_id=org_id, course_id=course_id))
    return True


async def _get_payment_account(
    session: SessionDep, org_id: UUID, provider: PaymentProvider
) -> OrgPaymentAccount | None:
    result = await session.exec(
        select(OrgPaymentAccount)
        .where(OrgPaymentAccount.org_id == org_id)
        .where(OrgPaymentAccount.provider == provider)
    )
    return result.first()


def _credentials_for(account: OrgPaymentAccount) -> GatewayCredentials:
    """Decrypt the stored secret and bundle into the gateway DTO."""
    try:
        return GatewayCredentials(
            key_id=account.key_id, secret_key=account.decrypted_secret_key
        )
    except EncryptionError as exc:
        # Most likely cause: SECRETS_ENCRYPTION_KEY was rotated. The tenant
        # needs to re-enter their credentials.
        logger.error("Failed to decrypt secret for account %s: %s", account.id, exc)
        raise HTTPException(
            status.HTTP_500_INTERNAL_SERVER_ERROR,
            "Stored payment credentials can't be decrypted. The tenant needs to re-enter them.",
        ) from exc


# ---------- GET /api/v1/orgs/{slug}/payment-accounts ----------


@router.get("/orgs/{org_slug}/payment-accounts")
async def list_payment_accounts(
    org_slug: str,
    membership: CurrentMembershipDep,
    org: CurrentOrgDep,
    session: SessionDep,
) -> list[PaymentAccountSummary]:
    _ensure_owner(membership, "view payment accounts")
    _ensure_org_slug_matches(org, org_slug)

    result = await session.exec(
        select(OrgPaymentAccount).where(OrgPaymentAccount.org_id == org.id)
    )
    return [
        PaymentAccountSummary(provider=a.provider, key_id=a.key_id)
        for a in result.all()
    ]


# ---------- PUT /api/v1/orgs/{slug}/payment-accounts/{provider} ----------


@router.put("/orgs/{org_slug}/payment-accounts/{provider}")
async def upsert_payment_account(
    org_slug: str,
    provider: PaymentProvider,
    payload: PaymentAccountCredentials,
    membership: CurrentMembershipDep,
    org: CurrentOrgDep,
    session: SessionDep,
) -> PaymentAccountSummary:
    _ensure_owner(membership, f"connect {provider.value}")
    _ensure_org_slug_matches(org, org_slug)

    gateway: PaymentGateway = get_gateway(provider)
    candidate = GatewayCredentials(key_id=payload.key_id, secret_key=payload.secret_key)
    if not gateway.verify_credentials(credentials=candidate):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"{provider.value} rejected the supplied credentials. Double-check the key id and secret.",
        )

    existing = await _get_payment_account(session, org.id, provider)
    if existing is None:
        account = OrgPaymentAccount(
            org_id=org.id,
            provider=provider,
            key_id=payload.key_id,
            secret_key=encrypt(payload.secret_key),
        )
        session.add(account)
    else:
        existing.key_id = payload.key_id
        existing.secret_key = encrypt(payload.secret_key)
        account = existing

    await session.commit()
    return PaymentAccountSummary(provider=account.provider, key_id=account.key_id)


# ---------- DELETE /api/v1/orgs/{slug}/payment-accounts/{provider} ----------


@router.delete(
    "/orgs/{org_slug}/payment-accounts/{provider}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_payment_account(
    org_slug: str,
    provider: PaymentProvider,
    membership: CurrentMembershipDep,
    org: CurrentOrgDep,
    session: SessionDep,
) -> Response:
    _ensure_owner(membership, f"disconnect {provider.value}")
    _ensure_org_slug_matches(org, org_slug)

    account = await _get_payment_account(session, org.id, provider)
    if account is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"No {provider.value} account connected.")

    await session.delete(account)
    await session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ---------- POST /api/v1/courses/{slug}/checkout ----------


def _validate_provider_currency(provider: PaymentProvider, currency: Currency) -> None:
    """Razorpay accounts default to INR-only. Most tenant accounts won't have
    international payments enabled, and we can't detect it from the keys -
    so refuse non-INR Razorpay checkouts at the API boundary."""
    if provider is PaymentProvider.RAZORPAY and currency != "INR":
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Razorpay only supports INR. Pick a different currency or use Stripe.",
        )


@router.post("/courses/{course_slug}/checkout")
async def create_checkout_session(
    course_slug: str,
    payload: CheckoutRequest,
    user: CurrentUserDep,
    org: CurrentOrgDep,
    session: SessionDep,
) -> CheckoutResponse:
    _validate_origin(str(payload.return_url_base), org)
    _validate_provider_currency(payload.provider, payload.currency)

    course_result = await session.exec(
        select(Course)
        .where(Course.org_id == org.id)
        .where(Course.slug == course_slug)
        .where(Course.visibility == CourseVisibility.PUBLISHED)
    )
    course = course_result.first()
    if course is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"No course with slug {course_slug!r}")
    if not course.price_cents:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "This course is free; use POST /enroll instead.",
        )

    gateway = get_gateway(payload.provider)

    account = await _get_payment_account(session, org.id, payload.provider)
    if account is None:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"This organization hasn't connected {payload.provider.value} yet.",
        )

    enrollment_result = await session.exec(
        select(Enrollment)
        .where(Enrollment.user_id == user.id)
        .where(Enrollment.course_id == course.id)
    )
    if enrollment_result.first() is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "You're already enrolled.")

    # PPP-convert the course's base price into the buyer's chosen currency.
    # The course's own currency is the creator-authoring baseline; what
    # actually gets charged is what we compute here and pass to the gateway.
    buyer_amount_cents = convert_ppp_cents(
        course.price_cents, course.currency, payload.currency
    )

    attempt_id = uuid4()
    return_base = str(payload.return_url_base).rstrip("/")
    course_path = f"/courses/{course.slug}"
    success_redirect_url = f"{return_base}{course_path}?payment_attempt={attempt_id}"
    cancel_redirect_url = f"{return_base}{course_path}"

    checkout = gateway.create_checkout_session(
        credentials=_credentials_for(account),
        amount_cents=buyer_amount_cents,
        currency=payload.currency,
        product_name=course.title,
        product_description=course.description,
        user_email=user.email,
        success_url=success_redirect_url,
        cancel_url=cancel_redirect_url,
        metadata={
            "payment_attempt_id": str(attempt_id),
            "user_id": str(user.id),
            "org_id": str(org.id),
            "course_id": str(course.id),
        },
    )

    attempt = PaymentAttempt(
        id=attempt_id,
        user_id=user.id,
        org_id=org.id,
        course_id=course.id,
        provider=payload.provider,
        gateway_session_id=checkout.external_session_id,
        status=PaymentStatus.PENDING,
        amount_cents=buyer_amount_cents,
        currency=payload.currency,
    )
    session.add(attempt)
    await session.commit()

    # Per-provider response shape: Stripe gives a redirect URL, Razorpay needs
    # enough info for the frontend to open its JS modal.
    if payload.provider is PaymentProvider.STRIPE:
        if checkout.redirect_url is None:
            raise HTTPException(
                status.HTTP_502_BAD_GATEWAY, "Stripe gateway returned no redirect URL."
            )
        return CheckoutResponse(
            payment_attempt_id=attempt_id,
            payload=StripeRedirectPayload(redirect_url=checkout.redirect_url),
        )

    return CheckoutResponse(
        payment_attempt_id=attempt_id,
        payload=RazorpayModalPayload(
            order_id=checkout.external_session_id,
            key_id=account.key_id,
            amount=buyer_amount_cents,
            currency=payload.currency,
            success_redirect_url=success_redirect_url,
        ),
    )


# ---------- POST /api/v1/payment-attempts/{id}/verify ----------


@router.post("/payment-attempts/{attempt_id}/verify")
async def verify_payment_attempt(
    attempt_id: UUID,
    user: CurrentUserDep,
    org: CurrentOrgDep,
    session: SessionDep,
) -> VerifyResponse:
    attempt_result = await session.exec(
        select(PaymentAttempt)
        .where(PaymentAttempt.id == attempt_id)
        .where(PaymentAttempt.user_id == user.id)
        .where(PaymentAttempt.org_id == org.id)
    )
    attempt = attempt_result.first()
    if attempt is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Payment attempt not found")

    if attempt.status == PaymentStatus.PAID:
        # Buyer hit the success URL but already enrolled - re-grant is a no-op.
        enrollment_created = await _grant_enrollment_idempotent(
            session, attempt.user_id, attempt.org_id, attempt.course_id
        )
        if enrollment_created:
            await session.commit()
        return VerifyResponse(attempt=attempt, enrolled=True)

    gateway = get_gateway(attempt.provider)
    account = await _get_payment_account(session, attempt.org_id, attempt.provider)
    if account is None:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"Tenant {attempt.provider.value} account is no longer connected.",
        )

    checkout_status = gateway.retrieve_checkout_status(
        credentials=_credentials_for(account),
        external_session_id=attempt.gateway_session_id,
    )

    if checkout_status.paid:
        attempt.status = PaymentStatus.PAID
        await _grant_enrollment_idempotent(
            session, attempt.user_id, attempt.org_id, attempt.course_id
        )
        await session.commit()
        await session.refresh(attempt)
        return VerifyResponse(attempt=attempt, enrolled=True)

    if checkout_status.expired:
        attempt.status = PaymentStatus.FAILED
        await session.commit()
        await session.refresh(attempt)

    return VerifyResponse(attempt=attempt, enrolled=False)
