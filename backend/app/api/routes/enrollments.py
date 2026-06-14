from fastapi import APIRouter
from sqlalchemy.orm import selectinload
from sqlmodel import select

from app.api.deps import CurrentOrgDep, CurrentUserDep, SessionDep
from app.db.models.enrollment import Enrollment
from app.schemas.enrollment import EnrollmentWithCourse

router = APIRouter(tags=["enrollments"])


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
