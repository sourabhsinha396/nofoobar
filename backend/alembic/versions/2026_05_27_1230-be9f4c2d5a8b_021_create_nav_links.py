"""021_create_nav_links

Revision ID: be9f4c2d5a8b
Revises: ad8e3b1c4f7a
Create Date: 2026-05-27 12:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'be9f4c2d5a8b'
down_revision: Union[str, Sequence[str], None] = 'ad8e3b1c4f7a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "organization_nav_links",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "org_id",
            sa.Uuid(),
            sa.ForeignKey("organizations.id"),
            nullable=False,
        ),
        sa.Column(
            "location",
            sa.Enum("header", "footer", name="nav_link_location"),
            nullable=False,
        ),
        sa.Column("label", sa.String(length=64), nullable=False),
        sa.Column("href", sa.String(length=2048), nullable=False),
        sa.Column(
            "open_in_new_tab",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("true"),
        ),
        sa.Column("position", sa.Integer(), nullable=False, server_default="0"),
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
        "ix_organization_nav_links_org_id",
        "organization_nav_links",
        ["org_id"],
    )
    op.create_index(
        "ix_nav_link_org_location_position",
        "organization_nav_links",
        ["org_id", "location", "position"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_nav_link_org_location_position", table_name="organization_nav_links"
    )
    op.drop_index(
        "ix_organization_nav_links_org_id", table_name="organization_nav_links"
    )
    op.drop_table("organization_nav_links")
    sa.Enum(name="nav_link_location").drop(op.get_bind(), checkfirst=False)
