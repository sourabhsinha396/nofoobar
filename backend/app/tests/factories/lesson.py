from polyfactory.factories.pydantic_factory import ModelFactory

from app.db.models.lesson import ContentType, Lesson


def tiptap_doc(text: str = "Some content.") -> dict:
    """Minimal valid TipTap JSON document: a single paragraph wrapping `text`."""
    return {
        "type": "doc",
        "content": [
            {
                "type": "paragraph",
                "content": [{"type": "text", "text": text}],
            }
        ],
    }


class LessonFactory(ModelFactory[Lesson]):
    __model__ = Lesson

    @classmethod
    def slug(cls) -> str:
        # Avoid polyfactory's occasional empty string, which breaks tests that
        # interpolate the slug into a URL path. Always a valid, non-empty slug.
        return cls.__faker__.slug()

    @classmethod
    def content_type(cls) -> ContentType:
        return ContentType.ARTICLE

    @classmethod
    def content(cls) -> dict:
        return {"body": tiptap_doc()}
