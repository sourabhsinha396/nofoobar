# Architecture

System-level decisions and diagrams for algoholic.

Lives here:

- System overview — services, boundaries, request flow.
- Multi-tenancy — Organization model, `org_id` enforcement, subdomain and custom-domain resolution.
- Data model — core entities (Organization, User, Course, Lesson, etc.) and their relationships.
- Integration with the separate interactive labs service.
- Architecture Decision Records (ADRs) for significant choices.

Each document should explain the *why* (constraints, trade-offs) — the code already shows the *what*.
