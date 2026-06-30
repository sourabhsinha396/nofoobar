# Database backups

Nightly Postgres backups: a `pg_dump` is taken, uploaded to the same S3/R2
bucket as uploads (under a separate prefix), and old dumps are pruned to a
retention window. Runs unattended via Celery beat.

## How it works

```
beat (cron, BACKUP_HOUR_UTC)  ->  backup_database task on a worker
                                     1. pg_dump --format=custom  -> /tmp/<db>-<ts>.dump
                                     2. upload to s3://<bucket>/<prefix>/<file>
                                     3. prune: keep BACKUP_KEEP newest, delete the rest
```

- **Dump format:** custom (`pg_dump -Fc`). Compressed, and restorable
  selectively with `pg_restore`. The worker image ships `pg_dump` 17 to match
  the Postgres 17 server - a client older than the server refuses to run.
- **Where:** `s3://$S3_BUCKET/$BACKUP_S3_PREFIX` (default `db_backups/`). Same
  bucket as image uploads, different prefix; prune is scoped to the prefix and
  never touches `uploads/`.
- **Retention:** keeps `$BACKUP_KEEP` newest (default 7), deletes older. Sorted
  by last-modified, with the timestamped filename as a tiebreaker.
- **Schedule:** daily at `$BACKUP_HOUR_UTC:00` UTC (default 02:00), declared in
  `backend/app/worker.py` (`beat_schedule`).

Code: `backend/app/services/backup/` (`pg.py` dump, `store.py` upload/prune,
`tasks.py` the Celery task) and `backend/app/worker.py` (Celery app + schedule).

## Configuration

All in `backend/.env`. Backups reuse the `S3_*` and `POSTGRES_*` settings; the
only backup-specific vars:

| Variable | Default | Purpose |
|---|---|---|
| `REDIS_URL` | `redis://redis:6379/0` | Celery broker + result backend. |
| `BACKUP_S3_PREFIX` | `db_backups/` | Key prefix inside `S3_BUCKET`. |
| `BACKUP_KEEP` | `7` | How many newest dumps to retain. |
| `BACKUP_HOUR_UTC` | `2` | Daily run hour, UTC. |
| `RUNNING_LOCALALLY` | `False` | Local dev: write the dump to `LOCAL_BACKUP_DIR` and skip the S3 upload. |
| `LOCAL_BACKUP_DIR` | `db_backups` | Where local dumps land when `RUNNING_LOCALALLY` is set. Git-ignored. |

Backups need the `S3_*` vars set (same five as object storage). If storage
isn't configured the upload step fails and the task retries, then errors - check
worker logs.

## Running it

The worker and beat containers start with the rest of the stack:

```bash
cd backend
docker compose up -d --build        # brings up web, worker, beat, redis, postgres
docker compose logs -f worker beat  # watch backups fire
```

**Trigger a backup on demand** (don't wait for the schedule):

```bash
docker compose exec worker uv run celery -A app.worker.celery_app call backup_database
```

or run the steps directly (no Celery, useful for debugging the dump itself):

```bash
docker compose exec worker uv run python -c "from app.services.backup import tasks; print(tasks.backup_database())"
```

**List what's in the bucket:**

```bash
docker compose exec worker uv run python -c "from app.services.backup import store; print(sorted(o['Key'] for o in store._client().list_objects_v2(Bucket=store.settings.S3_BUCKET, Prefix=store._prefix()).get('Contents', [])))"
```

## Local mode (no R2 needed)

Set `RUNNING_LOCALALLY=True` in `backend/.env`. The task then writes the dump to
`LOCAL_BACKUP_DIR` (default `backend/db_backups/`, git-ignored) and **skips the
S3 upload entirely** - so you can exercise `pg_dump` and retention without
object-storage credentials. `BACKUP_KEEP` retention still applies, against the
local directory.

```bash
docker compose exec worker uv run python -c "from app.services.backup import tasks; print(tasks.backup_database())"
ls backend/db_backups/        # the dump is here (also visible on the host via the dev volume mount)
```

Leave `RUNNING_LOCALALLY` false/unset in production.

## Restoring

1. Download a dump from the bucket (R2 dashboard, `aws s3 cp`, or `rclone`).
2. Restore into a Postgres 17 server with `pg_restore`:

```bash
# Into a fresh, empty database (recommended):
createdb -h <host> -U <user> nofoobar_restore
pg_restore -h <host> -U <user> -d nofoobar_restore --no-owner --no-privileges <db>-<ts>.dump

# Or overwrite the existing database (destructive - drops objects first):
pg_restore -h <host> -U <user> -d nofoobar --clean --if-exists --no-owner --no-privileges <db>-<ts>.dump
```

Custom-format dumps also support partial restores (`pg_restore -l` to list
contents, `-L` to restore a subset) - handy for pulling back a single table.

## Production notes

Production runs the backend via `docker compose` on the Hetzner box, so `worker`
and `beat` come up alongside `web` on `docker compose up -d --build`. Verify both
are running after a deploy:

```bash
docker compose ps worker beat redis
```

Things to watch:

- **One beat, always.** Exactly one `beat` container should run, or backups fire
  multiple times. The default single-box compose guarantees this; don't scale
  `beat` past 1.
- **The worker disk.** Dumps are written to the container's `/tmp` and deleted
  after upload (success or failure), so they don't accumulate locally.
- **Offsite copy.** Backups live in the same bucket as uploads. For real
  disaster recovery, enable bucket versioning or replicate the `db_backups/`
  prefix to a second provider - a compromised R2 token can otherwise delete both
  app data and its backups. Not yet automated; flagged for the future.
