"""024_add_slack_integration_provider

Revision ID: 308feadb14c5
Revises: 4fcbd295e066
Create Date: 2026-06-14 07:40:31.690355

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision: str = '308feadb14c5'
down_revision: Union[str, Sequence[str], None] = '4fcbd295e066'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add 'slack' to the integration_provider enum.

    Alembic autogenerate doesn't detect enum-value additions, so this is hand
    written. ALTER TYPE ... ADD VALUE can't run inside a transaction, so we step
    outside alembic's transactional DDL with an autocommit block.
    """
    with op.get_context().autocommit_block():
        op.execute("ALTER TYPE integration_provider ADD VALUE IF NOT EXISTS 'slack'")


def downgrade() -> None:
    """No-op: PostgreSQL can't drop a single enum value without recreating the
    type and rewriting every column that uses it. Leaving 'slack' in place is
    harmless - nothing references it once the slack provider is removed."""
    pass
