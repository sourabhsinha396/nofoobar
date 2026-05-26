from typing import Annotated
from uuid import UUID

from pydantic import BaseModel, Field, StringConstraints

from app.db.models.nav_link import NavLinkLocation

NavLabel = Annotated[str, StringConstraints(min_length=1, max_length=64)]
NavHref = Annotated[str, StringConstraints(min_length=1, max_length=2048)]


class NavLinkInput(BaseModel):
    """One nav link as posted by the admin in a full-list PUT (scoped to a
    location via the route's query parameter). Position is not required —
    the server assigns 0..N-1 in array order.
    """

    label: NavLabel
    href: NavHref
    open_in_new_tab: bool = True
    is_enabled: bool = True


class NavLinksReplacePayload(BaseModel):
    """PUT body for `/admin/nav-links?location=…`. Empty list is allowed and
    means "no nav links at this location"."""

    links: Annotated[list[NavLinkInput], Field(max_length=24)]


class NavLinkPublic(BaseModel):
    id: UUID
    location: NavLinkLocation
    label: str
    href: str
    open_in_new_tab: bool
    position: int
    is_enabled: bool
