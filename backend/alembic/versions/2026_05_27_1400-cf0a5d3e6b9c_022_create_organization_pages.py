"""022_create_organization_pages

Revision ID: cf0a5d3e6b9c
Revises: be9f4c2d5a8b
Create Date: 2026-05-27 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'cf0a5d3e6b9c'
down_revision: Union[str, Sequence[str], None] = 'be9f4c2d5a8b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "organization_pages",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "org_id",
            sa.Uuid(),
            sa.ForeignKey("organizations.id"),
            nullable=False,
        ),
        sa.Column("slug", sa.String(length=63), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column(
            "body",
            postgresql.JSONB(),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column(
            "kind",
            sa.Enum(
                "terms", "privacy", "refund", "contact", "custom",
                name="organization_page_kind",
            ),
            nullable=False,
        ),
        sa.Column(
            "is_published",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
        sa.Column(
            "show_in_footer",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
        sa.Column("footer_position", sa.Integer(), nullable=False, server_default="0"),
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
        sa.UniqueConstraint("org_id", "slug", name="uq_page_org_slug"),
    )
    op.create_index(
        "ix_organization_pages_org_id", "organization_pages", ["org_id"]
    )
    op.create_index(
        "ix_organization_pages_slug", "organization_pages", ["slug"]
    )


def downgrade() -> None:
    op.drop_index("ix_organization_pages_slug", table_name="organization_pages")
    op.drop_index("ix_organization_pages_org_id", table_name="organization_pages")
    op.drop_table("organization_pages")
    sa.Enum(name="organization_page_kind").drop(op.get_bind(), checkfirst=False)
