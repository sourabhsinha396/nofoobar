from uuid import UUID

from app.events.base import DomainEvent

# Concrete domain events. Keep this list small and add events as real emit sites
# appear - an event only earns its place once something emits it and an
# integration can act on it.


class EnrollmentCreated(DomainEvent):
    """A user newly enrolled in a course. Emitted once per new enrollment - not
    re-emitted when an already-enrolled user re-hits the enroll endpoint."""

    event_type = "enrollment.created"

    enrollment_id: UUID
    course_id: UUID
    course_slug: str
    user_id: UUID
    user_email: str
