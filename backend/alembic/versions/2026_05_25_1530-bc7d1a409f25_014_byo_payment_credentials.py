"""014_byo_payment_credentials

Switches OrgPaymentAccount from Stripe-Connect-style account references to
tenant-provided API keys (BYO model). The Stripe Connect onboarding flow goes
away entirely; tenants paste their own provider keys into the admin UI and we
encrypt the secret at rest.

Revision ID: bc7d1a409f25
Revises: a8c4e2f193b7
Create Date: 2026-05-25 15:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'bc7d1a409f25'
down_revision: Union[str, Sequence[str], None] = 'a8c4e2f193b7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Wipe existing rows. They held Stripe Connect account ids from the
    # IN-locked test platform - meaningless under BYO. NOT NULL on secret_key
    # would otherwise fail.
    op.execute("DELETE FROM org_payment_accounts")

    # `charges_enabled` was meaningful for Stripe Connect (Stripe reports it
    # via account.updated). Under BYO, presence of the row IS the readiness
    # signal - drop the column.
    op.drop_column('org_payment_accounts', 'charges_enabled')

    # Rename external_account_id → key_id. New semantics: this is the
    # provider's public key (Stripe pk_*, Razorpay rzp_*), not an account id.
    op.drop_index(
        op.f('ix_org_payment_accounts_external_account_id'),
        table_name='org_payment_accounts',
    )
    op.alter_column(
        'org_payment_accounts',
        'external_account_id',
        new_column_name='key_id',
    )

    # The encrypted secret (Stripe sk_*, Razorpay key_secret) - stored as
    # opaque Fernet ciphertext.
    op.add_column('org_payment_accounts', sa.Column('secret_key', sa.LargeBinary(), nullable=False))


def downgrade() -> None:
    op.drop_column('org_payment_accounts', 'secret_key')
    op.alter_column(
        'org_payment_accounts',
        'key_id',
        new_column_name='external_account_id',
    )
    op.create_index(
        op.f('ix_org_payment_accounts_external_account_id'),
        'org_payment_accounts',
        ['external_account_id'],
        unique=True,
    )
    op.add_column(
        'org_payment_accounts',
        sa.Column('charges_enabled', sa.Boolean(), server_default='false', nullable=False),
    )
