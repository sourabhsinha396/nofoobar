from polyfactory.factories.pydantic_factory import ModelFactory

from app.db.models.course import Course


class CourseFactory(ModelFactory[Course]):
    __model__ = Course

    @classmethod
    def slug(cls) -> str:
        # Avoid polyfactory's occasional empty string, which breaks tests that
        # interpolate the slug into a URL path. Always a valid, non-empty slug.
        return cls.__faker__.slug()
