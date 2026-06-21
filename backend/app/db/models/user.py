from uuid import UUID, uuid4

from sqlalchemy import Enum as SAEnum
from sqlmodel import Field

from app.core.entitlements import PlanTier
from app.db.models.common import TimestampedModel


class User(TimestampedModel, table=True):
    __tablename__ = "users"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    email: str = Field(unique=True, index=True, max_length=320)
    password_hash: str = Field(max_length=255)
    name: str = Field(max_length=255)

    # The account's subscription tier. Entitlements (which integrations an org
    # can use, how many orgs the owner may create) derive from this; an org
    # inherits the plan of its owner. Existing rows default to free.
    plan: PlanTier = Field(
        default=PlanTier.FREE,
        sa_type=SAEnum(
            PlanTier,
            name="plan_tier",
            values_callable=lambda enum: [m.value for m in enum],
        ),
        sa_column_kwargs={"server_default": PlanTier.FREE.value, "nullable": False},
    )

    # Platform staff flag - true only for the nofoobar team. Superusers are
    # excluded from product analytics (e.g. PostHog on the marketing site) so
    # internal browsing doesn't pollute metrics. Existing rows default to false.
    is_superuser: bool = Field(
        default=False,
        sa_column_kwargs={"server_default": "false", "nullable": False},
    )
