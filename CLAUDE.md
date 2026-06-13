# nofoobar

Open-source, multi-tenant learning management system for course creators. Long-term build; first production tenant is fastapitutorial.com.

## Repo layout

- `frontend/` — Next.js 16 (App Router) marketing site and (eventually) tenant UI. See `frontend/AGENTS.md` for Next.js 16 caveats.
- `backend/` — FastAPI + SQLModel + Postgres + Alembic + uv. Domain model covers orgs, users, memberships, courses, sections, lessons, enrollments, payments. Adapter modules under `app/services/` (e.g. `payments/`, `storage/`) are the established pattern for pluggable providers. See `backend/README.md` for the docker-compose dev loop.
- `docs/` — architecture, backend, frontend, devops notes. See `docs/README.md`.
- `interactive_labs/` — **lives in a separate repo (Django service).** Nofoobar embeds labs through that service's `/api/embed/sessions` API. Don't reimplement labs here.

## Stack

- **Backend:** FastAPI + SQLModel + Postgres.
- **Frontend:** Next.js 16 (App Router), React 19, Tailwind, shadcn primitives, curated Magic UI subset (see allowlist below).
- **License:** Apache 2.0.
- **Package manager (frontend):** pnpm.

## Multi-tenancy model

Shared database, shared schema. Every tenant-owned row carries an `org_id` FK to the `Organization` table. Tenants are resolved by subdomain (e.g. `acme.nofoobar.app`) and by custom domain (e.g. `learn.acme.com`). The `org_id` filter must be enforced at the query layer for every tenant-scoped read/write — design APIs and services with this as a non-negotiable invariant.

## Public-repo discipline

The repo is public from commit #1. Do **not** name competing LMS / course platforms (Teachable, Thinkific, Kajabi, Podia, Mighty Networks, etc.) anywhere in code, comments, commit messages, docs, issues, or PRs. Describe nofoobar on its own terms — "open-source, multi-tenant LMS for course creators."

**One exception** (owner-approved 2026-06-12): marketing-site copy may name competitors in truthful, sourced pricing comparisons (e.g. the fee-calculator section). Figures must match the competitor's published pricing and carry an "as of" date. Everywhere else — comments, commits, issues, PRs, internal docs — the no-naming rule still applies.

## Magic UI allowlist

nofoobar uses a curated subset of Magic UI. Do not propose or install components outside this list without asking first. shadcn primitives (Accordion, Button, Card, etc.) remain unrestricted.

Allowed Magic UI components:

- Dock
- Globe
- Tweet Card
- Border Beam
- Aurora Text
- Animated Shiny Text
- Text Highlighter
- Shimmer Button
- Ripple
- File Tree
- Scroll Progress
- Pixel Image
- Backlight

Install via: `pnpm dlx shadcn@latest add "https://magicui.design/r/<slug>"`.

## Workflow

**Discuss → implement → test → proceed.** Small chunks, discussion before code. Do not barrel ahead across multiple steps without checking in, even when the task seems obvious.

## Frontend caveats

`frontend/AGENTS.md` warns that Next.js 16 has breaking changes from earlier versions — APIs, conventions, and file structure differ from training data. Before writing frontend code, read the relevant guide in `frontend/node_modules/next/dist/docs/` and heed deprecation notices.
