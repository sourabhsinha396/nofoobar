from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import HTTPException

from app.api.deps import get_current_membership
from app.db.models.membership import Role
from app.tests.factories.membership import UserOrgMembershipFactory
from app.tests.factories.organization import OrganizationFactory
from app.tests.factories.user import UserFactory


async def test_returns_membership_when_user_is_member():
    user = UserFactory.build()
    org = OrganizationFactory.build()
    membership = UserOrgMembershipFactory.build(user_id=user.id, org_id=org.id, role=Role.OWNER)
    session = AsyncMock()
    session.exec = AsyncMock(return_value=MagicMock(first=MagicMock(return_value=membership)))

    result = await get_current_membership(user=user, org=org, session=session)

    assert result is membership


async def test_raises_403_when_user_is_not_member():
    user = UserFactory.build()
    org = OrganizationFactory.build()
    session = AsyncMock()
    session.exec = AsyncMock(return_value=MagicMock(first=MagicMock(return_value=None)))

    with pytest.raises(HTTPException) as exc:
        await get_current_membership(user=user, org=org, session=session)
    assert exc.value.status_code == 403
