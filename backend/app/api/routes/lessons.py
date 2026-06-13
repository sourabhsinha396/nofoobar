from uuid import UUID

from fastapi import APIRouter, HTTPException, Response, status
from sqlalchemy import func
from sqlalchemy.orm import selectinload
from sqlmodel import select

from app.api.deps import CurrentMembershipDep, SessionDep
from app.db.models.course import Course
from app.db.models.lesson import Lesson
from app.db.models.membership import Role
from app.db.models.section import Section
from app.schemas.lesson import LessonCreate, LessonPublic, LessonReorderPayload, LessonUpdate
from app.schemas.section import SectionDetailPublic

router = APIRouter(prefix="/courses/{course_slug}/sections/{section_slug}", tags=["lessons"])

_AUTHOR_ROLES = {Role.OWNER, Role.INSTRUCTOR}


async def _get_section_or_404(session: SessionDep, org_id: UUID, course_slug: str, section_slug: str) -> Section:
    result = await session.exec(
        select(Section)
        .join(Course, Course.id == Section.course_id)
        .where(Section.org_id == org_id)
        .where(Course.slug == course_slug)
        .where(Section.slug == section_slug)
    )
    section = result.first()
    if section is None:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND,
            f"No section with slug {section_slug!r} in course {course_slug!r}",
        )
    return section


async def _get_lesson_or_404(
    session: SessionDep, org_id: UUID, course_slug: str, section_slug: str, lesson_slug: str
) -> Lesson:
    result = await session.exec(
        select(Lesson)
        .join(Section, Section.id == Lesson.section_id)
        .join(Course, Course.id == Section.course_id)
        .where(Lesson.org_id == org_id)
        .where(Course.slug == course_slug)
        .where(Section.slug == section_slug)
        .where(Lesson.slug == lesson_slug)
    )
    lesson = result.first()
    if lesson is None:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND,
            f"No lesson with slug {lesson_slug!r} in section {section_slug!r}",
        )
    return lesson


@router.get("")
async def get_section(
    course_slug: str,
    section_slug: str,
    membership: CurrentMembershipDep,
    session: SessionDep,
) -> SectionDetailPublic:
    result = await session.exec(
        select(Section)
        .join(Course, Course.id == Section.course_id)
        .where(Section.org_id == membership.org_id)
        .where(Course.slug == course_slug)
        .where(Section.slug == section_slug)
        .options(selectinload(Section.lessons))
    )
    section = result.first()
    if section is None:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND,
            f"No section with slug {section_slug!r} in course {course_slug!r}",
        )
    return section


@router.post("/lessons", status_code=status.HTTP_201_CREATED)
async def create_lesson(
    course_slug: str,
    section_slug: str,
    payload: LessonCreate,
    membership: CurrentMembershipDep,
    session: SessionDep,
) -> LessonPublic:
    if membership.role not in _AUTHOR_ROLES:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only owners and instructors can create lessons")

    section = await _get_section_or_404(session, membership.org_id, course_slug, section_slug)

    existing = await session.exec(
        select(Lesson).where(Lesson.section_id == section.id).where(Lesson.slug == payload.slug)
    )
    if existing.first() is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "Slug already used in this section")

    max_position_result = await session.exec(
        select(func.max(Lesson.position)).where(Lesson.section_id == section.id)
    )
    current_max = max_position_result.first()
    next_position = 0 if current_max is None else current_max + 1

    # The discriminated content union carries `content_type` and the type-specific
    # fields; persist the type on the row and the rest in the JSONB content blob.
    content_dump = payload.content.model_dump(mode="json", exclude={"content_type"})

    lesson = Lesson(
        org_id=membership.org_id,
        course_id=section.course_id,
        section_id=section.id,
        slug=payload.slug,
        title=payload.title,
        content_type=payload.content.content_type,
        content=content_dump,
        position=next_position,
        visibility=payload.visibility,
        duration_seconds=payload.duration_seconds,
        is_free_preview=payload.is_free_preview,
    )
    session.add(lesson)
    await session.commit()
    await session.refresh(lesson)
    return lesson


