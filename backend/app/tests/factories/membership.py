from polyfactory.factories.pydantic_factory import ModelFactory

from app.db.models.membership import UserOrgMembership


class UserOrgMembershipFactory(ModelFactory[UserOrgMembership]):
    __model__ = UserOrgMembership
