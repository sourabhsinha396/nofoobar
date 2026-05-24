from uuid import UUID

from fastapi import APIRouter, HTTPException, Response, status
from sqlalchemy import func
from sqlmodel import select

from app.api.deps import CurrentMembershipDep, SessionDep
from app.db.models.course import Course
from app.db.models.membership import Role
from app.db.models.section import Section
from app.schemas.section import SectionCreate, SectionPublic, SectionUpdate

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


async def _get_section_or_404(
    session: SessionDep, org_id: UUID, course_slug: str, section_slug: str
) -> Section:
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


@router.patch("/{section_slug}")
async def update_section(
    course_slug: str,
    section_slug: str,
    payload: SectionUpdate,
    membership: CurrentMembershipDep,
    session: SessionDep,
) -> SectionPublic:
    if membership.role not in _AUTHOR_ROLES:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only owners and instructors can edit sections")

    section = await _get_section_or_404(session, membership.org_id, course_slug, section_slug)
    update_data = payload.model_dump(exclude_unset=True)

    if "slug" in update_data and update_data["slug"] != section.slug:
        existing = await session.exec(
            select(Section)
            .where(Section.course_id == section.course_id)
            .where(Section.slug == update_data["slug"])
        )
        if existing.first() is not None:
            raise HTTPException(status.HTTP_409_CONFLICT, "Slug already used in this course")
        section.slug = update_data["slug"]

    if "title" in update_data:
        section.title = update_data["title"]
    if "description" in update_data:
        section.description = update_data["description"]

    await session.commit()
    await session.refresh(section)
    return section


@router.delete("/{section_slug}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_section(
    course_slug: str,
    section_slug: str,
    membership: CurrentMembershipDep,
    session: SessionDep,
) -> Response:
    if membership.role not in _AUTHOR_ROLES:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only owners and instructors can delete sections")

    section = await _get_section_or_404(session, membership.org_id, course_slug, section_slug)
    await session.delete(section)
    await session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
