"""026_add_org_seo_fields

Revision ID: c3f9a2d18e4b
Revises: 8f8281058578
Create Date: 2026-06-15 09:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision: str = 'c3f9a2d18e4b'
down_revision: Union[str, Sequence[str], None] = '8f8281058578'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Additive, nullable SEO override columns - no backfill needed, empty
    # values fall back to existing display fields at render time.
    op.add_column('organizations', sa.Column('meta_title', sqlmodel.sql.sqltypes.AutoString(length=70), nullable=True))
    op.add_column('organizations', sa.Column('meta_description', sqlmodel.sql.sqltypes.AutoString(length=200), nullable=True))
    op.add_column('organizations', sa.Column('og_image_url', sqlmodel.sql.sqltypes.AutoString(length=500), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('organizations', 'og_image_url')
    op.drop_column('organizations', 'meta_description')
    op.drop_column('organizations', 'meta_title')
