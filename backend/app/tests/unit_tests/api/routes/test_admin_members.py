from unittest.mock import MagicMock

from app.core.security import verify_password
from app.db.models.membership import Role
from app.tests.factories.membership import UserOrgMembershipFactory
from app.tests.factories.user import UserFactory

PATH = "/api/v1/admin/members"


def _member_row(org_id, role=Role.STUDENT, **user_kwargs):
    user = UserFactory.build(is_superuser=False, **user_kwargs)
    m = UserOrgMembershipFactory.build(user_id=user.id, org_id=org_id, role=role)
    return user, m


def _result(rows=None, first=None):
    result = MagicMock()
    result.all.return_value = rows or []
    result.first.return_value = first
    return result


# ---------- GET ----------


def test_list_members_returns_roster(client, mock_session, fake_membership):
    rows = [
        _member_row(fake_membership.org_id, role=Role.OWNER),
        _member_row(fake_membership.org_id, role=Role.STUDENT),
    ]
    mock_session.exec.return_value.all.return_value = rows
    response = client.get(PATH, headers={"Host": "localhost"})
    assert response.status_code == 200
    body = response.json()
    assert [b["role"] for b in body] == ["owner", "student"]
    assert body[0]["email"] == rows[0][0].email
    assert body[0]["user_id"] == str(rows[0][0].id)


def test_list_members_requires_authentication(client, mock_session):
    response = client.get(PATH, headers={"Host": "localhost"})
    assert response.status_code == 401


def test_list_members_allows_instructor(client, mock_session, fake_membership):
    fake_membership.role = Role.INSTRUCTOR
    mock_session.exec.return_value.all.return_value = []
    response = client.get(PATH, headers={"Host": "localhost"})
    assert response.status_code == 200


def test_list_members_rejects_student(client, mock_session, fake_membership):
    fake_membership.role = Role.STUDENT
    response = client.get(PATH, headers={"Host": "localhost"})
    assert response.status_code == 403


def test_list_members_query_filters_by_org(client, mock_session, fake_membership):
    mock_session.exec.return_value.all.return_value = []
    client.get(PATH, headers={"Host": "localhost"})
    called_stmt = mock_session.exec.call_args.args[0]
    compiled = str(called_stmt.compile(compile_kwargs={"literal_binds": True})).lower()
    assert "org_id" in compiled
    assert fake_membership.org_id.hex in compiled


# ---------- PATCH ----------


