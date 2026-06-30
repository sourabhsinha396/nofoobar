
from datetime import UTC

import boto3
import pytest
from moto import mock_aws

from app.services.backup import pg, store

BUCKET = "test-bucket"


@pytest.fixture
def s3_bucket(monkeypatch):
    # moto intercepts boto3; point the backup client at an in-memory bucket and
    # neutralize the R2 endpoint so the path-style/s3v4 config still constructs.
    monkeypatch.setattr(store.settings, "S3_BUCKET", BUCKET)
    monkeypatch.setattr(store.settings, "S3_ENDPOINT_URL", None)
    monkeypatch.setattr(store.settings, "S3_ACCESS_KEY_ID", "test")
    monkeypatch.setattr(store.settings, "S3_SECRET_ACCESS_KEY", "test")
    monkeypatch.setattr(store.settings, "BACKUP_S3_PREFIX", "db_backups/")
    with mock_aws():
        client = boto3.client("s3", region_name="us-east-1")
        client.create_bucket(Bucket=BUCKET)
        yield client


def _put(client, key: str):
    client.put_object(Bucket=BUCKET, Key=key, Body=b"x")


def _keys(client) -> set[str]:
    resp = client.list_objects_v2(Bucket=BUCKET, Prefix="db_backups/")
    return {o["Key"] for o in resp.get("Contents", [])}


def test_upload_backup_lands_under_prefix(s3_bucket, tmp_path):
    dump = tmp_path / "nofoobar-2026-06-30-020000.dump"
    dump.write_bytes(b"PGDMP-fake")

    key = store.upload_backup(dump, client=s3_bucket)

    assert key == "db_backups/nofoobar-2026-06-30-020000.dump"
    assert key in _keys(s3_bucket)


def test_prune_keeps_n_newest_and_deletes_rest(s3_bucket):
    # Timestamped names sort chronologically; oldest three should be pruned.
    names = [
        "db_backups/nofoobar-2026-06-25-020000.dump",
        "db_backups/nofoobar-2026-06-26-020000.dump",
        "db_backups/nofoobar-2026-06-27-020000.dump",
        "db_backups/nofoobar-2026-06-28-020000.dump",
        "db_backups/nofoobar-2026-06-29-020000.dump",
    ]
    for n in names:
        _put(s3_bucket, n)

    deleted = store.prune_old_backups(keep=2, client=s3_bucket)

    assert set(deleted) == set(names[:3])
    assert _keys(s3_bucket) == set(names[3:])


def test_prune_noop_when_within_keep(s3_bucket):
    _put(s3_bucket, "db_backups/nofoobar-2026-06-29-020000.dump")
    deleted = store.prune_old_backups(keep=7, client=s3_bucket)
    assert deleted == []
    assert len(_keys(s3_bucket)) == 1


def test_prune_only_touches_its_prefix(s3_bucket):
    s3_bucket.put_object(Bucket=BUCKET, Key="uploads/images/keep.png", Body=b"x")
    _put(s3_bucket, "db_backups/nofoobar-2026-06-28-020000.dump")
    _put(s3_bucket, "db_backups/nofoobar-2026-06-29-020000.dump")

    store.prune_old_backups(keep=1, client=s3_bucket)

    # The image under uploads/ is untouched - prune is scoped to its prefix.
    resp = s3_bucket.list_objects_v2(Bucket=BUCKET)
    all_keys = {o["Key"] for o in resp.get("Contents", [])}
    assert "uploads/images/keep.png" in all_keys


def test_backup_filename_format(monkeypatch):
    from datetime import datetime

    monkeypatch.setattr(pg.settings, "POSTGRES_DB", "nofoobar")
    name = pg.backup_filename(datetime(2026, 6, 30, 2, 5, 9, tzinfo=UTC))
    assert name == "nofoobar-2026-06-30-020509.dump"


def test_prune_local_keeps_n_newest_and_deletes_rest(tmp_path, monkeypatch):
    monkeypatch.setattr(store.settings, "BACKUP_KEEP", 2)
    names = [
        "nofoobar-2026-06-25-020000.dump",
        "nofoobar-2026-06-26-020000.dump",
        "nofoobar-2026-06-27-020000.dump",
        "nofoobar-2026-06-28-020000.dump",
        "nofoobar-2026-06-29-020000.dump",
    ]
    for n in names:
        (tmp_path / n).write_bytes(b"x")

    deleted = store.prune_local_backups(tmp_path)

    assert len(deleted) == 3
    remaining = sorted(p.name for p in tmp_path.glob("*.dump"))
    assert remaining == names[3:]


def test_prune_local_only_touches_dump_files(tmp_path):
    (tmp_path / "notes.txt").write_text("keep me")
    (tmp_path / "nofoobar-2026-06-29-020000.dump").write_bytes(b"x")

    store.prune_local_backups(tmp_path, keep=0)

    assert (tmp_path / "notes.txt").exists()
    assert list(tmp_path.glob("*.dump")) == []
