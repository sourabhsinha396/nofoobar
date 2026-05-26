import logging
from datetime import UTC, datetime
from uuid import UUID

from fastapi import APIRouter, HTTPException, status
from sqlmodel import select

from app.api.deps import CurrentMembershipDep, SessionDep
from app.db.models.video_asset import VideoAsset, VideoAssetStatus
from app.schemas.video import VideoAssetRead
from app.services.video.base import VideoProviderError
from app.services.video.registry import get_provider

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/video_assets", tags=["video_assets"])

# Terminal states — no point hitting the provider again, return cached DB row.
_TERMINAL_STATES = {VideoAssetStatus.READY, VideoAssetStatus.ERRORED, VideoAssetStatus.DELETED}


@router.get("/{video_asset_id}")
async def get_video_asset(
    video_asset_id: UUID,
    membership: CurrentMembershipDep,
    session: SessionDep,
) -> VideoAssetRead:
    asset = await _load_or_404(session, video_asset_id, membership.org_id)

    if asset.status not in _TERMINAL_STATES:
        await _refresh_from_provider(session, asset)

    return VideoAssetRead.model_validate(asset, from_attributes=True)


async def _load_or_404(session, video_asset_id: UUID, org_id: UUID) -> VideoAsset:
    result = await session.exec(
        select(VideoAsset).where(VideoAsset.id == video_asset_id, VideoAsset.org_id == org_id)
    )
    asset = result.first()
    if asset is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Video asset not found")
    return asset


async def _refresh_from_provider(session, asset: VideoAsset) -> None:
    """Pull current state from the provider and update the row in-place.

    Two phases:
    1. If no provider_asset_ref yet, the upload may still be in progress on the
       provider's side. fetch_upload tells us whether bytes arrived and an
       asset was created.
    2. Once we have a provider_asset_ref, fetch_asset reports transcoding state.

    Provider errors are logged and swallowed: returning current DB state lets
    the frontend keep polling. A real transient outage shouldn't fail the
    creator's lesson editor."""
    provider = get_provider(asset.provider)

    try:
        if asset.provider_asset_ref is None and asset.provider_upload_ref is not None:
            upload_status = await provider.fetch_upload(
                provider_upload_ref=asset.provider_upload_ref
            )
            if upload_status.is_errored:
                asset.status = VideoAssetStatus.ERRORED
                session.add(asset)
                await session.commit()
                return
            if upload_status.provider_asset_ref is None:
                return  # still waiting for bytes
            asset.provider_asset_ref = upload_status.provider_asset_ref
            # Fall through to fetch_asset with the freshly-graduated asset ref.

        if asset.provider_asset_ref is None:
            return  # nothing to fetch — shouldn't happen post-init

        provider_asset = await provider.fetch_asset(provider_asset_ref=asset.provider_asset_ref)
        asset.status = provider_asset.status
        asset.playback_ref = provider_asset.playback_ref
        asset.duration_seconds = provider_asset.duration_seconds
        asset.max_resolution_height = provider_asset.max_resolution_height
        if asset.status is VideoAssetStatus.READY and asset.ready_at is None:
            asset.ready_at = datetime.now(UTC)
        session.add(asset)
        await session.commit()
    except VideoProviderError:
        logger.exception("Failed to refresh video asset %s from provider", asset.id)
