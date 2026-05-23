from polyfactory.factories.pydantic_factory import ModelFactory

from app.db.models.organization import Organization


class OrganizationFactory(ModelFactory[Organization]):
    __model__ = Organization
