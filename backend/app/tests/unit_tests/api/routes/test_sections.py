from unittest.mock import MagicMock

import pytest

from app.db.models.membership import Role
from app.tests.factories.course import CourseFactory
from app.tests.factories.section import SectionFactory

HOSTS = ["localhost", "acme.algoholic.app"]


def _exec_results(*first_values):
    """Stage one MagicMock per session.exec call; .first() yields the matching value."""
    return [MagicMock(first=MagicMock(return_value=v)) for v in first_values]


@pytest.mark.parametrize("role", [Role.OWNER, Role.INSTRUCTOR])
@pytest.mark.parametrize("host", HOSTS)
def test_create_section_succeeds_for_authors(client, mock_session, fake_membership, host, role):
    fake_membership.role = role
    course = CourseFactory.build(slug="intro", org_id=fake_membership.org_id)
    mock_session.exec.side_effect = _exec_results(course, None, None)
    response = client.post(
        "/api/v1/courses/intro/sections",
        json={"slug": "getting-started", "title": "Getting started"},
        headers={"Host": host},
    )
    assert response.status_code == 201
    body = response.json()
    assert body["slug"] == "getting-started"
    assert body["title"] == "Getting started"
    assert body["org_id"] == str(fake_membership.org_id)
    assert body["course_id"] == str(course.id)
    assert body["position"] == 0


def test_create_section_assigns_next_position(client, mock_session, fake_membership):
    course = CourseFactory.build(slug="intro", org_id=fake_membership.org_id)
    mock_session.exec.side_effect = _exec_results(course, None, 4)
    response = client.post(
        "/api/v1/courses/intro/sections",
        json={"slug": "five", "title": "Five"},
        headers={"Host": "localhost"},
    )
    assert response.status_code == 201
    assert response.json()["position"] == 5
    added = mock_session.add.call_args.args[0]
    assert added.position == 5


def test_create_section_rejects_students(client, mock_session, fake_membership):
    fake_membership.role = Role.STUDENT
    response = client.post(
        "/api/v1/courses/intro/sections",
        json={"slug": "s1", "title": "S1"},
        headers={"Host": "localhost"},
    )
    assert response.status_code == 403


def test_create_section_404_when_course_missing(client, mock_session, fake_membership):
    mock_session.exec.side_effect = _exec_results(None)
    response = client.post(
        "/api/v1/courses/ghost/sections",
        json={"slug": "s1", "title": "S1"},
        headers={"Host": "localhost"},
    )
    assert response.status_code == 404


def test_create_section_rejects_duplicate_slug_within_course(client, mock_session, fake_membership):
    course = CourseFactory.build(slug="intro", org_id=fake_membership.org_id)
    existing = SectionFactory.build(slug="s1", course_id=course.id, org_id=fake_membership.org_id)
    mock_session.exec.side_effect = _exec_results(course, existing)
    response = client.post(
        "/api/v1/courses/intro/sections",
        json={"slug": "s1", "title": "S1"},
        headers={"Host": "localhost"},
    )
    assert response.status_code == 409


def test_create_section_scopes_org_id_from_membership(client, mock_session, fake_membership):
    course = CourseFactory.build(slug="intro", org_id=fake_membership.org_id)
    mock_session.exec.side_effect = _exec_results(course, None, None)
    client.post(
        "/api/v1/courses/intro/sections",
        json={"slug": "s1", "title": "S1"},
        headers={"Host": "localhost"},
    )
    added = mock_session.add.call_args.args[0]
    assert added.org_id == fake_membership.org_id
    assert added.course_id == course.id


def test_create_section_requires_authentication(client, mock_session):
    response = client.post(
        "/api/v1/courses/intro/sections",
        json={"slug": "s1", "title": "S1"},
        headers={"Host": "localhost"},
    )
    assert response.status_code == 401


@pytest.mark.parametrize("host", HOSTS)
def test_list_sections_returns_ordered_sections(client, mock_session, fake_membership, host):
    course = CourseFactory.build(slug="intro", org_id=fake_membership.org_id)
    sections = [
        SectionFactory.build(slug="a", position=0, course_id=course.id, org_id=fake_membership.org_id),
        SectionFactory.build(slug="b", position=1, course_id=course.id, org_id=fake_membership.org_id),
    ]
    course_result = MagicMock(first=MagicMock(return_value=course))
    sections_result = MagicMock(all=MagicMock(return_value=sections))
    mock_session.exec.side_effect = [course_result, sections_result]
    response = client.get("/api/v1/courses/intro/sections", headers={"Host": host})
    assert response.status_code == 200
    body = response.json()
    assert [s["slug"] for s in body] == ["a", "b"]


def test_list_sections_404_when_course_missing(client, mock_session, fake_membership):
    mock_session.exec.side_effect = _exec_results(None)
    response = client.get("/api/v1/courses/ghost/sections", headers={"Host": "localhost"})
    assert response.status_code == 404


def test_list_sections_requires_authentication(client, mock_session):
    response = client.get("/api/v1/courses/intro/sections", headers={"Host": "localhost"})
    assert response.status_code == 401


def test_get_course_returns_detail_with_sections(client, mock_session, fake_membership):
    course = CourseFactory.build(slug="intro", org_id=fake_membership.org_id)
    course.sections = [
        SectionFactory.build(slug="a", position=0, course_id=course.id, org_id=fake_membership.org_id),
        SectionFactory.build(slug="b", position=1, course_id=course.id, org_id=fake_membership.org_id),
    ]
    mock_session.exec.return_value.first.return_value = course
    response = client.get("/api/v1/courses/intro", headers={"Host": "localhost"})
    assert response.status_code == 200
    body = response.json()
    assert body["slug"] == "intro"
    assert [s["slug"] for s in body["sections"]] == ["a", "b"]


def test_get_course_404_when_missing(client, mock_session, fake_membership):
    mock_session.exec.return_value.first.return_value = None
    response = client.get("/api/v1/courses/ghost", headers={"Host": "localhost"})
    assert response.status_code == 404


def test_get_course_requires_authentication(client, mock_session):
    response = client.get("/api/v1/courses/intro", headers={"Host": "localhost"})
    assert response.status_code == 401
