from uuid import UUID

from sqlmodel import SQLModel

from app.db.models.video_asset import VideoAssetStatus, VideoProviderName


class VideoUploadInitResponse(SQLModel):
    """Returned by POST /uploads/video. Frontend uploads bytes to upload_url,
    then polls GET /video_assets/{video_asset_id} until status is terminal."""

    video_asset_id: UUID
    upload_url: str
    provider: VideoProviderName


class VideoAssetRead(SQLModel):
    """Polling response from GET /video_assets/{id}. While status is pending,
    poll again in 2-5s. When status is ready, render the player using
    playback_ref. When errored, surface a friendly retry UI."""

    id: UUID
    provider: VideoProviderName
    status: VideoAssetStatus
    playback_ref: str | None = None
    duration_seconds: int | None = None
    max_resolution_height: int | None = None
