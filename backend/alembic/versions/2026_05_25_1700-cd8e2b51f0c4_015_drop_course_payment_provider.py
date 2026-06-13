"""015_drop_course_payment_provider

Removes Course.payment_provider. After this migration, every connected
provider on the tenant is offered to the buyer at checkout - the creator no
longer chooses one per course. The `payment_provider` enum type stays in
place (still used by org_payment_accounts and payment_attempts).

Revision ID: cd8e2b51f0c4
Revises: bc7d1a409f25
Create Date: 2026-05-25 17:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'cd8e2b51f0c4'
down_revision: Union[str, Sequence[str], None] = 'bc7d1a409f25'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_column('courses', 'payment_provider')


def downgrade() -> None:
    op.add_column(
        'courses',
        sa.Column(
            'payment_provider',
            postgresql.ENUM('stripe', 'razorpay', name='payment_provider', create_type=False),
            nullable=True,
        ),
    )
