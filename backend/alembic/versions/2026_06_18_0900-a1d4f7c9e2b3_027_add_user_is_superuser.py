"""027_add_user_is_superuser

Revision ID: a1d4f7c9e2b3
Revises: c3f9a2d18e4b
Create Date: 2026-06-18 09:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision: str = 'a1d4f7c9e2b3'
down_revision: Union[str, Sequence[str], None] = 'c3f9a2d18e4b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add users.is_superuser - platform staff flag, default false."""
    op.add_column(
        'users',
        sa.Column(
            'is_superuser',
            sa.Boolean(),
            server_default=sa.text('false'),
            nullable=False,
        ),
    )


def downgrade() -> None:
    op.drop_column('users', 'is_superuser')
