from polyfactory.factories.pydantic_factory import ModelFactory

from app.db.models.section import Section


class SectionFactory(ModelFactory[Section]):
    __model__ = Section

    @classmethod
    def slug(cls) -> str:
        # Polyfactory's default str generator can emit an empty string, which
        # breaks tests that interpolate the slug into a URL path (an empty slug
        # collapses `/sections/{slug}/` to `//` and misses the route). Always
        # produce a valid, non-empty slug.
        return cls.__faker__.slug()
