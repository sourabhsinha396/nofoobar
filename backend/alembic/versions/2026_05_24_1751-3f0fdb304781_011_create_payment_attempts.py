"""011_create_payment_attempts

Revision ID: 3f0fdb304781
Revises: 7973e9988fe7
Create Date: 2026-05-24 17:51:25.567393

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
import sqlmodel


# revision identifiers, used by Alembic.
revision: str = '3f0fdb304781'
down_revision: Union[str, Sequence[str], None] = '7973e9988fe7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


payment_status_enum = postgresql.ENUM(
    'pending', 'paid', 'failed', 'canceled',
    name='payment_status',
    create_type=False,  # we manage creation/drop explicitly below
)


def upgrade() -> None:
    # Create the enum idempotently. checkfirst=True is unreliable under
    # asyncpg with partial-failure states, so use a DO block that swallows
    # duplicate_object. Once created, the column ref below uses it as-is.
    op.execute(
        """
        DO $$ BEGIN
            CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'failed', 'canceled');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
        """
    )
    op.create_table('payment_attempts',
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('user_id', sa.Uuid(), nullable=False),
    sa.Column('org_id', sa.Uuid(), nullable=False),
    sa.Column('course_id', sa.Uuid(), nullable=False),
    sa.Column('stripe_session_id', sqlmodel.sql.sqltypes.AutoString(length=255), nullable=False),
    sa.Column('status', payment_status_enum, server_default='pending', nullable=False),
    sa.Column('amount_cents', sa.Integer(), nullable=False),
    sa.Column('currency', sqlmodel.sql.sqltypes.AutoString(length=3), nullable=False),
    sa.ForeignKeyConstraint(['course_id'], ['courses.id'], ),
    sa.ForeignKeyConstraint(['org_id'], ['organizations.id'], ),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_payment_attempts_course_id'), 'payment_attempts', ['course_id'], unique=False)
    op.create_index(op.f('ix_payment_attempts_org_id'), 'payment_attempts', ['org_id'], unique=False)
    op.create_index(op.f('ix_payment_attempts_stripe_session_id'), 'payment_attempts', ['stripe_session_id'], unique=True)
    op.create_index(op.f('ix_payment_attempts_user_id'), 'payment_attempts', ['user_id'], unique=False)
    # ### end Alembic commands ###


def downgrade() -> None:
    op.drop_index(op.f('ix_payment_attempts_user_id'), table_name='payment_attempts')
    op.drop_index(op.f('ix_payment_attempts_stripe_session_id'), table_name='payment_attempts')
    op.drop_index(op.f('ix_payment_attempts_org_id'), table_name='payment_attempts')
    op.drop_index(op.f('ix_payment_attempts_course_id'), table_name='payment_attempts')
    op.drop_table('payment_attempts')
    op.execute("DROP TYPE IF EXISTS payment_status")
