from unittest.mock import MagicMock

import pytest

from app.db.models.course import CourseVisibility
from app.db.models.enrollment import Enrollment
from app.db.models.membership import Role
from app.tests.factories.course import CourseFactory
from app.tests.factories.enrollment import EnrollmentFactory
from app.tests.factories.membership import UserOrgMembershipFactory

HOSTS = ["localhost", "acme.nofoobar.app"]


def _exec_results(*first_values):
    """Build a list of MagicMocks each returning the given value from `.first()`.

    Used to drive `mock_session.exec.side_effect` through a sequence of queries.
    """
    return [MagicMock(first=MagicMock(return_value=v)) for v in first_values]


# ---------- POST /courses/{slug}/enroll ----------


def test_enroll_requires_authentication(client, mock_session, fake_org):
    response = client.post("/api/v1/courses/intro/enroll", headers={"Host": "localhost"})
    assert response.status_code == 401


@pytest.mark.parametrize("host", HOSTS)
def test_enroll_creates_enrollment_for_new_user(
    client, mock_session, fake_org, authed_user, host
):
    course = CourseFactory.build(
        slug="intro", org_id=fake_org.id, visibility=CourseVisibility.PUBLISHED
    )
    # exec order: course lookup, existing enrollment lookup, membership lookup
    mock_session.exec.side_effect = _exec_results(course, None, None)

    response = client.post("/api/v1/courses/intro/enroll", headers={"Host": host})
    assert response.status_code == 200
    body = response.json()
    assert body["user_id"] == str(authed_user.id)
    assert body["org_id"] == str(fake_org.id)
    assert body["course_id"] == str(course.id)


def test_enroll_auto_creates_student_membership_when_user_has_none(
    client, mock_session, fake_org, authed_user
):
    course = CourseFactory.build(
        slug="intro", org_id=fake_org.id, visibility=CourseVisibility.PUBLISHED
    )
    mock_session.exec.side_effect = _exec_results(course, None, None)

    client.post("/api/v1/courses/intro/enroll", headers={"Host": "localhost"})

    added = [call.args[0] for call in mock_session.add.call_args_list]
    membership_adds = [obj for obj in added if hasattr(obj, "role")]
    assert len(membership_adds) == 1
    assert membership_adds[0].role == Role.STUDENT
    assert membership_adds[0].user_id == authed_user.id
    assert membership_adds[0].org_id == fake_org.id


def test_enroll_does_not_create_membership_when_user_already_member(
    client, mock_session, fake_org, authed_user
):
    course = CourseFactory.build(
        slug="intro", org_id=fake_org.id, visibility=CourseVisibility.PUBLISHED
    )
    existing_membership = UserOrgMembershipFactory.build(
        user_id=authed_user.id, org_id=fake_org.id, role=Role.OWNER
    )
    mock_session.exec.side_effect = _exec_results(course, None, existing_membership)

    response = client.post("/api/v1/courses/intro/enroll", headers={"Host": "localhost"})
    assert response.status_code == 200

    added = [call.args[0] for call in mock_session.add.call_args_list]
    membership_adds = [obj for obj in added if hasattr(obj, "role")]
    assert membership_adds == []


def test_enroll_is_idempotent_when_already_enrolled(
    client, mock_session, fake_org, authed_user
):
    course = CourseFactory.build(
        slug="intro", org_id=fake_org.id, visibility=CourseVisibility.PUBLISHED
    )
    existing_enrollment = EnrollmentFactory.build(
        user_id=authed_user.id, org_id=fake_org.id, course_id=course.id
    )
    mock_session.exec.side_effect = _exec_results(course, existing_enrollment)

    response = client.post("/api/v1/courses/intro/enroll", headers={"Host": "localhost"})
    assert response.status_code == 200
    body = response.json()
    assert body["id"] == str(existing_enrollment.id)

    # Should not have added anything new (no new enrollment, no new membership)
    assert mock_session.add.call_args_list == []


