from collections.abc import AsyncIterator
from typing import Any, Protocol
from uuid import UUID

from pydantic import BaseModel

from app.db.models.video_asset import VideoAssetStatus, VideoProviderName

__all__ = [
    "ProviderAsset",
    "UploadHandle",
    "UploadStatus",
    "VideoAssetStatus",
    "VideoProvider",
    "VideoProviderAPIError",
    "VideoProviderError",
    "VideoProviderName",
    "VideoProviderNotConfigured",
]


class VideoProviderError(Exception):
    """Base class for any failure in a video provider adapter."""


class VideoProviderNotConfigured(VideoProviderError):
    """Adapter was called but its credentials are not set in settings."""


class VideoProviderAPIError(VideoProviderError):
    """Provider returned a non-success response or the request failed."""


class UploadHandle(BaseModel):
    """Returned by create_upload(). Frontend uploads bytes to upload_url; the
    adapter records provider_upload_ref on the VideoAsset row so subsequent
    polls can correlate the resulting asset back to our DB row.
    """

    upload_url: str
    provider_upload_ref: str


class UploadStatus(BaseModel):
    """Pre-asset upload state. Some providers (Mux) have a distinct upload
    phase before an asset is created; this lets the polling endpoint check
    'has the upload graduated to an asset yet?' without needing an asset_ref.

    For providers where upload and asset share an identifier (Bunny, Cloudflare),
    the adapter returns provider_asset_ref equal to provider_upload_ref as soon
    as bytes are received."""

    provider_asset_ref: str | None
    is_errored: bool
    error_message: str | None = None


class ProviderAsset(BaseModel):
    """Snapshot of provider-side state for one asset. Returned by fetch_asset
    and list_assets. Status is normalized into VideoAssetStatus so callers
    don't need to know each provider's state machine."""

    provider_asset_ref: str
    playback_ref: str | None
    status: VideoAssetStatus
    duration_seconds: int | None = None
    max_resolution_height: int | None = None
    bytes: int | None = None
    metadata: dict[str, Any] = {}


class VideoProvider(Protocol):
    """Provider-agnostic interface for hosted video. Centralized credentials -
    each adapter reads from app.core.config.settings at instantiation. See
    docs/backend/video.md for the BYO-vs-centralized and polling-vs-webhooks
    rationale.

    Implementations live in app/services/video/<provider>_provider.py and are
    registered in app/services/video/registry.py. Routes resolve a provider via
    get_provider(name) and never import provider SDKs directly.
    """

    provider: VideoProviderName

    async def create_upload(self, *, org_id: UUID, video_asset_id: UUID) -> UploadHandle:
        """Mint a direct-upload URL. {org_id, video_asset_id} MUST be stamped
        into the provider's caller-controlled metadata (Mux passthrough,
        Cloudflare meta, Bunny metaTags) for reconciliation."""
        ...

    async def fetch_upload(self, *, provider_upload_ref: str) -> UploadStatus:
        """Check whether the upload has graduated to an asset yet. Called by
        the polling endpoint until UploadStatus.provider_asset_ref is non-null,
        at which point the route switches to fetch_asset()."""
        ...

    async def fetch_asset(self, *, provider_asset_ref: str) -> ProviderAsset:
        """Look up current provider-side state for one asset. Called by the
        polling endpoint after the upload graduates, and by the reconciliation
        sweep."""
        ...

    async def delete(self, *, provider_asset_ref: str) -> None:
        """Hard-delete on the provider. Idempotent - already-deleted is not an error."""
        ...

    async def list_assets(self) -> AsyncIterator[ProviderAsset]:
        """Page through every asset in the platform account. Used by the weekly
        reconciliation job to detect DB ↔ provider drift."""
        ...
