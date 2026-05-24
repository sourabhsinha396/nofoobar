from polyfactory.factories.pydantic_factory import ModelFactory

from app.db.models.course import Course


class CourseFactory(ModelFactory[Course]):
    __model__ = Course