def test_patch_member_updates_name_and_email(client, mock_session, fake_membership):
    fake_membership.role = Role.OWNER
    user, target = _member_row(fake_membership.org_id)
    mock_session.exec.side_effect = [
        _result(first=(user, target)),  # target lookup in this org
        _result(first=None),  # no memberships in other orgs
        _result(first=None),  # email not taken
    ]
    response = client.patch(
        f"{PATH}/{user.id}",
        json={"name": "New Name", "email": "new@example.com"},
        headers={"Host": "localhost"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["name"] == "New Name"
    assert body["email"] == "new@example.com"
    assert user.name == "New Name"
    assert user.email == "new@example.com"


def test_patch_member_hashes_new_password(client, mock_session, fake_membership):
    fake_membership.role = Role.OWNER
    user, target = _member_row(fake_membership.org_id, password_hash="old-hash")
    mock_session.exec.side_effect = [
        _result(first=(user, target)),
        _result(first=None),
    ]
    response = client.patch(
        f"{PATH}/{user.id}",
        json={"password": "s3cret-pass"},
        headers={"Host": "localhost"},
    )
    assert response.status_code == 200
    assert user.password_hash != "old-hash"
    assert verify_password("s3cret-pass", user.password_hash)


def test_patch_member_rejects_short_password(client, mock_session, fake_membership):
    fake_membership.role = Role.OWNER
    response = client.patch(
        f"{PATH}/{UserFactory.build().id}",
        json={"password": "short"},
        headers={"Host": "localhost"},
    )
    assert response.status_code == 422


def test_patch_member_requires_authentication(client, mock_session):
    response = client.patch(
        f"{PATH}/{UserFactory.build().id}",
        json={"name": "x"},
        headers={"Host": "localhost"},
    )
    assert response.status_code == 401


def test_patch_member_rejects_instructor(client, mock_session, fake_membership):
    fake_membership.role = Role.INSTRUCTOR
    response = client.patch(
        f"{PATH}/{UserFactory.build().id}",
        json={"name": "x"},
        headers={"Host": "localhost"},
    )
    assert response.status_code == 403


def test_patch_member_rejects_student(client, mock_session, fake_membership):
    fake_membership.role = Role.STUDENT
    response = client.patch(
        f"{PATH}/{UserFactory.build().id}",
        json={"name": "x"},
        headers={"Host": "localhost"},
    )
    assert response.status_code == 403


def test_patch_member_404_when_not_in_org(client, mock_session, fake_membership):
    fake_membership.role = Role.OWNER
    mock_session.exec.side_effect = [_result(first=None)]
    response = client.patch(
        f"{PATH}/{UserFactory.build().id}",
        json={"name": "x"},
        headers={"Host": "localhost"},
    )
    assert response.status_code == 404


def test_patch_member_rejects_user_in_other_orgs(client, mock_session, fake_membership):
    fake_membership.role = Role.OWNER
    user, target = _member_row(fake_membership.org_id)
    other_membership = UserOrgMembershipFactory.build(user_id=user.id)
    mock_session.exec.side_effect = [
        _result(first=(user, target)),
        _result(first=other_membership),  # member elsewhere too
    ]
    response = client.patch(
        f"{PATH}/{user.id}",
        json={"password": "new-password"},
        headers={"Host": "localhost"},
    )
    assert response.status_code == 403


def test_patch_member_rejects_superuser_target(client, mock_session, fake_membership):
    fake_membership.role = Role.OWNER
    user = UserFactory.build(is_superuser=True)
    target = UserOrgMembershipFactory.build(
        user_id=user.id, org_id=fake_membership.org_id, role=Role.STUDENT
    )
    mock_session.exec.side_effect = [_result(first=(user, target))]
    response = client.patch(
        f"{PATH}/{user.id}",
        json={"name": "x"},
        headers={"Host": "localhost"},
    )
    assert response.status_code == 403


def test_patch_member_owner_can_edit_self_despite_other_orgs(
    client, mock_session, fake_membership
):
    # The cross-org guard is about editing OTHER people's global accounts;
    # the owner editing their own account skips it entirely.
    fake_membership.role = Role.OWNER
    user = UserFactory.build(is_superuser=False, id=fake_membership.user_id)
    target = UserOrgMembershipFactory.build(
        user_id=user.id, org_id=fake_membership.org_id, role=Role.OWNER
    )
    mock_session.exec.side_effect = [_result(first=(user, target))]
    response = client.patch(
        f"{PATH}/{user.id}",
        json={"name": "Renamed Owner"},
        headers={"Host": "localhost"},
    )
    assert response.status_code == 200
    assert user.name == "Renamed Owner"


def test_patch_member_conflict_on_taken_email(client, mock_session, fake_membership):
    fake_membership.role = Role.OWNER
    user, target = _member_row(fake_membership.org_id)
    taken_by = UserFactory.build()
    mock_session.exec.side_effect = [
        _result(first=(user, target)),
        _result(first=None),
        _result(first=taken_by),  # email already registered
    ]
    response = client.patch(
        f"{PATH}/{user.id}",
        json={"email": "taken@example.com"},
        headers={"Host": "localhost"},
    )
    assert response.status_code == 409


def test_patch_member_same_email_skips_uniqueness_check(
    client, mock_session, fake_membership
):
    fake_membership.role = Role.OWNER
    user, target = _member_row(
        fake_membership.org_id, email="same@example.com"
    )
    mock_session.exec.side_effect = [
        _result(first=(user, target)),
        _result(first=None),
    ]
    response = client.patch(
        f"{PATH}/{user.id}",
        json={"email": "same@example.com", "name": "Kept Email"},
        headers={"Host": "localhost"},
    )
    assert response.status_code == 200
    assert mock_session.exec.call_count == 2
