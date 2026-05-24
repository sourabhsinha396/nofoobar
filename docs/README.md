# algoholic docs

Working notes and reference material for the algoholic codebase. Each subfolder owns a concern:

- [architecture/](architecture/) — system overview, multi-tenancy, data model decisions, ADRs.
- [backend/](backend/) — FastAPI conventions, SQLModel patterns, migrations, testing.
- [frontend/](frontend/) — Next.js conventions, component patterns, Magic UI usage.
- [devops/](devops/) — local development, deployment, infrastructure, observability.
- [local-setup/](local-setup/) — guides for non-obvious local-dev configurations (e.g. testing tenant subdomains).

See the root [CLAUDE.md](../CLAUDE.md) for the top-level project orientation (stack, tenancy model, workflow, allowlists).
