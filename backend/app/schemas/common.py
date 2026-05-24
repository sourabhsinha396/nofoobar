from typing import Annotated

from pydantic import StringConstraints

SLUG_PATTERN = r"^[a-z][a-z0-9-]{0,62}$"

Slug = Annotated[str, StringConstraints(pattern=SLUG_PATTERN, max_length=63)]
