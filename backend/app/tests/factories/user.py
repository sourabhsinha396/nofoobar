from polyfactory.factories.pydantic_factory import ModelFactory

from app.db.models.user import User


class UserFactory(ModelFactory[User]):
    __model__ = User
