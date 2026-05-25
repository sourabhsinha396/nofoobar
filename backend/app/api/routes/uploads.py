from typing import Annotated

from fastapi import APIRouter, File, HTTPException, UploadFile, status

from app.api.deps import CurrentMembershipDep
from app.db.models.membership import Role
from app.schemas.upload import ImageUploadResponse
from app.services.storage import s3

router = APIRouter(prefix="/uploads", tags=["uploads"])

# Only authors (owner + instructor) can spend bucket quota. Students don't
# upload anything yet; if/when learner-submitted assets land, widen this.
_AUTHOR_ROLES = {Role.OWNER, Role.INSTRUCTOR}


@router.post("/image")
async def upload_image(
    membership: CurrentMembershipDep,
    file: Annotated[UploadFile, File()],
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
    # All image uploads go under "thumbnails" for now — course logos and (in
    # future) lesson covers, org logos. Add new categories alongside if/when
    # we expose new upload endpoints.
    key = s3.build_object_key("thumbnails", membership.org_id, ext)
    await s3.put_object(key, body, content_type)

    return ImageUploadResponse(public_url=s3.public_url_for(key))
