from typing import Annotated, Any
from uuid import UUID

from pydantic import BaseModel, StringConstraints, field_validator
from sqlmodel import SQLModel

from app.db.models.page import PageKind
from app.schemas.common import Slug
from app.schemas.lesson import TipTapDoc

# Slugs that conflict with existing tenant routes. Admins can't create a
# page at any of these - the route resolver would never reach the page
# renderer because Next.js would match the static segment first. We block
# at write time so the failure is clear and immediate, not silently broken.
#
# Keep this list in lockstep with the file structure under
# `frontend/app/org/[slug]/(public)/` (plus the `admin` segment, which
# isn't under (public) but is conceptually reserved).
RESERVED_SLUGS: frozenset[str] = frozenset(
    {
        "courses",
        "login",
        "signup",
        "my-learning",
        "admin",
        "api",
        "me",
        "_next",
    }
)


PageTitle = Annotated[str, StringConstraints(min_length=1, max_length=255)]


def _check_not_reserved(value: str) -> str:
    if value in RESERVED_SLUGS:
        raise ValueError(
            f"Slug {value!r} is reserved by the platform. "
            "Pick a different one (e.g. 'terms-and-conditions' instead of 'terms')."
        )
    return value


class OrganizationPageCreate(BaseModel):
    slug: Slug
    title: PageTitle
    body: TipTapDoc
    kind: PageKind = PageKind.CUSTOM
    is_published: bool = False
    show_in_footer: bool = False
    footer_position: int = 0

    @field_validator("slug")
    @classmethod
    def _slug_not_reserved(cls, value: str) -> str:
        return _check_not_reserved(value)


class OrganizationPageUpdate(BaseModel):
    """Partial update. Unset fields are left alone; explicit `null` is not
    accepted on required fields (slug/title/body/kind) by the schema.
    """

    slug: Slug | None = None
    title: PageTitle | None = None
    body: TipTapDoc | None = None
    kind: PageKind | None = None
    is_published: bool | None = None
    show_in_footer: bool | None = None
    footer_position: int | None = None

    @field_validator("slug")
    @classmethod
    def _slug_not_reserved(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return _check_not_reserved(value)


class OrganizationPagePublic(SQLModel):
    id: UUID
    org_id: UUID
    slug: str
    title: str
    body: dict[str, Any]
    kind: PageKind
    is_published: bool
    show_in_footer: bool
    footer_position: int


class OrganizationPageSummary(SQLModel):
    """Lightweight projection for admin lists and footer menus - skips the
    `body` JSONB blob so listing N pages doesn't ship N tiptap docs."""

    id: UUID
    slug: str
    title: str
    kind: PageKind
    is_published: bool
    show_in_footer: bool
    footer_position: int
