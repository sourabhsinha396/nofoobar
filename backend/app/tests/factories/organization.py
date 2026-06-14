from polyfactory.factories.pydantic_factory import ModelFactory

from app.db.models.organization import Organization


class OrganizationFactory(ModelFactory[Organization]):
    __model__ = Organization

    @classmethod
    def slug(cls) -> str:
        # Avoid polyfactory's occasional empty string, which breaks tenant
        # resolution and any test that interpolates the slug into a URL.
        return cls.__faker__.slug()

    @classmethod
    def social_links(cls) -> list[dict]:
        # Polyfactory's default for list[dict[str, Any]] generates random-key
        # dicts that don't match the {platform, url} shape expected by
        # OrganizationPublic. Default to an empty list - tests that exercise
        # this field opt in explicitly.
        return []
