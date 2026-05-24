from typing import Annotated, Any, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, HttpUrl, StringConstraints
from sqlmodel import SQLModel

from app.db.models.lesson import ContentType
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


class LabContent(BaseModel):
    content_type: Literal[ContentType.LAB] = ContentType.LAB
    lab_id: Annotated[str, StringConstraints(min_length=1, max_length=255)]


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


class LessonUpdate(BaseModel):
    slug: Slug | None = None
    title: Annotated[str, StringConstraints(min_length=1, max_length=255)] | None = None
    content: LessonContent | None = None


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


class LessonOutline(SQLModel):
    id: UUID
    slug: str
    title: str
    content_type: ContentType
    position: int


class LessonReorderPayload(BaseModel):
    ids: Annotated[list[UUID], Field(min_length=0)]
