# Backend

Conventions and reference for the FastAPI + SQLModel + Postgres backend.

Lives here:

- API conventions - route layout, request/response patterns, error shape, pagination.
- SQLModel patterns - table definitions, relationships, the `org_id` tenancy invariant.
- Migrations - how schema changes are authored and rolled out.
- Testing - fixtures, factories, integration vs. unit boundaries.
- Auth - session/token strategy, permissions, multi-tenant access control.

The `backend/` directory does not exist yet - it will be scaffolded as a separate chunk of work.
