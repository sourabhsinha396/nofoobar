from datetime import datetime
from typing import Annotated, Literal
from uuid import UUID

from pydantic import BaseModel, Discriminator, Field, HttpUrl, StringConstraints
from sqlmodel import SQLModel

from app.db.models.payment_account import PaymentProvider
from app.db.models.payment_attempt import PaymentStatus
from app.schemas.course import Currency

# ---------- Payment account credentials (BYO keys) ----------


class PaymentAccountCredentials(BaseModel):
    """Tenant input — what gets pasted into the admin settings UI."""

    key_id: Annotated[str, StringConstraints(min_length=1, max_length=255)]
    secret_key: Annotated[str, StringConstraints(min_length=1, max_length=512)]


class PaymentAccountSummary(BaseModel):
    """Tenant-facing projection. Never includes the secret."""

    provider: PaymentProvider
    key_id: str


# ---------- Checkout ----------


class CheckoutRequest(BaseModel):
    return_url_base: HttpUrl
    provider: PaymentProvider
    currency: Currency


class StripeRedirectPayload(BaseModel):
    """Stripe Hosted Checkout — the frontend sets window.location.href to redirect_url."""

    kind: Literal["stripe_redirect"] = "stripe_redirect"
    redirect_url: str


class RazorpayModalPayload(BaseModel):
    """Razorpay JS modal — the frontend loads checkout.razorpay.com/v1/checkout.js
    and calls `new Razorpay({...}).open()` with these fields."""

    kind: Literal["razorpay_modal"] = "razorpay_modal"
    order_id: str
    key_id: str
    amount: int  # smallest currency unit (paise for INR)
    currency: str
    success_redirect_url: str  # where to navigate after the modal's success callback fires


CheckoutPayload = Annotated[
    StripeRedirectPayload | RazorpayModalPayload,
    Discriminator("kind"),
]


class CheckoutResponse(BaseModel):
    payment_attempt_id: UUID
    payload: CheckoutPayload


# ---------- PaymentAttempt ----------


class PaymentAttemptPublic(SQLModel):
    id: UUID
    user_id: UUID
    org_id: UUID
    course_id: UUID
    provider: PaymentProvider
    gateway_session_id: str
    status: PaymentStatus
    amount_cents: Annotated[int, Field(ge=0)]
    currency: str
    created_at: datetime


class VerifyResponse(BaseModel):
    attempt: PaymentAttemptPublic
    enrolled: bool
