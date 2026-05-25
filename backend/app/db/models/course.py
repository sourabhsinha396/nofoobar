from enum import StrEnum
from typing import TYPE_CHECKING
from uuid import UUID, uuid4

from sqlalchemy import Enum as SAEnum
from sqlalchemy import UniqueConstraint
from sqlmodel import Field, Relationship

from app.db.models.common import TimestampedModel
from app.db.models.organization import Organization

if TYPE_CHECKING:
    from app.db.models.enrollment import Enrollment
    from app.db.models.section import Section


class CourseVisibility(StrEnum):
    DRAFT = "draft"
    PUBLISHED = "published"


class Course(TimestampedModel, table=True):
    __tablename__ = "courses"
    __table_args__ = (UniqueConstraint("org_id", "slug", name="uq_course_org_slug"),)

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    org_id: UUID = Field(foreign_key="organizations.id", index=True)
    slug: str = Field(max_length=63)
    title: str = Field(max_length=255)
    description: str | None = Field(default=None, max_length=2000)
    visibility: CourseVisibility = Field(
        default=CourseVisibility.DRAFT,
        sa_type=SAEnum(
            CourseVisibility,
            name="course_visibility",
            values_callable=lambda enum: [m.value for m in enum],
        ),
        sa_column_kwargs={"server_default": CourseVisibility.DRAFT.value},
    )
    # Pricing — null = free (enroll directly), int = paid (hosted checkout).
    # The base price the creator sets. At checkout, the buyer can choose any
    # connected provider + any currency the gateway supports; the backend
    # PPP-converts to the buyer's currency before creating the order.
    price_cents: int | None = Field(default=None)
    currency: str = Field(default="USD", max_length=3)

    org: Organization = Relationship()
    sections: list["Section"] = Relationship(
        back_populates="course",
        sa_relationship_kwargs={"order_by": "Section.position", "cascade": "all, delete-orphan"},
    )
    enrollments: list["Enrollment"] = Relationship(
        back_populates="course",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"},
    )
