from polyfactory.factories.pydantic_factory import ModelFactory

from app.db.models.lesson import ContentType, Lesson


class LessonFactory(ModelFactory[Lesson]):
    __model__ = Lesson

    @classmethod
    def content_type(cls) -> ContentType:
        return ContentType.ARTICLE

    @classmethod
    def content(cls) -> dict:
        return {"body": "Some markdown content."}
