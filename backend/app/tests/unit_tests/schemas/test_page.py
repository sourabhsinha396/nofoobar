import pytest
from pydantic import ValidationError

from app.schemas.page import (
    RESERVED_SLUGS,
    OrganizationPageCreate,
    OrganizationPageUpdate,
)
from app.tests.factories.lesson import tiptap_doc


def _minimal_create(slug: str = "about") -> dict:
    return {"slug": slug, "title": "About", "body": tiptap_doc("hi")}


def test_create_accepts_minimal_payload():
    page = OrganizationPageCreate(**_minimal_create())
    assert page.slug == "about"
    # Defaults: kind=custom, unpublished, not in footer.
    assert page.kind.value == "custom"
    assert page.is_published is False
    assert page.show_in_footer is False


@pytest.mark.parametrize("slug", sorted(RESERVED_SLUGS))
def test_create_rejects_every_reserved_slug(slug: str):
    with pytest.raises(ValidationError):
        OrganizationPageCreate(**_minimal_create(slug=slug))


def test_create_rejects_bad_slug_pattern():
    with pytest.raises(ValidationError):
        OrganizationPageCreate(**_minimal_create(slug="Privacy"))  # uppercase


def test_create_requires_title():
    with pytest.raises(ValidationError):
        OrganizationPageCreate(slug="about", title="", body=tiptap_doc("hi"))


def test_update_allows_partial_payload():
    update = OrganizationPageUpdate(title="New title")
    dumped = update.model_dump(exclude_unset=True)
    assert dumped == {"title": "New title"}


def test_update_rejects_reserved_slug_on_rename():
    with pytest.raises(ValidationError):
        OrganizationPageUpdate(slug="courses")


def test_update_accepts_none_slug_as_no_change():
    update = OrganizationPageUpdate()
    assert update.slug is None
