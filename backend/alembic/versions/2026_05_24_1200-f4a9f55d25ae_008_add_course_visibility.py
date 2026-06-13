"""008_add_course_visibility

Revision ID: f4a9f55d25ae
Revises: 5f7d7231e9df
Create Date: 2026-05-24 12:00:50.076216

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'f4a9f55d25ae'
down_revision: Union[str, Sequence[str], None] = '5f7d7231e9df'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


visibility_enum = postgresql.ENUM("draft", "published", name="course_visibility")


def upgrade() -> None:
    # ALTER TABLE ADD COLUMN can't auto-create the enum type the way CREATE TABLE
    # can - create it explicitly before referencing it.
    visibility_enum.create(op.get_bind(), checkfirst=True)
    op.add_column(
        'courses',
        sa.Column('visibility', visibility_enum, server_default='draft', nullable=False),
    )


def downgrade() -> None:
    op.drop_column('courses', 'visibility')
    visibility_enum.drop(op.get_bind(), checkfirst=False)
