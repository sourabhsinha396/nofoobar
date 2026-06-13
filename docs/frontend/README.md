# Frontend

Conventions and reference for the Next.js 16 frontend (`frontend/`).

Lives here:

- Component conventions - where shadcn primitives go vs. site/page composition.
- Magic UI usage - the curated allowlist is in the root [CLAUDE.md](../../CLAUDE.md#magic-ui-allowlist). Do not reach outside it without approval.
- Routing and layout patterns under the App Router.
- Tenant theming and per-organization customization.
- Data fetching patterns against the FastAPI backend.

Read `frontend/AGENTS.md` for the Next.js 16 caveat - its APIs differ from earlier versions, so consult `frontend/node_modules/next/dist/docs/` before writing new code.
