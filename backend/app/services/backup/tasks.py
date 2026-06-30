"""The Celery task that orchestrates a backup: dump -> upload -> prune.

Discovered by app/worker.py via autodiscover_tasks. Kept separate from worker.py
so the Celery app and the work it schedules don't import-cycle. Mirrors the
reference `backup_database` task, including its retry policy.

When settings.RUNNING_LOCALALLY is set, the dump is kept on disk under
LOCAL_BACKUP_DIR and the S3/R2 upload is skipped - a local-dev escape hatch that
needs no object-storage credentials.
"""

import logging
from datetime import UTC, datetime
from pathlib import Path

from app.core.config import settings
from app.services.backup import pg, store
from app.worker import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(
    name="backup_database",
    autoretry_for=(Exception,),
    max_retries=2,
    retry_backoff=True,
)
def backup_database() -> str:
    """pg_dump the database, then either upload it (default) or keep it locally
    (RUNNING_LOCALALLY). Returns the object key or local path of the dump.

    Any failure raises so Celery's autoretry (2 attempts, exponential backoff)
    kicks in. A failed prune does not undo a good dump - it's caught and logged
    so a transient list/delete hiccup never fails the backup.
    """
    if settings.RUNNING_LOCALALLY:
        return _backup_local()
    return _backup_remote()


def _backup_remote() -> str:
    started = datetime.now(UTC).isoformat()
    dump_path = pg.dump_to_file()
    try:
        key = store.upload_backup(dump_path)
        logger.info("Database backup uploaded: %s (started %s)", key, started)
    finally:
        # The dump is in a temp dir; drop the local copy whether or not the
        # upload succeeded so the worker's disk doesn't fill over time.
        dump_path.unlink(missing_ok=True)

    try:
        deleted = store.prune_old_backups()
        if deleted:
            logger.info("Pruned %d old backup(s): %s", len(deleted), deleted)
    except Exception:
        logger.exception("Backup uploaded but prune failed; leaving old backups in place")

    return key


def _backup_local() -> str:
    started = datetime.now(UTC).isoformat()
    dest = Path(settings.LOCAL_BACKUP_DIR)
    dest.mkdir(parents=True, exist_ok=True)
    # Keep the dump in place (no upload, no unlink) - it *is* the backup here.
    dump_path = pg.dump_to_file(dest)
    logger.info("Local database backup written: %s (started %s)", dump_path, started)

    try:
        deleted = store.prune_local_backups(dest)
        if deleted:
            logger.info("Pruned %d old local backup(s): %s", len(deleted), deleted)
    except Exception:
        logger.exception("Local backup written but prune failed; leaving old backups in place")

    return str(dump_path)
