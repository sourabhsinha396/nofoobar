from typing import Annotated, Any, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, HttpUrl, StringConstraints, field_validator
from sqlmodel import SQLModel

from app.db.models.lesson import ContentType, LessonVisibility
from app.schemas.common import Slug


class TipTapDoc(BaseModel):
    """Lightly validated ProseMirror/TipTap document shape.

    We only enforce the top-level invariants (`type: "doc"` + a `content` list);
    individual node shapes are not validated server-side because TipTap on the
    client is the authority on what's a valid doc. Extra top-level keys
    (e.g. `attrs`) are passed through.
    """

    model_config = ConfigDict(extra="allow")
    type: Literal["doc"]
    content: list[dict[str, Any]] = []


class ArticleContent(BaseModel):
    content_type: Literal[ContentType.ARTICLE] = ContentType.ARTICLE
    body: TipTapDoc


class VideoContent(BaseModel):
    content_type: Literal[ContentType.VIDEO] = ContentType.VIDEO
    url: HttpUrl
    duration_seconds: Annotated[int, Field(ge=0)] | None = None


# Labs are embedded from the interactive-labs service; only its domain may be
# iframed into learner pages.
LAB_EMBED_HOST = "algoholia.com"


class LabContent(BaseModel):
    content_type: Literal[ContentType.LAB] = ContentType.LAB
    embed_url: HttpUrl

    @field_validator("embed_url")
    @classmethod
    def embed_url_must_be_lab_host(cls, value: HttpUrl) -> HttpUrl:
        host = value.host or ""
        if value.scheme != "https" or (
            host != LAB_EMBED_HOST and not host.endswith(f".{LAB_EMBED_HOST}")
        ):
            raise ValueError(f"embed_url must be an https URL on {LAB_EMBED_HOST}")
        return value


class QuizQuestion(BaseModel):
    prompt: Annotated[str, StringConstraints(min_length=1)]
    options: Annotated[list[str], Field(min_length=2)]
    correct_index: Annotated[int, Field(ge=0)]


class QuizContent(BaseModel):
    content_type: Literal[ContentType.QUIZ] = ContentType.QUIZ
    questions: Annotated[list[QuizQuestion], Field(min_length=1)]


LessonContent = Annotated[
    ArticleContent | VideoContent | LabContent | QuizContent,
    Field(discriminator="content_type"),
]


class LessonCreate(BaseModel):
    slug: Slug
    title: Annotated[str, StringConstraints(min_length=1, max_length=255)]
    content: LessonContent
    visibility: LessonVisibility = LessonVisibility.DRAFT
    duration_seconds: Annotated[int, Field(ge=0)] | None = None
    is_free_preview: bool = False


class LessonUpdate(BaseModel):
    slug: Slug | None = None
    title: Annotated[str, StringConstraints(min_length=1, max_length=255)] | None = None
    content: LessonContent | None = None
    visibility: LessonVisibility | None = None
    duration_seconds: Annotated[int, Field(ge=0)] | None = None
    is_free_preview: bool | None = None


class LessonPublic(SQLModel):
    id: UUID
    org_id: UUID
    course_id: UUID
    section_id: UUID
    slug: str
    title: str
    content_type: ContentType
    content: dict[str, Any]
    position: int
    visibility: LessonVisibility
    duration_seconds: int | None = None
    is_free_preview: bool


class LessonOutline(SQLModel):
    id: UUID
    slug: str
    title: str
    content_type: ContentType
    position: int
    visibility: LessonVisibility
    duration_seconds: int | None = None
    is_free_preview: bool


class LessonReorderPayload(BaseModel):
    ids: Annotated[list[UUID], Field(min_length=0)]
