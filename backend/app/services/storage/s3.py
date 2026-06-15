import asyncio
from typing import Literal
from uuid import UUID, uuid4

import boto3
from botocore.client import Config

from app.core.config import settings

# Domain-meaningful purposes for image uploads. Each value becomes a
# subdirectory under `uploads/images/`. Routes require callers to declare
# their purpose explicitly - no defaults - so we never end up with images
# leaking into a generic "thumbnails" bucket again.
#
# Adding a new image use case = add the literal here and reference it from
# the calling form. Keeps the namespace explicit and grep-able.
ImagePurpose = Literal[
    "organization_logo",
    "organization_og_image",
    "course_logo",
    "tiptap_inline",
]

# Allowed image upload extensions and their canonical Content-Type. The
# client claims a filename; we look up the extension here, fail closed on
# unknown types, and store the matching Content-Type on the object so it
# serves correctly later regardless of what the upload claimed.
ALLOWED_EXTS: dict[str, str] = {
    "png": "image/png",
    "jpg": "image/jpeg",
    "jpeg": "image/jpeg",
    "gif": "image/gif",
}

# 2 MB cap. Enforced server-side by reading the request body and refusing
# anything larger before pushing to R2.
MAX_UPLOAD_BYTES = 2 * 1024 * 1024


def is_configured() -> bool:
    return all(
        [
            settings.S3_ENDPOINT_URL,
            settings.S3_ACCESS_KEY_ID,
            settings.S3_SECRET_ACCESS_KEY,
            settings.S3_BUCKET,
            settings.S3_PUBLIC_URL_BASE,
        ]
    )


def _client():
    # boto3 signature_version="s3v4" is what R2/MinIO/most S3-compatibles
    # require. Path-style addressing keeps URLs predictable for non-AWS
    # endpoints where virtual-host-style DNS isn't set up.
    return boto3.client(
        "s3",
        endpoint_url=settings.S3_ENDPOINT_URL,
        aws_access_key_id=settings.S3_ACCESS_KEY_ID,
        aws_secret_access_key=settings.S3_SECRET_ACCESS_KEY,
        config=Config(signature_version="s3v4", s3={"addressing_style": "path"}),
    )


def normalize_extension(filename: str) -> str | None:
    if "." not in filename:
        return None
    ext = filename.rsplit(".", 1)[1].lower()
    return ext if ext in ALLOWED_EXTS else None


def build_image_key(purpose: ImagePurpose, org_id: UUID, ext: str) -> str:
    """Bucket layout: `uploads/images/<purpose>/<org_id>/<uuid>.<ext>`.

    The `uploads/images/` prefix is mandatory so future file types (docs,
    scripts) get their own siblings (`uploads/docs/…`, `uploads/scripts/…`)
    without polluting the image namespace. The `<purpose>` segment is
    semantic - grep `organization_logo` and you find every org-logo upload.
    """
    return f"uploads/images/{purpose}/{org_id}/{uuid4()}.{ext}"


def _put_object_sync(key: str, body: bytes, content_type: str) -> None:
    _client().put_object(
        Bucket=settings.S3_BUCKET,
        Key=key,
        Body=body,
        ContentType=content_type,
    )


async def put_object(key: str, body: bytes, content_type: str) -> None:
    # boto3 is sync - push into a thread so the FastAPI event loop stays
    # responsive while bytes upload to R2.
    await asyncio.to_thread(_put_object_sync, key, body, content_type)


def public_url_for(key: str) -> str:
    base = settings.S3_PUBLIC_URL_BASE.rstrip("/")
    return f"{base}/{key}"
