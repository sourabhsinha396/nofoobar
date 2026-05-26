"""018_add_lesson_visibility_duration_preview

Revision ID: 8b4c9d1e2f3a
Revises: 7a3f9c2b8e4d
Create Date: 2026-05-26 23:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '8b4c9d1e2f3a'
down_revision: Union[str, Sequence[str], None] = '7a3f9c2b8e4d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # sa.Enum() auto-creates types only on create_table. For ADD COLUMN we
    # have to create the type explicitly first, then reference it by name
    # (create_type=False) when adding the column.
    lesson_visibility = postgresql.ENUM(
        "draft", "published", name="lesson_visibility", create_type=False
    )
    lesson_visibility.create(op.get_bind(), checkfirst=True)

    op.add_column(
        "lessons",
        sa.Column(
            "visibility",
            sa.Enum("draft", "published", name="lesson_visibility", create_type=False),
            server_default="draft",
            nullable=False,
        ),
    )
    op.add_column("lessons", sa.Column("duration_seconds", sa.Integer(), nullable=True))
    op.add_column(
        "lessons",
        sa.Column(
            "is_free_preview",
            sa.Boolean(),
            server_default=sa.text("false"),
            nullable=False,
        ),
    )

    # Backfill duration_seconds from the JSONB content blob for video lessons
    # so existing rows keep their stored duration. Cast text → integer; NULL
    # entries fall through to NULL on the new column.
    op.execute(
        """
        UPDATE lessons
        SET duration_seconds = ((content->>'duration_seconds')::integer)
        WHERE content_type = 'video'
          AND content ? 'duration_seconds'
          AND content->>'duration_seconds' ~ '^[0-9]+$'
        """
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("lessons", "is_free_preview")
    op.drop_column("lessons", "duration_seconds")
    op.drop_column("lessons", "visibility")
    sa.Enum(name="lesson_visibility").drop(op.get_bind(), checkfirst=False)
