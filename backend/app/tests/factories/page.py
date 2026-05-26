from polyfactory.factories.pydantic_factory import ModelFactory

from app.db.models.page import OrganizationPage, PageKind
from app.tests.factories.lesson import tiptap_doc


class PageFactory(ModelFactory[OrganizationPage]):
    __model__ = OrganizationPage

    @classmethod
    def slug(cls) -> str:
        return "privacy-policy"

    @classmethod
    def title(cls) -> str:
        return "Privacy Policy"

    @classmethod
    def kind(cls) -> PageKind:
        return PageKind.PRIVACY

    @classmethod
    def body(cls) -> dict:
        # Real TipTap doc so projections through TipTapDoc validation work.
        return tiptap_doc("Privacy policy body.")

    @classmethod
    def is_published(cls) -> bool:
        return True
