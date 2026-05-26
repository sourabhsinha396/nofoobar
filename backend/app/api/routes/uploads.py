import logging
from typing import Annotated
from uuid import uuid4

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status

from app.api.deps import CurrentMembershipDep, SessionDep
from app.db.models.membership import Role
from app.db.models.video_asset import VideoAsset, VideoAssetStatus, VideoProviderName
from app.schemas.upload import ImageUploadResponse
from app.schemas.video import VideoUploadInitResponse
from app.services.storage import s3
from app.services.video import mux_provider
from app.services.video.base import VideoProviderError
from app.services.video.registry import get_provider

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/uploads", tags=["uploads"])

# Only authors (owner + instructor) can spend bucket quota. Students don't
# upload anything yet; if/when learner-submitted assets land, widen this.
_AUTHOR_ROLES = {Role.OWNER, Role.INSTRUCTOR}


@router.post("/image")
async def upload_image(
    membership: CurrentMembershipDep,
    file: Annotated[UploadFile, File()],
    # Required — no default. Callers must declare what the image is for so
    # the bucket path is meaningful (`uploads/images/<purpose>/…`) rather
    # than landing in a catchall.
    purpose: Annotated[s3.ImagePurpose, Form()],
) -> ImageUploadResponse:
    if membership.role not in _AUTHOR_ROLES:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN, "Only owners and instructors can upload images"
        )

    if not s3.is_configured():
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            "Image uploads aren't configured on this instance. Paste a URL instead.",
        )

    if not file.filename:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Missing filename.")

    ext = s3.normalize_extension(file.filename)
    if ext is None:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            f"Unsupported file type. Allowed: {', '.join(sorted(s3.ALLOWED_EXTS))}.",
        )

    body = await file.read()
    if len(body) > s3.MAX_UPLOAD_BYTES:
        mb = s3.MAX_UPLOAD_BYTES // (1024 * 1024)
        raise HTTPException(
            status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            f"File too large. Max {mb} MB.",
        )

    content_type = s3.ALLOWED_EXTS[ext]
    key = s3.build_image_key(purpose, membership.org_id, ext)
    await s3.put_object(key, body, content_type)

    return ImageUploadResponse(public_url=s3.public_url_for(key))


@router.post("/video")
async def initiate_video_upload(
    membership: CurrentMembershipDep,
    session: SessionDep,
) -> VideoUploadInitResponse:
    if membership.role not in _AUTHOR_ROLES:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN, "Only owners and instructors can upload videos"
        )

    # Single-provider v1. Future: read from org settings or a platform default.
    provider_name = VideoProviderName.MUX

    if not mux_provider.is_configured():
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            "Video uploads aren't configured on this instance. Paste a URL instead.",
        )

    # Generate the asset id up-front so the adapter can stamp it into the
    # provider's passthrough metadata before the DB row exists. If row insert
    # later fails, the pending-stuck sweeper catches the orphan via passthrough.
    video_asset_id = uuid4()
    provider = get_provider(provider_name)

    try:
        handle = await provider.create_upload(
            org_id=membership.org_id, video_asset_id=video_asset_id
        )
    except VideoProviderError as exc:
        logger.exception("create_upload failed for provider=%s", provider_name)
        raise HTTPException(
            status.HTTP_502_BAD_GATEWAY, f"Upload provider error: {exc}"
        ) from exc

    asset = VideoAsset(
        id=video_asset_id,
        org_id=membership.org_id,
        provider=provider_name,
        provider_upload_ref=handle.provider_upload_ref,
        status=VideoAssetStatus.PENDING,
    )
    session.add(asset)
    await session.commit()

    return VideoUploadInitResponse(
        video_asset_id=video_asset_id,
        upload_url=handle.upload_url,
        provider=provider_name,
    )
