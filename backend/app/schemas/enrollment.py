from datetime import datetime
from uuid import UUID

from sqlmodel import SQLModel

from app.schemas.course import CourseSummary


class EnrollmentPublic(SQLModel):
    id: UUID
    user_id: UUID
    org_id: UUID
    course_id: UUID
    created_at: datetime
    expires_at: datetime | None = None


class EnrollmentWithCourse(EnrollmentPublic):
    course: CourseSummary
