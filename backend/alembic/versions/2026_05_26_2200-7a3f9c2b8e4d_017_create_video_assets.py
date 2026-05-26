"""017_create_video_assets

Revision ID: 7a3f9c2b8e4d
Revises: de9f3a62b148
Create Date: 2026-05-26 22:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '7a3f9c2b8e4d'
down_revision: Union[str, Sequence[str], None] = 'de9f3a62b148'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'video_assets',
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('org_id', sa.Uuid(), nullable=False),
        sa.Column(
            'provider',
            sa.Enum('mux', 'bunny', 'cloudflare', name='video_provider_name'),
            nullable=False,
        ),
        sa.Column('provider_upload_ref', sqlmodel.sql.sqltypes.AutoString(length=255), nullable=True),
        sa.Column('provider_asset_ref', sqlmodel.sql.sqltypes.AutoString(length=255), nullable=True),
        sa.Column('playback_ref', sqlmodel.sql.sqltypes.AutoString(length=255), nullable=True),
        sa.Column(
            'status',
            sa.Enum('pending', 'ready', 'errored', 'deleted', name='video_asset_status'),
            server_default='pending',
            nullable=False,
        ),
        sa.Column('duration_seconds', sa.Integer(), nullable=True),
        sa.Column('max_resolution_height', sa.Integer(), nullable=True),
        sa.Column('bytes', sa.BigInteger(), nullable=True),
        sa.Column('ready_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('provider_metadata', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.ForeignKeyConstraint(['org_id'], ['organizations.id'], ),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_video_assets_org_id'), 'video_assets', ['org_id'], unique=False)
    op.create_index(
        op.f('ix_video_assets_provider_asset_ref'),
        'video_assets',
        ['provider_asset_ref'],
        unique=False,
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_video_assets_provider_asset_ref'), table_name='video_assets')
    op.drop_index(op.f('ix_video_assets_org_id'), table_name='video_assets')
    op.drop_table('video_assets')
    sa.Enum(name='video_asset_status').drop(op.get_bind(), checkfirst=False)
    sa.Enum(name='video_provider_name').drop(op.get_bind(), checkfirst=False)
