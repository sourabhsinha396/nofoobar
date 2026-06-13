from datetime import datetime
from enum import StrEnum
from typing import Any
from uuid import UUID, uuid4

from sqlalchemy import BigInteger, DateTime
from sqlalchemy import Enum as SAEnum
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import Field, Relationship

from app.db.models.common import TimestampedModel
from app.db.models.organization import Organization


class VideoProviderName(StrEnum):
    """Hosted video providers we know how to talk to. Centralized credentials -
    one platform account per provider, configured via settings. See
    docs/backend/video.md for the BYO-vs-centralized rationale.
    """

    MUX = "mux"
    BUNNY = "bunny"
    CLOUDFLARE = "cloudflare"


class VideoAssetStatus(StrEnum):
    PENDING = "pending"
    READY = "ready"
    ERRORED = "errored"
    DELETED = "deleted"


class VideoAsset(TimestampedModel, table=True):
    """One row per asset a video provider holds on our behalf.

    `id` is the stable internal handle - Lesson and any other consumer references
    *this*, never the provider's opaque refs, so a future provider migration is a
    column rewrite rather than a schema/API change.
    """

    __tablename__ = "video_assets"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    org_id: UUID = Field(foreign_key="organizations.id", index=True)
    provider: VideoProviderName = Field(
        sa_type=SAEnum(
            VideoProviderName,
            name="video_provider_name",
            values_callable=lambda enum: [m.value for m in enum],
        ),
    )
    # Pre-processing handle. Mux returns this from POST /video/v1/uploads before
    # bytes arrive; null for providers that skip an explicit upload phase.
    provider_upload_ref: str | None = Field(default=None, max_length=255)
    # Post-processing handle. Mux asset_id, Bunny videoId, Cloudflare uid. Set by
    # the webhook handler once the provider reports the asset created.
    provider_asset_ref: str | None = Field(default=None, max_length=255, index=True)
    # What the frontend renders. For Mux this is the playback_id; for providers
    # where asset and playback collapse to one identifier this equals
    # provider_asset_ref.
    playback_ref: str | None = Field(default=None, max_length=255)
    status: VideoAssetStatus = Field(
        default=VideoAssetStatus.PENDING,
        sa_type=SAEnum(
            VideoAssetStatus,
            name="video_asset_status",
            values_callable=lambda enum: [m.value for m in enum],
        ),
        sa_column_kwargs={"server_default": VideoAssetStatus.PENDING.value},
    )
    duration_seconds: int | None = Field(default=None)
    max_resolution_height: int | None = Field(default=None)
    bytes: int | None = Field(default=None, sa_type=BigInteger)
    ready_at: datetime | None = Field(default=None, sa_type=DateTime(timezone=True))
    deleted_at: datetime | None = Field(default=None, sa_type=DateTime(timezone=True))
    # Provider-specific extras that don't justify their own column: HLS variant
    # list, thumbnail URL, MP4 renditions, captions tracks, etc.
    provider_metadata: dict[str, Any] = Field(default_factory=dict, sa_type=JSONB)

    org: Organization = Relationship()
