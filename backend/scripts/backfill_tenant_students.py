"""Backfill student memberships for users who signed up on a tenant site
before signup started creating memberships.

Grants role=student in the given org to every user who has no org membership
at all. Superusers (platform staff) are skipped. Safe to re-run: users who
already have any membership are never touched.

Usage (from the backend/ directory):

    docker compose exec web uv run python scripts/backfill_tenant_students.py <org-slug> [--dry-run]
"""

import asyncio
import sys
from pathlib import Path

# `python scripts/<name>.py` puts scripts/ (not the repo root) on sys.path,
# so the `app` package wouldn't resolve without this.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlmodel import col, select  # noqa: E402

from app.db.db import async_session_factory  # noqa: E402
from app.db.models.membership import Role, UserOrgMembership  # noqa: E402
from app.db.models.organization import Organization  # noqa: E402
from app.db.models.user import User  # noqa: E402


async def backfill(slug: str, dry_run: bool) -> None:
    async with async_session_factory() as session:
        org = (
            await session.exec(select(Organization).where(Organization.slug == slug))
        ).one_or_none()
        if org is None:
            print(f"No organization with slug {slug!r}")
            raise SystemExit(1)

        any_membership = select(UserOrgMembership.user_id)
        result = await session.exec(
            select(User)
            .where(col(User.is_superuser).is_(False))
            .where(col(User.id).not_in(any_membership))
            .order_by(col(User.created_at))
        )
        users = list(result.all())

        for user in users:
            print(f"{'would add' if dry_run else 'adding'}: {user.email}")
            if not dry_run:
                session.add(
                    UserOrgMembership(user_id=user.id, org_id=org.id, role=Role.STUDENT)
                )
        if not dry_run:
            await session.commit()
        verb = "would be backfilled" if dry_run else "backfilled"
        print(f"{len(users)} user(s) {verb} into {org.slug!r} as students")


if __name__ == "__main__":
    dry_run = "--dry-run" in sys.argv[1:]
    args = [a for a in sys.argv[1:] if a != "--dry-run"]
    if len(args) != 1:
        print("Usage: backfill_tenant_students.py <org-slug> [--dry-run]")
        raise SystemExit(2)
    asyncio.run(backfill(args[0], dry_run))
