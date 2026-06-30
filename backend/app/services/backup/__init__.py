"""Database backup adapter.

Daily Postgres backups: `pg_dump` (custom format) -> S3/R2 -> retention prune.
Orchestrated by the `backup_database` Celery task (app/worker.py). Mirrors the
proven dump/upload/prune logic we run elsewhere, adapted to FastAPI + boto3.
"""
