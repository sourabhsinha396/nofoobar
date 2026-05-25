"""016_add_course_metadata

Adds Course.tags (TEXT[]), Course.logo_url (VARCHAR), Course.level (enum).
The level enum is created before the column is added (matches the pattern
in 008_add_course_visibility — ALTER TABLE ADD COLUMN can't auto-create an
enum type the way CREATE TABLE can).

Revision ID: de9f3a62b148
Revises: cd8e2b51f0c4
Create Date: 2026-05-25 18:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'de9f3a62b148'
down_revision: Union[str, Sequence[str], None] = 'cd8e2b51f0c4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


level_enum = postgresql.ENUM("beginner", "intermediate", "advanced", name="course_level")


def upgrade() -> None:
    level_enum.create(op.get_bind(), checkfirst=True)
    op.add_column(
        'courses',
        sa.Column('logo_url', sa.String(length=500), nullable=True),
    )
    op.add_column(
        'courses',
        sa.Column('level', level_enum, server_default='beginner', nullable=False),
    )
    op.add_column(
        'courses',
        sa.Column(
            'tags',
            postgresql.ARRAY(sa.String()),
            server_default='{}',
            nullable=False,
        ),
    )


def downgrade() -> None:
    op.drop_column('courses', 'tags')
    op.drop_column('courses', 'level')
    op.drop_column('courses', 'logo_url')
    level_enum.drop(op.get_bind(), checkfirst=False)
