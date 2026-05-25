"""013_extract_payment_accounts

Replaces the single-provider Stripe fields on Organization with a generic
OrgPaymentAccount table (one row per (org, provider) pair). Also generalises
PaymentAttempt and adds Course.payment_provider so checkout can dispatch to
the right gateway per course.

Revision ID: a8c4e2f193b7
Revises: e02f9a0bff75
Create Date: 2026-05-25 14:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
import sqlmodel


# revision identifiers, used by Alembic.
revision: str = 'a8c4e2f193b7'
down_revision: Union[str, Sequence[str], None] = 'e02f9a0bff75'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


payment_provider_enum = postgresql.ENUM(
    'stripe', 'razorpay',
    name='payment_provider',
    create_type=False,
)


def upgrade() -> None:
    # 1. Create the payment_provider enum. DO block is idempotent (handoff
    #    note: checkfirst=True is unreliable under asyncpg with partial-failure
    #    states).
    op.execute(
        """
        DO $$ BEGIN
            CREATE TYPE payment_provider AS ENUM ('stripe', 'razorpay');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
        """
    )

    # 2. Create the org_payment_accounts table.
    op.create_table(
        'org_payment_accounts',
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('org_id', sa.Uuid(), nullable=False),
        sa.Column('provider', payment_provider_enum, nullable=False),
        sa.Column('external_account_id', sqlmodel.sql.sqltypes.AutoString(length=255), nullable=False),
        sa.Column('charges_enabled', sa.Boolean(), server_default='false', nullable=False),
        sa.ForeignKeyConstraint(['org_id'], ['organizations.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('org_id', 'provider', name='uq_org_payment_account_org_provider'),
    )
    op.create_index(
        op.f('ix_org_payment_accounts_org_id'), 'org_payment_accounts', ['org_id'], unique=False,
    )
    op.create_index(
        op.f('ix_org_payment_accounts_external_account_id'),
        'org_payment_accounts',
        ['external_account_id'],
        unique=True,
    )

    # 3. Backfill from the soon-to-be-dropped Organization columns. Inserts
    #    one row per org that has a Stripe account, preserving charges_enabled.
    op.execute(
        """
        INSERT INTO org_payment_accounts (
            id, org_id, provider, external_account_id, charges_enabled, created_at, updated_at
        )
        SELECT gen_random_uuid(), id, 'stripe'::payment_provider,
               stripe_account_id, stripe_charges_enabled, now(), now()
        FROM organizations
        WHERE stripe_account_id IS NOT NULL
        """
    )

    # 4. Drop the old per-provider columns on Organization.
    op.execute(
        "ALTER TABLE organizations DROP CONSTRAINT IF EXISTS organizations_stripe_account_id_key"
    )
    op.drop_column('organizations', 'stripe_charges_enabled')
    op.drop_column('organizations', 'stripe_account_id')

    # 5. Generalise payment_attempts.
    #    Add provider column with 'stripe' backfill, then drop the default so
    #    new rows must specify it explicitly.
    op.add_column(
        'payment_attempts',
        sa.Column('provider', payment_provider_enum, server_default='stripe', nullable=False),
    )
    op.alter_column('payment_attempts', 'provider', server_default=None)

    op.alter_column(
        'payment_attempts',
        'stripe_session_id',
        new_column_name='gateway_session_id',
    )
    op.execute(
        "ALTER INDEX ix_payment_attempts_stripe_session_id "
        "RENAME TO ix_payment_attempts_gateway_session_id"
    )

    # 6. Per-course payment provider selection. Nullable — null = free course
    #    (no checkout) or a paid course still pending provider assignment.
    op.add_column(
        'courses',
        sa.Column('payment_provider', payment_provider_enum, nullable=True),
    )


def downgrade() -> None:
    op.drop_column('courses', 'payment_provider')

    op.execute(
        "ALTER INDEX ix_payment_attempts_gateway_session_id "
        "RENAME TO ix_payment_attempts_stripe_session_id"
    )
    op.alter_column(
        'payment_attempts',
        'gateway_session_id',
        new_column_name='stripe_session_id',
    )
    op.drop_column('payment_attempts', 'provider')

    op.add_column(
        'organizations',
        sa.Column('stripe_account_id', sqlmodel.sql.sqltypes.AutoString(length=255), nullable=True),
    )
    op.add_column(
        'organizations',
        sa.Column('stripe_charges_enabled', sa.Boolean(), server_default='false', nullable=False),
    )
    op.create_unique_constraint(
        'organizations_stripe_account_id_key', 'organizations', ['stripe_account_id']
    )

    # Restore old Stripe columns from any surviving Stripe rows.
    op.execute(
        """
        UPDATE organizations SET
            stripe_account_id = sub.external_account_id,
            stripe_charges_enabled = sub.charges_enabled
        FROM (
            SELECT org_id, external_account_id, charges_enabled
            FROM org_payment_accounts WHERE provider = 'stripe'
        ) AS sub
        WHERE organizations.id = sub.org_id
        """
    )

    op.drop_index(op.f('ix_org_payment_accounts_external_account_id'), table_name='org_payment_accounts')
    op.drop_index(op.f('ix_org_payment_accounts_org_id'), table_name='org_payment_accounts')
    op.drop_table('org_payment_accounts')
    op.execute("DROP TYPE IF EXISTS payment_provider")
