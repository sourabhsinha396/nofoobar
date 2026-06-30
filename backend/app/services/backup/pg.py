"""Produce a Postgres dump on disk with pg_dump.

Uses custom format (-Fc): compressed and restorable selectively with
pg_restore, a step up from the plain-SQL-plus-gzip the reference setup
produced. The worker image ships pg_dump 17 to match the server (see
Dockerfile); a version mismatch makes pg_dump refuse to run.
"""

import os
import subprocess
from datetime import UTC, datetime
from pathlib import Path
from tempfile import gettempdir

from app.core.config import settings


def backup_filename(now: datetime | None = None) -> str:
    # `<db>-YYYY-MM-DD-HHMMSS.dump`. The timestamp is UTC and zero-padded so
    # the keys also sort lexicographically by age - which the prune step relies
    # on as a tiebreaker. Mirrors the reference DBBACKUP_DATE_FORMAT.
    now = now or datetime.now(UTC)
    return f"{settings.POSTGRES_DB}-{now.strftime('%Y-%m-%d-%H%M%S')}.dump"


def dump_to_file(dest_dir: Path | None = None) -> Path:
    """Run pg_dump and return the path to the written dump file.

    Raises CalledProcessError if pg_dump exits non-zero, so the caller (and the
    Celery task's autoretry) sees the failure rather than uploading a partial.
    """
    out = (dest_dir or Path(gettempdir())) / backup_filename()
    cmd = [
        "pg_dump",
        "--format=custom",
        "--no-owner",
        "--no-privileges",
        "--file",
        str(out),
        "--host",
        settings.POSTGRES_SERVER,
        "--port",
        str(settings.POSTGRES_PORT),
        "--username",
        settings.POSTGRES_USER,
        "--dbname",
        settings.POSTGRES_DB,
    ]
    # pg_dump reads the password from PGPASSWORD; never goes on the argv.
    env = {**os.environ, "PGPASSWORD": settings.POSTGRES_PASSWORD}
    subprocess.run(cmd, env=env, check=True)
    return out
