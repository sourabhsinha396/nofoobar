"""010_add_course_pricing

Revision ID: 7973e9988fe7
Revises: 15f2fd02d8b3
Create Date: 2026-05-24 17:49:07.737298

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision: str = '7973e9988fe7'
down_revision: Union[str, Sequence[str], None] = '15f2fd02d8b3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('courses', sa.Column('price_cents', sa.Integer(), nullable=True))
    # NOT NULL ADD COLUMN needs a server_default so existing rows backfill cleanly.
    op.add_column(
        'courses',
        sa.Column(
            'currency',
            sqlmodel.sql.sqltypes.AutoString(length=3),
            nullable=False,
            server_default='USD',
        ),
    )


def downgrade() -> None:
    op.drop_column('courses', 'currency')
    op.drop_column('courses', 'price_cents')
