from polyfactory.factories.pydantic_factory import ModelFactory

from app.db.models.enrollment import Enrollment


class EnrollmentFactory(ModelFactory[Enrollment]):
    __model__ = Enrollment
