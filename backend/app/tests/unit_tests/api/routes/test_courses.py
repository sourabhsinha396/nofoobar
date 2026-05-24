from unittest.mock import MagicMock

import pytest

from app.db.models.course import CourseVisibility
from app.db.models.membership import Role
from app.tests.factories.course import CourseFactory

HOSTS = ["localhost", "acme.algoholic.app"]


@pytest.mark.parametrize("role", [Role.OWNER, Role.INSTRUCTOR])
@pytest.mark.parametrize("host", HOSTS)
def test_create_course_succeeds_for_authors(client, mock_session, fake_membership, host, role):
    fake_membership.role = role
    mock_session.exec.return_value.first.return_value = None
    response = client.post(
        "/api/v1/courses",
        json={"slug": "intro", "title": "Intro to Algorithms", "description": "Start here."},
        headers={"Host": host},
    )
    assert response.status_code == 201
    body = response.json()
    assert body["slug"] == "intro"
    assert body["title"] == "Intro to Algorithms"
    assert body["org_id"] == str(fake_membership.org_id)


def test_create_course_scopes_org_id_from_membership(client, mock_session, fake_membership):
    mock_session.exec.return_value.first.return_value = None
    client.post(
        "/api/v1/courses",
        json={"slug": "intro", "title": "Intro"},
        headers={"Host": "localhost"},
    )
    added = mock_session.add.call_args.args[0]
    assert added.org_id == fake_membership.org_id


def test_create_course_rejects_students(client, mock_session, fake_membership):
    fake_membership.role = Role.STUDENT
    response = client.post(
        "/api/v1/courses",
        json={"slug": "intro", "title": "Intro"},
        headers={"Host": "localhost"},
    )
    assert response.status_code == 403


def test_create_course_rejects_duplicate_slug_within_org(client, mock_session, fake_membership):
    existing = CourseFactory.build(slug="intro", org_id=fake_membership.org_id)
    mock_session.exec.return_value.first.return_value = existing
    response = client.post(
        "/api/v1/courses",
        json={"slug": "intro", "title": "Intro"},
        headers={"Host": "localhost"},
    )
    assert response.status_code == 409


def test_create_course_requires_membership(client, mock_session, authed_user, fake_org):
    response = client.post(
        "/api/v1/courses",
        json={"slug": "intro", "title": "Intro"},
        headers={"Host": "localhost"},
    )
    assert response.status_code == 403


def test_create_course_requires_authentication(client, mock_session):
    response = client.post(
        "/api/v1/courses",
        json={"slug": "intro", "title": "Intro"},
        headers={"Host": "localhost"},
    )
    assert response.status_code == 401


@pytest.mark.parametrize("host", HOSTS)
def test_list_courses_returns_org_courses(client, mock_session, fake_membership, host):
    courses = [
        CourseFactory.build(slug="a", title="A", org_id=fake_membership.org_id),
        CourseFactory.build(slug="b", title="B", org_id=fake_membership.org_id),
    ]
    mock_session.exec.return_value.all.return_value = courses
    response = client.get("/api/v1/courses", headers={"Host": host})
    assert response.status_code == 200
    body = response.json()
    assert {c["slug"] for c in body} == {"a", "b"}
    assert all(c["org_id"] == str(fake_membership.org_id) for c in body)


def test_list_courses_filters_by_org_id_in_query(client, mock_session, fake_membership):
    mock_session.exec.return_value.all.return_value = []
    client.get("/api/v1/courses", headers={"Host": "localhost"})
    called_stmt = mock_session.exec.call_args.args[0]
    compiled = str(called_stmt.compile(compile_kwargs={"literal_binds": True}))
    assert "org_id" in compiled.lower()
    assert fake_membership.org_id.hex in compiled


def test_list_courses_requires_authentication(client, mock_session):
    response = client.get("/api/v1/courses", headers={"Host": "localhost"})
    assert response.status_code == 401


# ---------- PATCH /courses/{slug} ----------


def _exec_results(*first_values):
    return [MagicMock(first=MagicMock(return_value=v)) for v in first_values]


def test_patch_course_title_only(client, mock_session, fake_membership):
    course = CourseFactory.build(slug="intro", title="Old", org_id=fake_membership.org_id)
    mock_session.exec.return_value.first.return_value = course
    response = client.patch(
        "/api/v1/courses/intro",
        json={"title": "New"},
        headers={"Host": "localhost"},
    )
    assert response.status_code == 200
    assert response.json()["title"] == "New"
    assert course.title == "New"


def test_patch_course_slug_with_conflict(client, mock_session, fake_membership):
    course = CourseFactory.build(slug="intro", org_id=fake_membership.org_id)
    other = CourseFactory.build(slug="taken", org_id=fake_membership.org_id)
    mock_session.exec.side_effect = _exec_results(course, other)
    response = client.patch(
        "/api/v1/courses/intro",
        json={"slug": "taken"},
        headers={"Host": "localhost"},
    )
    assert response.status_code == 409


