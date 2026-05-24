from fastapi import APIRouter, HTTPException, status
from sqlalchemy.orm import selectinload
from sqlmodel import select

from app.api.deps import CurrentOrgDep, CurrentUserDep, SessionDep
from app.db.models.course import Course, CourseVisibility
from app.db.models.enrollment import Enrollment
from app.db.models.membership import Role, UserOrgMembership
from app.schemas.enrollment import EnrollmentPublic, EnrollmentWithCourse

router = APIRouter(tags=["enrollments"])


@router.post("/courses/{course_slug}/enroll")
async def enroll_in_course(
    course_slug: str,
    user: CurrentUserDep,
    org: CurrentOrgDep,
    session: SessionDep,
) -> EnrollmentPublic:
    course_result = await session.exec(
        select(Course)
        .where(Course.org_id == org.id)
        .where(Course.slug == course_slug)
        .where(Course.visibility == CourseVisibility.PUBLISHED)
    )
    course = course_result.first()
    if course is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"No course with slug {course_slug!r}")

    existing_result = await session.exec(
        select(Enrollment)
        .where(Enrollment.user_id == user.id)
        .where(Enrollment.course_id == course.id)
    )
    existing = existing_result.first()
    if existing is not None:
        return existing

    membership_result = await session.exec(
        select(UserOrgMembership)
        .where(UserOrgMembership.user_id == user.id)
        .where(UserOrgMembership.org_id == org.id)
    )
    if membership_result.first() is None:
        session.add(UserOrgMembership(user_id=user.id, org_id=org.id, role=Role.STUDENT))

    enrollment = Enrollment(user_id=user.id, org_id=org.id, course_id=course.id)
    session.add(enrollment)
    await session.commit()
    await session.refresh(enrollment)
    return enrollment


@router.get("/me/enrollments")
async def list_my_enrollments(
    user: CurrentUserDep,
    org: CurrentOrgDep,
    session: SessionDep,
) -> list[EnrollmentWithCourse]:
    result = await session.exec(
        select(Enrollment)
        .where(Enrollment.user_id == user.id)
        .where(Enrollment.org_id == org.id)
        .options(selectinload(Enrollment.course))
        .order_by(Enrollment.created_at.desc())
    )
    return list(result.all())
