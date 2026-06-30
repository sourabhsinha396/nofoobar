from pathlib import Path

from app.services.backup import tasks


def _fake_dump_factory():
    def fake_dump(dest_dir):
        path = Path(dest_dir) / "nofoobar-2026-06-30-020000.dump"
        path.write_bytes(b"PGDMP")
        return path

    return fake_dump


def test_local_mode_writes_dump_and_skips_upload(monkeypatch, tmp_path):
    monkeypatch.setattr(tasks.settings, "RUNNING_LOCALALLY", True)
    monkeypatch.setattr(tasks.settings, "LOCAL_BACKUP_DIR", str(tmp_path / "db_backups"))
    monkeypatch.setattr(tasks.pg, "dump_to_file", _fake_dump_factory())

    def fail_upload(*args, **kwargs):
        raise AssertionError("upload_backup must not run when RUNNING_LOCALALLY is set")

    monkeypatch.setattr(tasks.store, "upload_backup", fail_upload)

    result = tasks.backup_database()

    assert result.endswith("nofoobar-2026-06-30-020000.dump")
    assert Path(result).exists()


def test_local_mode_applies_local_retention(monkeypatch, tmp_path):
    dest = tmp_path / "db_backups"
    monkeypatch.setattr(tasks.settings, "RUNNING_LOCALALLY", True)
    monkeypatch.setattr(tasks.settings, "LOCAL_BACKUP_DIR", str(dest))
    monkeypatch.setattr(tasks.settings, "BACKUP_KEEP", 1)
    monkeypatch.setattr(tasks.pg, "dump_to_file", _fake_dump_factory())
    monkeypatch.setattr(tasks.store, "upload_backup", lambda *a, **k: None)

    # Pre-seed an older dump; after a local backup with keep=1 it should be gone.
    dest.mkdir(parents=True)
    (dest / "nofoobar-2026-06-01-020000.dump").write_bytes(b"old")

    tasks.backup_database()

    remaining = sorted(p.name for p in dest.glob("*.dump"))
    assert remaining == ["nofoobar-2026-06-30-020000.dump"]
