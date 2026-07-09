"""Reset a user's password from the CLI.

The equivalent of Django's `user.set_password(...)` + `user.save()`.

Usage (from the backend/ directory):

    docker compose exec web uv run python scripts/reset_password.py <email> <password>
"""

import asyncio
import sys
from pathlib import Path

# `python scripts/<name>.py` puts scripts/ (not the repo root) on sys.path,
# so the `app` package wouldn't resolve without this.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlmodel import select  # noqa: E402

from app.core.security import hash_password  # noqa: E402
from app.db.db import async_session_factory  # noqa: E402
from app.db.models.user import User  # noqa: E402


async def reset(email: str, password: str) -> None:
    async with async_session_factory() as session:
        user = (
            await session.exec(select(User).where(User.email == email))
        ).one_or_none()
        if user is None:
            print(f"No user with email {email!r}")
            raise SystemExit(1)
        user.password_hash = hash_password(password)
        session.add(user)
        await session.commit()
        print(f"Password reset for {user.email}")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: reset_password.py <email> <password>")
        raise SystemExit(2)
    asyncio.run(reset(sys.argv[1], sys.argv[2]))
