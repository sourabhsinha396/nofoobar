from fastapi import APIRouter, HTTPException, status
from sqlmodel import select

from app.api.deps import CurrentOrgDep, CurrentUserDep, SessionDep
from app.db.models.course import Course, CourseVisibility
from app.db.models.enrollment import Enrollment
from app.db.models.lesson import Lesson
from app.db.models.membership import UserOrgMembership
from app.db.models.section import Section
from app.schemas.lesson import LessonPublic

router = APIRouter(prefix="/learn", tags=["learn"])


@router.get("/courses/{course_slug}/sections/{section_slug}/lessons/{lesson_slug}")
async def get_lesson_for_learner(
    course_slug: str,
    section_slug: str,
    lesson_slug: str,
    user: CurrentUserDep,
    org: CurrentOrgDep,
    session: SessionDep,
) -> LessonPublic:
    lesson_result = await session.exec(
        select(Lesson)
        .join(Section, Section.id == Lesson.section_id)
        .join(Course, Course.id == Section.course_id)
        .where(Lesson.org_id == org.id)
        .where(Course.slug == course_slug)
        .where(Course.visibility == CourseVisibility.PUBLISHED)
        .where(Section.slug == section_slug)
        .where(Lesson.slug == lesson_slug)
    )
    lesson = lesson_result.first()
    if lesson is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Lesson not found")

    # Access gate: enrolled in the course OR any membership in the org (owners
    # and instructors get preview access without needing to enroll). On failure,
    # return 404 — not 403 — so we don't leak the lesson's existence.
    enrollment_result = await session.exec(
        select(Enrollment)
        .where(Enrollment.user_id == user.id)
        .where(Enrollment.course_id == lesson.course_id)
    )
    if enrollment_result.first() is not None:
        return lesson

    membership_result = await session.exec(
        select(UserOrgMembership)
        .where(UserOrgMembership.user_id == user.id)
        .where(UserOrgMembership.org_id == org.id)
    )
    if membership_result.first() is not None:
        return lesson

    raise HTTPException(status.HTTP_404_NOT_FOUND, "Lesson not found")
