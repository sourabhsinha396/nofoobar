"""019_create_organization_homepage_blocks

Revision ID: 9c5d2e3f4a6b
Revises: 8b4c9d1e2f3a
Create Date: 2026-05-27 09:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '9c5d2e3f4a6b'
down_revision: Union[str, Sequence[str], None] = '8b4c9d1e2f3a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "organization_homepage_blocks",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "org_id",
            sa.Uuid(),
            sa.ForeignKey("organizations.id"),
            nullable=False,
        ),
        sa.Column(
            "type",
            sa.Enum(
                "hero",
                "stats",
                "featured_courses",
                "testimonials",
                "faqs",
                name="homepage_block_type",
            ),
            nullable=False,
        ),
        sa.Column("position", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "config",
            postgresql.JSONB(),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column(
            "is_enabled",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("true"),
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index(
        "ix_organization_homepage_blocks_org_id",
        "organization_homepage_blocks",
        ["org_id"],
    )
    op.create_index(
        "ix_homepage_block_org_position",
        "organization_homepage_blocks",
        ["org_id", "position"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_homepage_block_org_position", table_name="organization_homepage_blocks"
    )
    op.drop_index(
        "ix_organization_homepage_blocks_org_id",
        table_name="organization_homepage_blocks",
    )
    op.drop_table("organization_homepage_blocks")
    sa.Enum(name="homepage_block_type").drop(op.get_bind(), checkfirst=False)
