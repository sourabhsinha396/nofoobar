from fastapi import APIRouter, HTTPException, status
from sqlalchemy.orm import selectinload
from sqlmodel import select

from app.api.deps import CurrentOrgDep, SessionDep
from app.db.models.course import Course, CourseVisibility
from app.db.models.section import Section
from app.schemas.course import CourseLanding, CourseSummary

router = APIRouter(prefix="/public/courses", tags=["public-courses"])


@router.get("")
async def list_published_courses(
    org: CurrentOrgDep, session: SessionDep
) -> list[CourseSummary]:
    result = await session.exec(
        select(Course)
        .where(Course.org_id == org.id)
        .where(Course.visibility == CourseVisibility.PUBLISHED)
        .order_by(Course.created_at)
    )
    return list(result.all())


@router.get("/{slug}")
async def get_published_course(
    slug: str, org: CurrentOrgDep, session: SessionDep
) -> CourseLanding:
    result = await session.exec(
        select(Course)
        .where(Course.org_id == org.id)
        .where(Course.slug == slug)
        .where(Course.visibility == CourseVisibility.PUBLISHED)
        .options(selectinload(Course.sections).selectinload(Section.lessons))
    )
    course = result.first()
    if course is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"No course with slug {slug!r}")
    return course
