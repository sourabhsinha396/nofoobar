from uuid import UUID

from fastapi import APIRouter, HTTPException, status
from pydantic import ValidationError
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.api.deps import CurrentMembershipDep, SessionDep
from app.core.entitlements import plan_allows
from app.db.models.membership import Role, UserOrgMembership
from app.db.models.org_integration import IntegrationProvider, OrgIntegration
from app.schemas.integration import (
    IntegrationProviderInfo,
    OrgIntegrationCreate,
    OrgIntegrationPublic,
    OrgIntegrationUpdate,
)
from app.services.entitlements import plan_for_org
from app.services.integrations.base import Integration, IntegrationConfig
from app.services.integrations.registry import all_integrations, get_integration

router = APIRouter(prefix="/admin/integrations", tags=["admin-integrations"])


def _ensure_owner(membership: UserOrgMembership) -> None:
    # Integrations carry secrets and unlock paid-tier features, so management is
    # owner-only - instructors stay scoped to course/lesson edits.
    if membership.role != Role.OWNER:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only owners can manage integrations")


def _resolve(provider: IntegrationProvider) -> Integration:
    try:
        return get_integration(provider)
    except NotImplementedError:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, f"Integration {provider} is not available"
        ) from None


def _validate_config(integration: Integration, raw: dict) -> IntegrationConfig:
    try:
        return integration.config_model.model_validate(raw)
    except ValidationError as exc:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT, detail=exc.errors(include_url=False)
        ) from exc


def _to_public(row: OrgIntegration, integration: Integration) -> OrgIntegrationPublic:
    config = integration.config_model.model_validate(row.config)
    return OrgIntegrationPublic(
        id=row.id,
        provider=row.provider,
        enabled=row.enabled,
        config=config.masked(),
        created_at=row.created_at,
    )


async def _get_owned(
    session: AsyncSession, org_id: UUID, integration_id: UUID
) -> OrgIntegration:
    result = await session.exec(
        select(OrgIntegration)
        .where(OrgIntegration.id == integration_id)
        .where(OrgIntegration.org_id == org_id)
    )
    row = result.first()
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Integration not found")
    return row


@router.get("/available")
async def list_available_integrations(
    membership: CurrentMembershipDep, session: SessionDep
) -> list[IntegrationProviderInfo]:
    _ensure_owner(membership)
    plan = await plan_for_org(session, membership.org_id)
    return [
        IntegrationProviderInfo(
            provider=i.provider,
            min_plan=i.min_plan,
            allowed=plan_allows(plan, i.min_plan),
            config_schema=i.config_model.model_json_schema(),
        )
        for i in all_integrations()
    ]


@router.get("")
async def list_integrations(
    membership: CurrentMembershipDep, session: SessionDep
) -> list[OrgIntegrationPublic]:
    _ensure_owner(membership)
    result = await session.exec(
        select(OrgIntegration)
        .where(OrgIntegration.org_id == membership.org_id)
        .order_by(OrgIntegration.created_at)
    )
    return [_to_public(row, _resolve(row.provider)) for row in result.all()]


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_integration(
    payload: OrgIntegrationCreate, membership: CurrentMembershipDep, session: SessionDep
) -> OrgIntegrationPublic:
    _ensure_owner(membership)
    integration = _resolve(payload.provider)

    plan = await plan_for_org(session, membership.org_id)
    if not plan_allows(plan, integration.min_plan):
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            f"The {payload.provider} integration requires the {integration.min_plan} plan",
        )

    config = _validate_config(integration, payload.config)
    row = OrgIntegration(
        org_id=membership.org_id,
        provider=payload.provider,
        enabled=payload.enabled,
        encrypted_config=OrgIntegration.encrypt_config(config.to_storage()),
    )
    session.add(row)
    await session.commit()
    await session.refresh(row)
    return _to_public(row, integration)


@router.patch("/{integration_id}")
async def update_integration(
    integration_id: UUID,
    payload: OrgIntegrationUpdate,
    membership: CurrentMembershipDep,
    session: SessionDep,
) -> OrgIntegrationPublic:
    _ensure_owner(membership)
    row = await _get_owned(session, membership.org_id, integration_id)
    integration = _resolve(row.provider)

    if payload.enabled is not None:
        row.enabled = payload.enabled
    if payload.config is not None:
        config = _validate_config(integration, payload.config)
        row.encrypted_config = OrgIntegration.encrypt_config(config.to_storage())

    session.add(row)
    await session.commit()
    await session.refresh(row)
    return _to_public(row, integration)


@router.delete("/{integration_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_integration(
    integration_id: UUID, membership: CurrentMembershipDep, session: SessionDep
) -> None:
    _ensure_owner(membership)
    row = await _get_owned(session, membership.org_id, integration_id)
    await session.delete(row)
    await session.commit()
