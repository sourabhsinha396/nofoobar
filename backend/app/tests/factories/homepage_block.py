from polyfactory.factories.pydantic_factory import ModelFactory

from app.db.models.homepage_block import HomepageBlockType, OrganizationHomepageBlock


class HomepageBlockFactory(ModelFactory[OrganizationHomepageBlock]):
    __model__ = OrganizationHomepageBlock

    @classmethod
    def type(cls) -> HomepageBlockType:
        return HomepageBlockType.HERO

    @classmethod
    def config(cls) -> dict:
        return {"type": "hero", "headline": "Welcome"}

    @classmethod
    def is_enabled(cls) -> bool:
        return True
