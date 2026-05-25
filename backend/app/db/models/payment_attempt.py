from enum import StrEnum
from uuid import UUID, uuid4

from sqlalchemy import Enum as SAEnum
from sqlmodel import Field, Relationship

from app.db.models.common import TimestampedModel
from app.db.models.course import Course
from app.db.models.organization import Organization
from app.db.models.payment_account import PaymentProvider
from app.db.models.user import User


class PaymentStatus(StrEnum):
    PENDING = "pending"
    PAID = "paid"
    FAILED = "failed"
    CANCELED = "canceled"


class PaymentAttempt(TimestampedModel, table=True):
    """Audit log for hosted-checkout attempts across all payment providers.

    Created when a user starts checkout. Updated to `paid` either when the
    user lands on the success URL (synchronous verify path) or when the
    provider's webhook fires (server-side safety net). Both paths are
    idempotent and short-circuit if the attempt is already `paid`.

    We deliberately don't cascade-delete with Course or User — payment records
    are audit data and should outlive the entities they reference (with FK
    constraints that will block course deletion if attempts exist).
    """

    __tablename__ = "payment_attempts"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    user_id: UUID = Field(foreign_key="users.id", index=True)
    org_id: UUID = Field(foreign_key="organizations.id", index=True)
    course_id: UUID = Field(foreign_key="courses.id", index=True)
    provider: PaymentProvider = Field(
        sa_type=SAEnum(
            PaymentProvider,
            name="payment_provider",
            values_callable=lambda enum: [m.value for m in enum],
            # Reuse the enum created by the org_payment_accounts migration —
            # alembic raises DuplicateObject if we try to re-create it here.
            create_type=False,
        ),
    )
    # The provider's session/order id (Stripe checkout.Session.id, Razorpay
    # order_id, etc). Unique because we look it up from webhooks.
    gateway_session_id: str = Field(max_length=255, unique=True, index=True)
    status: PaymentStatus = Field(
        default=PaymentStatus.PENDING,
        sa_type=SAEnum(
            PaymentStatus,
            name="payment_status",
            values_callable=lambda enum: [m.value for m in enum],
        ),
        sa_column_kwargs={"server_default": PaymentStatus.PENDING.value},
    )
    amount_cents: int = Field(ge=0)
    currency: str = Field(max_length=3)

    user: User = Relationship()
    org: Organization = Relationship()
    course: Course = Relationship()
