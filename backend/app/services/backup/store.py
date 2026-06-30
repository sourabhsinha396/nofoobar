"""Upload dumps to S3/R2 and enforce retention.

Backups share the uploads bucket but live under their own prefix and have a
distinct lifecycle, so this keeps its own thin client rather than reaching into
app/services/storage/s3.py. The retention logic mirrors the reference
cleanup_r2_backups: list the prefix, keep the N newest, delete the rest.
"""

from pathlib import Path

import boto3
from botocore.client import Config

from app.core.config import settings


def _client():
    # Same construction as app/services/storage/s3.py - s3v4 + path-style
    # addressing is what R2/MinIO and most S3-compatibles need.
    return boto3.client(
        "s3",
        endpoint_url=settings.S3_ENDPOINT_URL,
        aws_access_key_id=settings.S3_ACCESS_KEY_ID,
        aws_secret_access_key=settings.S3_SECRET_ACCESS_KEY,
        config=Config(signature_version="s3v4", s3={"addressing_style": "path"}),
    )


def _prefix() -> str:
    # Normalize to exactly one trailing slash so keys read `db_backups/<file>`.
    return settings.BACKUP_S3_PREFIX.rstrip("/") + "/"


def upload_backup(path: Path, client=None) -> str:
    """Upload a dump file and return its object key."""
    client = client or _client()
    key = f"{_prefix()}{path.name}"
    client.upload_file(
        str(path),
        settings.S3_BUCKET,
        key,
        ExtraArgs={"ContentType": "application/octet-stream"},
    )
    return key


def prune_old_backups(keep: int | None = None, client=None) -> list[str]:
    """Delete all but the `keep` newest dumps under the prefix.

    Sorted by (LastModified, Key) descending: LastModified is the provider's
    truth, and the timestamped key name breaks ties deterministically (two
    dumps in the same second still order by name). Returns the deleted keys.
    """
    keep = settings.BACKUP_KEEP if keep is None else keep
    client = client or _client()

    resp = client.list_objects_v2(Bucket=settings.S3_BUCKET, Prefix=_prefix())
    contents = resp.get("Contents", [])
    backups = sorted(contents, key=lambda o: (o["LastModified"], o["Key"]), reverse=True)

    to_delete = backups[keep:]
    for obj in to_delete:
        client.delete_object(Bucket=settings.S3_BUCKET, Key=obj["Key"])
    return [obj["Key"] for obj in to_delete]


def prune_local_backups(directory: Path, keep: int | None = None) -> list[str]:
    """Local-mode analog of prune_old_backups: keep the `keep` newest *.dump
    files in `directory`, delete the rest. Sorted by mtime with the timestamped
    filename as a tiebreaker. Returns the deleted paths.
    """
    keep = settings.BACKUP_KEEP if keep is None else keep
    dumps = sorted(
        (p for p in directory.glob("*.dump") if p.is_file()),
        key=lambda p: (p.stat().st_mtime, p.name),
        reverse=True,
    )
    to_delete = dumps[keep:]
    for path in to_delete:
        path.unlink(missing_ok=True)
    return [str(path) for path in to_delete]
