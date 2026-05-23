# algoholic frontend

Next.js 16 (App Router) frontend for algoholic.

## Requirements

- Node 20+
- pnpm

## Setup

```bash
pnpm install
pnpm dev
```

Open http://localhost:3000.

The backend (FastAPI) must be running for any API-driven features — see [`../backend/README.md`](../backend/README.md).

## Common commands

```bash
pnpm dev          # dev server with hot reload
pnpm build        # production build
pnpm start        # serve the production build
pnpm lint         # eslint
```

## UI library policy

Algoholic uses shadcn primitives without restriction and a **curated subset** of Magic UI components. See the allowlist in [`../CLAUDE.md`](../CLAUDE.md#magic-ui-allowlist). Don't reach outside the list without explicit approval.

## Next.js 16

This project is on Next.js 16, which has breaking changes from earlier versions — APIs, conventions, and file structure differ from training data and many tutorials. Read the relevant guide in `node_modules/next/dist/docs/` before writing new code. See [`AGENTS.md`](AGENTS.md).
