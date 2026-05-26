"""020_add_org_content_fields

Revision ID: ad8e3b1c4f7a
Revises: 9c5d2e3f4a6b
Create Date: 2026-05-27 11:00:00.000000

Adds tenant-facing content columns to `organizations`: tagline, footer_text,
contact_email, social_links (JSONB list of {platform, url}). These power the
admin "Brand & contact" page and downstream renderers (navbar, footer, course
landings). `primary_color` is intentionally left in place — it's being
dropped from the admin surface but the column stays until we're sure nothing
downstream still reads it.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'ad8e3b1c4f7a'
down_revision: Union[str, Sequence[str], None] = '9c5d2e3f4a6b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("organizations", sa.Column("tagline", sa.String(length=140), nullable=True))
    op.add_column("organizations", sa.Column("footer_text", sa.String(length=500), nullable=True))
    op.add_column(
        "organizations", sa.Column("contact_email", sa.String(length=255), nullable=True)
    )
    op.add_column(
        "organizations",
        sa.Column(
            "social_links",
            postgresql.JSONB(),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
    )


def downgrade() -> None:
    op.drop_column("organizations", "social_links")
    op.drop_column("organizations", "contact_email")
    op.drop_column("organizations", "footer_text")
    op.drop_column("organizations", "tagline")
