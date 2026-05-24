from polyfactory.factories.pydantic_factory import ModelFactory

from app.db.models.section import Section


class SectionFactory(ModelFactory[Section]):
    __model__ = Section
