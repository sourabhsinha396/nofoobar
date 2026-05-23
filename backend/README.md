# algoholic backend

FastAPI + SQLModel + Postgres backend for algoholic.

## Requirements

- Docker (for the full dev stack: Postgres + web)
- [uv](https://docs.astral.sh/uv/) — only if you want to run tooling outside Docker

## Setup

```bash
# from the backend/ directory
cp .env.example .env

# build and start postgres + web
docker compose up -d --build

# apply migrations
docker compose exec web uv run alembic upgrade head

# follow logs
docker compose logs -f web
```

Open http://localhost:8000/api/v1/health to verify.

## Common commands

```bash
# create a migration (after editing app/models.py)
docker compose exec web uv run alembic revision --autogenerate -m "NNN_short_description"

# apply migrations
docker compose exec web uv run alembic upgrade head

# run tests
docker compose exec web uv run pytest

# lint
docker compose exec web uv run ruff check app/

# open a shell in the web container
docker compose exec web bash
```

Migration filenames are numbered sequentially (`001_initial`, `002_add_org`, …) — set the prefix manually in the `-m` slug.

## Layout

- `app/main.py` — FastAPI entrypoint
- `app/api/` — HTTP routes, grouped under `/api/v1`
- `app/core/` — config, db engine, cross-cutting concerns
- `app/models.py` — SQLModel tables
- `app/tests/` — pytest suite
- `alembic/` — migrations
