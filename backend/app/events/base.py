from datetime import UTC, datetime
from typing import ClassVar
from uuid import UUID

from pydantic import BaseModel, Field


def _utcnow() -> datetime:
    return datetime.now(UTC)


class DomainEvent(BaseModel):
    """Base for tenant-scoped domain events.

    A domain event is a plain, serialisable record that something happened in a
    tenant (an enrollment was created, a payment succeeded, ...). Routes/services
    emit these through a Dispatcher; integrations consume them. Events carry no
    behaviour.

    Each subclass sets a unique `event_type` string. Integrations declare which
    `event_type`s they subscribe to, so dispatch can route an event to only the
    integrations that care. `org_id` names the owning tenant - dispatch uses it
    to resolve that org's enabled integrations.
    """

    # Class-level constant, not an instance field. Subclasses override it.
    event_type: ClassVar[str]

    org_id: UUID
    occurred_at: datetime = Field(default_factory=_utcnow)
