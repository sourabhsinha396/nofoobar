# algoholic backend

FastAPI + SQLModel + Postgres backend for algoholic.

## Requirements
- Docker (for the full dev stack: Postgres + web)

## Setup
```bash
cd backend
cp .env.example .env
docker compose up --build
docker compose exec web uv run alembic upgrade head
docker compose logs -f web
```

Open http://localhost:8000/api/v1/health to verify.

The admin console is at http://localhost:8000/admin. Default creds are in `.env.example` — change them in your local `.env`.

## Common commands

```bash
docker compose exec web uv run alembic revision --autogenerate -m "NNN_short_description"
docker compose exec web uv run alembic upgrade head
docker compose exec web uv run pytest app/tests/unit_tests
docker compose exec web uv run pytest
docker compose exec web uv run ruff check app/
docker compose exec web bash
```

Migration filenames are numbered sequentially (`001_initial`, `002_add_org`, …) — set the prefix manually in the `-m` slug.