def test_enroll_404_when_course_missing(client, mock_session, fake_org, authed_user):
    mock_session.exec.side_effect = _exec_results(None)
    response = client.post("/api/v1/courses/ghost/enroll", headers={"Host": "localhost"})
    assert response.status_code == 404


def test_enroll_treats_draft_course_as_missing(
    client, mock_session, fake_org, authed_user
):
    # The query filters by visibility=published, so a draft course just returns
    # None at the route layer - the same 404 path as a missing course.
    mock_session.exec.side_effect = _exec_results(None)
    response = client.post("/api/v1/courses/draft-only/enroll", headers={"Host": "localhost"})
    assert response.status_code == 404


def test_enroll_query_filters_by_org_slug_and_published_visibility(
    client, mock_session, fake_org, authed_user
):
    mock_session.exec.side_effect = _exec_results(None)
    client.post("/api/v1/courses/intro/enroll", headers={"Host": "localhost"})
    called_stmt = mock_session.exec.call_args_list[0].args[0]
    compiled = str(called_stmt.compile(compile_kwargs={"literal_binds": True})).lower()
    assert fake_org.id.hex in compiled
    assert "'intro'" in compiled
    assert "visibility" in compiled
    assert "published" in compiled


# ---------- GET /me/enrollments ----------


def test_list_my_enrollments_requires_authentication(client, mock_session, fake_org):
    response = client.get("/api/v1/me/enrollments", headers={"Host": "localhost"})
    assert response.status_code == 401


def _enrollment_with_course(user_id, org_id, *, slug="intro", title="Intro"):
    course = CourseFactory.build(slug=slug, title=title, org_id=org_id)
    enrollment = EnrollmentFactory.build(
        user_id=user_id, org_id=org_id, course_id=course.id
    )
    enrollment.course = course
    return enrollment


def test_list_my_enrollments_returns_user_enrollments(
    client, mock_session, fake_org, authed_user
):
    enrollments = [
        _enrollment_with_course(authed_user.id, fake_org.id, slug="a", title="A"),
        _enrollment_with_course(authed_user.id, fake_org.id, slug="b", title="B"),
    ]
    mock_session.exec.return_value.all.return_value = enrollments

    response = client.get("/api/v1/me/enrollments", headers={"Host": "localhost"})
    assert response.status_code == 200
    body = response.json()
    assert len(body) == 2
    assert all(e["user_id"] == str(authed_user.id) for e in body)
    assert {e["course"]["slug"] for e in body} == {"a", "b"}


def test_list_my_enrollments_filters_by_user_and_org(
    client, mock_session, fake_org, authed_user
):
    mock_session.exec.return_value.all.return_value = []
    client.get("/api/v1/me/enrollments", headers={"Host": "localhost"})
    called_stmt = mock_session.exec.call_args.args[0]
    compiled = str(called_stmt.compile(compile_kwargs={"literal_binds": True})).lower()
    assert authed_user.id.hex in compiled
    assert fake_org.id.hex in compiled


def test_enrollment_response_omits_updated_at(client, mock_session, fake_org, authed_user):
    enrollment = _enrollment_with_course(authed_user.id, fake_org.id)
    mock_session.exec.return_value.all.return_value = [enrollment]

    response = client.get("/api/v1/me/enrollments", headers={"Host": "localhost"})
    body = response.json()
    assert "updated_at" not in body[0]
    assert set(body[0].keys()) == {
        "id",
        "user_id",
        "org_id",
        "course_id",
        "created_at",
        "expires_at",
        "course",
    }
    assert set(body[0]["course"].keys()) == {
        "id",
        "slug",
        "title",
        "description",
        "price_cents",
        "currency",
        "logo_url",
        "level",
        "tags",
    }


# ---------- safety net: Enrollment model invariants ----------


def test_enrollment_table_has_unique_user_course():
    """Catches a regression if the (user_id, course_id) unique constraint goes away."""
    table = Enrollment.__table__
    uniques = [c for c in table.constraints if c.__class__.__name__ == "UniqueConstraint"]
    assert any(
        {col.name for col in c.columns} == {"user_id", "course_id"} for c in uniques
    )
