from polyfactory.factories.pydantic_factory import ModelFactory

from app.db.models.nav_link import NavLinkLocation, OrganizationNavLink


class NavLinkFactory(ModelFactory[OrganizationNavLink]):
    __model__ = OrganizationNavLink

    @classmethod
    def location(cls) -> NavLinkLocation:
        return NavLinkLocation.HEADER

    @classmethod
    def label(cls) -> str:
        return "About"

    @classmethod
    def href(cls) -> str:
        return "https://example.com/about"

    @classmethod
    def open_in_new_tab(cls) -> bool:
        return True

    @classmethod
    def is_enabled(cls) -> bool:
        return True
