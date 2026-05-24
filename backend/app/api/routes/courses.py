from fastapi import APIRouter, HTTPException, Response, status
from sqlalchemy.orm import selectinload
from sqlmodel import select

from app.api.deps import CurrentMembershipDep, SessionDep
from app.db.models.course import Course
from app.db.models.membership import Role
from app.schemas.course import CourseCreate, CourseDetailPublic, CoursePublic, CourseUpdate

router = APIRouter(prefix="/courses", tags=["courses"])

_AUTHOR_ROLES = {Role.OWNER, Role.INSTRUCTOR}


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_course(
    payload: CourseCreate,
    membership: CurrentMembershipDep,
    session: SessionDep,
) -> CoursePublic:
    if membership.role not in _AUTHOR_ROLES:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only owners and instructors can create courses")

    existing = await session.exec(
        select(Course).where(Course.org_id == membership.org_id).where(Course.slug == payload.slug)
    )
    if existing.first() is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "Slug already used in this organization")

    course = Course(
        org_id=membership.org_id,
        slug=payload.slug,
        title=payload.title,
        description=payload.description,
    )
    session.add(course)
    await session.commit()
    await session.refresh(course)
    return course


@router.get("")
async def list_courses(membership: CurrentMembershipDep, session: SessionDep) -> list[CoursePublic]:
    result = await session.exec(select(Course).where(Course.org_id == membership.org_id))
    return list(result.all())


@router.get("/{slug}")
async def get_course(
    slug: str, membership: CurrentMembershipDep, session: SessionDep
) -> CourseDetailPublic:
    result = await session.exec(
        select(Course)
        .where(Course.org_id == membership.org_id)
        .where(Course.slug == slug)
        .options(selectinload(Course.sections))
    )
    course = result.first()
    if course is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"No course with slug {slug!r}")
    return course


async def _get_course_for_write_or_404(
    session: SessionDep, org_id, slug: str
) -> Course:
    result = await session.exec(
        select(Course).where(Course.org_id == org_id).where(Course.slug == slug)
    )
    course = result.first()
    if course is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"No course with slug {slug!r}")
    return course


@router.patch("/{slug}")
async def update_course(
    slug: str,
    payload: CourseUpdate,
    membership: CurrentMembershipDep,
    session: SessionDep,
) -> CoursePublic:
    if membership.role not in _AUTHOR_ROLES:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only owners and instructors can edit courses")

    course = await _get_course_for_write_or_404(session, membership.org_id, slug)
    update_data = payload.model_dump(exclude_unset=True)

    if "slug" in update_data and update_data["slug"] != course.slug:
        existing = await session.exec(
            select(Course)
            .where(Course.org_id == membership.org_id)
            .where(Course.slug == update_data["slug"])
        )
        if existing.first() is not None:
            raise HTTPException(status.HTTP_409_CONFLICT, "Slug already used in this organization")
        course.slug = update_data["slug"]

    if "title" in update_data:
        course.title = update_data["title"]
    if "description" in update_data:
        course.description = update_data["description"]
    if "visibility" in update_data:
        course.visibility = update_data["visibility"]

    await session.commit()
    await session.refresh(course)
    return course


@router.delete("/{slug}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_course(
    slug: str,
    membership: CurrentMembershipDep,
    session: SessionDep,
) -> Response:
    if membership.role not in _AUTHOR_ROLES:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only owners and instructors can delete courses")

    course = await _get_course_for_write_or_404(session, membership.org_id, slug)
    await session.delete(course)
    await session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