@router.get("/lessons")
async def list_lessons(
    course_slug: str,
    section_slug: str,
    membership: CurrentMembershipDep,
    session: SessionDep,
) -> list[LessonPublic]:
    section = await _get_section_or_404(session, membership.org_id, course_slug, section_slug)
    result = await session.exec(
        select(Lesson).where(Lesson.section_id == section.id).order_by(Lesson.position)
    )
    return list(result.all())


@router.get("/lessons/{lesson_slug}")
async def get_lesson(
    course_slug: str,
    section_slug: str,
    lesson_slug: str,
    membership: CurrentMembershipDep,
    session: SessionDep,
) -> LessonPublic:
    return await _get_lesson_or_404(session, membership.org_id, course_slug, section_slug, lesson_slug)


@router.patch("/lessons/reorder", status_code=status.HTTP_204_NO_CONTENT)
async def reorder_lessons(
    course_slug: str,
    section_slug: str,
    payload: LessonReorderPayload,
    membership: CurrentMembershipDep,
    session: SessionDep,
) -> Response:
    if membership.role not in _AUTHOR_ROLES:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only owners and instructors can reorder lessons")

    section = await _get_section_or_404(session, membership.org_id, course_slug, section_slug)

    lessons_result = await session.exec(
        select(Lesson).where(Lesson.section_id == section.id)
    )
    lessons = list(lessons_result.all())
    lessons_by_id = {lesson.id: lesson for lesson in lessons}

    if set(payload.ids) != set(lessons_by_id.keys()):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Reorder payload must include every lesson in the section exactly once",
        )

    for position, lesson_id in enumerate(payload.ids):
        lessons_by_id[lesson_id].position = position

    await session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.patch("/lessons/{lesson_slug}")
async def update_lesson(
    course_slug: str,
    section_slug: str,
    lesson_slug: str,
    payload: LessonUpdate,
    membership: CurrentMembershipDep,
    session: SessionDep,
) -> LessonPublic:
    if membership.role not in _AUTHOR_ROLES:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only owners and instructors can edit lessons")

    lesson = await _get_lesson_or_404(session, membership.org_id, course_slug, section_slug, lesson_slug)

    if payload.slug is not None and payload.slug != lesson.slug:
        existing = await session.exec(
            select(Lesson)
            .where(Lesson.section_id == lesson.section_id)
            .where(Lesson.slug == payload.slug)
        )
        if existing.first() is not None:
            raise HTTPException(status.HTTP_409_CONFLICT, "Slug already used in this section")
        lesson.slug = payload.slug

    if payload.title is not None:
        lesson.title = payload.title

    if payload.content is not None:
        if payload.content.content_type != lesson.content_type:
            raise HTTPException(
                status.HTTP_409_CONFLICT,
                "content_type cannot change after creation; delete and recreate the lesson",
            )
        lesson.content = payload.content.model_dump(mode="json", exclude={"content_type"})

    # Following the existing "None means no change" pattern. To clear
    # duration_seconds explicitly, send 0 and the form layer can treat 0 as null
    # on the display side - keeps the schema unambiguous without a sentinel.
    if payload.visibility is not None:
        lesson.visibility = payload.visibility
    if payload.duration_seconds is not None:
        lesson.duration_seconds = payload.duration_seconds
    if payload.is_free_preview is not None:
        lesson.is_free_preview = payload.is_free_preview

    await session.commit()
    await session.refresh(lesson)
    return lesson


@router.delete("/lessons/{lesson_slug}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_lesson(
    course_slug: str,
    section_slug: str,
    lesson_slug: str,
    membership: CurrentMembershipDep,
    session: SessionDep,
) -> Response:
    if membership.role not in _AUTHOR_ROLES:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only owners and instructors can delete lessons")

    lesson = await _get_lesson_or_404(session, membership.org_id, course_slug, section_slug, lesson_slug)
    await session.delete(lesson)
    await session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
