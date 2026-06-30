"""Celery app for background jobs (currently: the daily database backup).

Run by the `worker` and `beat` containers (see docker-compose.yml). The beat
schedule is declared here in code - version-controlled and reviewable - rather
than in a DB-backed periodic-task table. Today it holds one entry: a daily
pg_dump -> S3/R2 -> prune at BACKUP_HOUR_UTC.
"""

from celery import Celery
from celery.schedules import crontab

from app.core.config import settings

celery_app = Celery(
    "nofoobar",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
)

celery_app.conf.update(
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    # Backups are long single-shot jobs; a worker should grab one at a time
    # and not hoard a prefetch buffer it won't touch.
    worker_prefetch_multiplier=1,
)

# Discover @celery_app.task definitions under these packages' `tasks` modules.
celery_app.autodiscover_tasks(["app.services.backup"])

# Daily database backup. Mirrors the reference "Daily Database Backup" cron at a
# fixed hour - here, BACKUP_HOUR_UTC (UTC).
celery_app.conf.beat_schedule = {
    "daily-database-backup": {
        "task": "backup_database",
        "schedule": crontab(hour=settings.BACKUP_HOUR_UTC, minute=0),
    },
}
