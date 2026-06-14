from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel

from app.core.entitlements import PlanTier
from app.db.models.org_integration import IntegrationProvider


class IntegrationProviderInfo(BaseModel):
    """Describes an available provider so the admin UI can render its config
    form generically from `config_schema` and gate it by `min_plan`.

    `allowed` reflects whether the current org's plan can use it, so the UI can
    show a pro-locked state without a failed create attempt."""

    provider: IntegrationProvider
    min_plan: PlanTier
    allowed: bool
    config_schema: dict[str, Any]


class OrgIntegrationPublic(BaseModel):
    """A configured integration as returned through the API. `config` is the
    provider config with secret fields masked - real secrets never leave the
    server."""

    id: UUID
    provider: IntegrationProvider
    enabled: bool
    config: dict[str, Any]
    created_at: datetime


class OrgIntegrationCreate(BaseModel):
    provider: IntegrationProvider
    # Validated against the provider's config_model in the route, not here, so
    # each provider owns its own field rules.
    config: dict[str, Any]
    enabled: bool = True


class OrgIntegrationUpdate(BaseModel):
    enabled: bool | None = None
    # When present, replaces the whole config (must be complete, including any
    # secret) - we don't merge partial secrets.
    config: dict[str, Any] | None = None
