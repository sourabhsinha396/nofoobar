from fastapi import APIRouter, HTTPException, status
from sqlalchemy import func
from sqlmodel import select

from app.api.deps import CurrentMembershipDep, SessionDep
from app.db.models.course import Course
from app.db.models.membership import Role
from app.db.models.section import Section
from app.schemas.section import SectionCreate, SectionPublic

router = APIRouter(prefix="/courses/{course_slug}/sections", tags=["sections"])

_AUTHOR_ROLES = {Role.OWNER, Role.INSTRUCTOR}


async def _get_course_or_404(session: SessionDep, org_id, course_slug: str) -> Course:
    result = await session.exec(
        select(Course).where(Course.org_id == org_id).where(Course.slug == course_slug)
    )
    course = result.first()
    if course is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"No course with slug {course_slug!r}")
    return course


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_section(
    course_slug: str,
    payload: SectionCreate,
    membership: CurrentMembershipDep,
    session: SessionDep,
) -> SectionPublic:
    if membership.role not in _AUTHOR_ROLES:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only owners and instructors can create sections")

    course = await _get_course_or_404(session, membership.org_id, course_slug)

    existing = await session.exec(
        select(Section).where(Section.course_id == course.id).where(Section.slug == payload.slug)
    )
    if existing.first() is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "Slug already used in this course")

    max_position_result = await session.exec(
        select(func.max(Section.position)).where(Section.course_id == course.id)
    )
    current_max = max_position_result.first()
    next_position = 0 if current_max is None else current_max + 1

    section = Section(
        org_id=membership.org_id,
        course_id=course.id,
        slug=payload.slug,
        title=payload.title,
        description=payload.description,
        position=next_position,
    )
    session.add(section)
    await session.commit()
    await session.refresh(section)
    return section


@router.get("")
async def list_sections(
    course_slug: str,
    membership: CurrentMembershipDep,
    session: SessionDep,
) -> list[SectionPublic]:
    course = await _get_course_or_404(session, membership.org_id, course_slug)
    result = await session.exec(
        select(Section).where(Section.course_id == course.id).order_by(Section.position)
    )
    return list(result.all())
