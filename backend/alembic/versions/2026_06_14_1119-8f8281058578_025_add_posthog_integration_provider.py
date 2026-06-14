"""025_add_posthog_integration_provider

Revision ID: 8f8281058578
Revises: 308feadb14c5
Create Date: 2026-06-14 11:19:59.946558

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision: str = '8f8281058578'
down_revision: Union[str, Sequence[str], None] = '308feadb14c5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add 'posthog' to the integration_provider enum (hand-written: alembic
    doesn't autogenerate enum-value additions; ADD VALUE can't run inside a
    transaction, hence the autocommit block)."""
    with op.get_context().autocommit_block():
        op.execute("ALTER TYPE integration_provider ADD VALUE IF NOT EXISTS 'posthog'")


def downgrade() -> None:
    """No-op: PostgreSQL can't drop a single enum value without recreating the
    type. Leaving 'posthog' in place is harmless."""
    pass
