from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import DateTime, UniqueConstraint
from sqlmodel import Field, Relationship

from app.db.models.common import TimestampedModel
from app.db.models.course import Course
from app.db.models.organization import Organization
from app.db.models.user import User


class Enrollment(TimestampedModel, table=True):
    __tablename__ = "enrollments"
    __table_args__ = (UniqueConstraint("user_id", "course_id", name="uq_enrollment_user_course"),)

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    user_id: UUID = Field(foreign_key="users.id", index=True)
    org_id: UUID = Field(foreign_key="organizations.id", index=True)
    course_id: UUID = Field(foreign_key="courses.id", index=True)
    expires_at: datetime | None = Field(
        default=None, sa_type=DateTime(timezone=True), nullable=True
    )

    user: User = Relationship()
    org: Organization = Relationship()
    course: Course = Relationship(back_populates="enrollments")
