from enum import StrEnum
from typing import TYPE_CHECKING
from uuid import UUID, uuid4

from sqlalchemy import Enum as SAEnum
from sqlalchemy import LargeBinary, UniqueConstraint
from sqlmodel import Field, Relationship

from app.core.encryption import decrypt
from app.db.models.common import TimestampedModel

if TYPE_CHECKING:
    from app.db.models.organization import Organization


class PaymentProvider(StrEnum):
    STRIPE = "stripe"
    RAZORPAY = "razorpay"


class OrgPaymentAccount(TimestampedModel, table=True):
    """A tenant's BYO payment-provider credentials.

    One row per (org, provider) pair. The tenant pastes their own provider keys
    (Stripe sk_*, Razorpay key_secret etc) into the admin UI; we encrypt the
    secret with the platform Fernet key before storing. The presence of a row
    means the tenant is ready to accept payments via that provider — no
    separate `enabled` flag.
    """

    __tablename__ = "org_payment_accounts"
    __table_args__ = (
        UniqueConstraint("org_id", "provider", name="uq_org_payment_account_org_provider"),
    )

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    org_id: UUID = Field(foreign_key="organizations.id", index=True)
    provider: PaymentProvider = Field(
        sa_type=SAEnum(
            PaymentProvider,
            name="payment_provider",
            values_callable=lambda enum: [m.value for m in enum],
        ),
    )
    # Public-ish identifier the provider issues alongside the secret. For
    # Stripe this is the publishable key (pk_*); for Razorpay the key_id (rzp_*).
    # Safe to expose to the frontend and surface in the UI as a sanity check.
    key_id: str = Field(max_length=255)
    # Fernet-encrypted secret (sk_* / key_secret). Never returned through the
    # API; decrypted only when calling the provider SDK.
    secret_key: bytes = Field(sa_type=LargeBinary)

    org: "Organization" = Relationship(back_populates="payment_accounts")

    @property
    def decrypted_secret_key(self) -> str:
        return decrypt(self.secret_key)
