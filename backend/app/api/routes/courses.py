from fastapi import APIRouter, HTTPException, status
from sqlmodel import select

from app.api.deps import CurrentMembershipDep, SessionDep
from app.db.models.course import Course
from app.db.models.membership import Role
from app.schemas.course import CourseCreate, CoursePublic

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