def test_patch_course_slug_succeeds_when_unique(client, mock_session, fake_membership):
    course = CourseFactory.build(slug="intro", org_id=fake_membership.org_id)
    mock_session.exec.side_effect = _exec_results(course, None)
    response = client.patch(
        "/api/v1/courses/intro",
        json={"slug": "fresh"},
        headers={"Host": "localhost"},
    )
    assert response.status_code == 200
    assert response.json()["slug"] == "fresh"


def test_patch_course_rejects_students(client, mock_session, fake_membership):
    fake_membership.role = Role.STUDENT
    response = client.patch(
        "/api/v1/courses/intro",
        json={"title": "Nope"},
        headers={"Host": "localhost"},
    )
    assert response.status_code == 403


def test_patch_course_404_when_missing(client, mock_session, fake_membership):
    mock_session.exec.return_value.first.return_value = None
    response = client.patch(
        "/api/v1/courses/ghost",
        json={"title": "X"},
        headers={"Host": "localhost"},
    )
    assert response.status_code == 404


def test_patch_course_requires_authentication(client, mock_session):
    response = client.patch(
        "/api/v1/courses/intro",
        json={"title": "X"},
        headers={"Host": "localhost"},
    )
    assert response.status_code == 401


# ---------- DELETE /courses/{slug} ----------


def test_delete_course_returns_204(client, mock_session, fake_membership):
    course = CourseFactory.build(slug="intro", org_id=fake_membership.org_id)
    mock_session.exec.return_value.first.return_value = course
    response = client.delete(
        "/api/v1/courses/intro",
        headers={"Host": "localhost"},
    )
    assert response.status_code == 204
    mock_session.delete.assert_called_once_with(course)


def test_delete_course_rejects_students(client, mock_session, fake_membership):
    fake_membership.role = Role.STUDENT
    response = client.delete(
        "/api/v1/courses/intro",
        headers={"Host": "localhost"},
    )
    assert response.status_code == 403


def test_delete_course_404_when_missing(client, mock_session, fake_membership):
    mock_session.exec.return_value.first.return_value = None
    response = client.delete(
        "/api/v1/courses/ghost",
        headers={"Host": "localhost"},
    )
    assert response.status_code == 404


def test_delete_course_requires_authentication(client, mock_session):
    response = client.delete(
        "/api/v1/courses/intro",
        headers={"Host": "localhost"},
    )
    assert response.status_code == 401


# ---------- visibility ----------


def test_new_course_defaults_to_draft(client, mock_session, fake_membership):
    mock_session.exec.return_value.first.return_value = None
    response = client.post(
        "/api/v1/courses",
        json={"slug": "intro", "title": "Intro"},
        headers={"Host": "localhost"},
    )
    assert response.status_code == 201
    assert response.json()["visibility"] == "draft"
    added = mock_session.add.call_args.args[0]
    assert added.visibility == CourseVisibility.DRAFT


def test_patch_course_publish(client, mock_session, fake_membership):
    course = CourseFactory.build(
        slug="intro", org_id=fake_membership.org_id, visibility=CourseVisibility.DRAFT
    )
    mock_session.exec.return_value.first.return_value = course
    response = client.patch(
        "/api/v1/courses/intro",
        json={"visibility": "published"},
        headers={"Host": "localhost"},
    )
    assert response.status_code == 200
    assert response.json()["visibility"] == "published"
    assert course.visibility == CourseVisibility.PUBLISHED


def test_patch_course_unpublish(client, mock_session, fake_membership):
    course = CourseFactory.build(
        slug="intro", org_id=fake_membership.org_id, visibility=CourseVisibility.PUBLISHED
    )
    mock_session.exec.return_value.first.return_value = course
    response = client.patch(
        "/api/v1/courses/intro",
        json={"visibility": "draft"},
        headers={"Host": "localhost"},
    )
    assert response.status_code == 200
    assert course.visibility == CourseVisibility.DRAFT


def test_patch_course_rejects_unknown_visibility(client, mock_session, fake_membership):
    response = client.patch(
        "/api/v1/courses/intro",
        json={"visibility": "archived"},
        headers={"Host": "localhost"},
    )
    assert response.status_code == 422


def test_get_course_includes_visibility(client, mock_session, fake_membership):
    course = CourseFactory.build(
        slug="intro", org_id=fake_membership.org_id, visibility=CourseVisibility.PUBLISHED
    )
    course.sections = []
    mock_session.exec.return_value.first.return_value = course
    response = client.get("/api/v1/courses/intro", headers={"Host": "localhost"})
    assert response.status_code == 200
    assert response.json()["visibility"] == "published"
