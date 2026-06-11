from unittest.mock import MagicMock

import pytest

from app.db.models.membership import Role
from app.tests.factories.course import CourseFactory
from app.tests.factories.section import SectionFactory

HOSTS = ["localhost", "acme.nofoobar.app"]


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


# ---------- PATCH /sections/{section_slug} ----------


def test_patch_section_title_only(client, mock_session, fake_membership):
    section = SectionFactory.build(slug="intro", title="Old", org_id=fake_membership.org_id)
    mock_session.exec.return_value.first.return_value = section
    response = client.patch(
        "/api/v1/courses/c/sections/intro",
        json={"title": "New"},
        headers={"Host": "localhost"},
    )
    assert response.status_code == 200
    assert response.json()["title"] == "New"
    assert section.title == "New"


def test_patch_section_description_can_be_cleared(client, mock_session, fake_membership):
    section = SectionFactory.build(slug="intro", description="Old", org_id=fake_membership.org_id)
    mock_session.exec.return_value.first.return_value = section
    response = client.patch(
        "/api/v1/courses/c/sections/intro",
        json={"description": None},
        headers={"Host": "localhost"},
    )
    assert response.status_code == 200
    assert section.description is None


def test_patch_section_slug_with_conflict(client, mock_session, fake_membership):
    section = SectionFactory.build(slug="intro", org_id=fake_membership.org_id)
    other = SectionFactory.build(slug="taken", course_id=section.course_id, org_id=fake_membership.org_id)
    mock_session.exec.side_effect = _exec_results(section, other)
    response = client.patch(
        "/api/v1/courses/c/sections/intro",
        json={"slug": "taken"},
        headers={"Host": "localhost"},
    )
    assert response.status_code == 409


def test_patch_section_slug_succeeds_when_unique(client, mock_session, fake_membership):
    section = SectionFactory.build(slug="intro", org_id=fake_membership.org_id)
    mock_session.exec.side_effect = _exec_results(section, None)
    response = client.patch(
        "/api/v1/courses/c/sections/intro",
        json={"slug": "fresh"},
        headers={"Host": "localhost"},
    )
    assert response.status_code == 200
    assert response.json()["slug"] == "fresh"


def test_patch_section_rejects_students(client, mock_session, fake_membership):
    fake_membership.role = Role.STUDENT
    response = client.patch(
        "/api/v1/courses/c/sections/intro",
        json={"title": "Nope"},
        headers={"Host": "localhost"},
    )
    assert response.status_code == 403


def test_patch_section_404_when_missing(client, mock_session, fake_membership):
    mock_session.exec.return_value.first.return_value = None
    response = client.patch(
        "/api/v1/courses/c/sections/ghost",
        json={"title": "X"},
        headers={"Host": "localhost"},
    )
    assert response.status_code == 404


def test_patch_section_requires_authentication(client, mock_session):
    response = client.patch(
        "/api/v1/courses/c/sections/intro",
        json={"title": "X"},
        headers={"Host": "localhost"},
    )
    assert response.status_code == 401


# ---------- DELETE /sections/{section_slug} ----------


def test_delete_section_returns_204(client, mock_session, fake_membership):
    section = SectionFactory.build(slug="intro", org_id=fake_membership.org_id)
    mock_session.exec.return_value.first.return_value = section
    response = client.delete(
        "/api/v1/courses/c/sections/intro",
        headers={"Host": "localhost"},
    )
    assert response.status_code == 204
    mock_session.delete.assert_called_once_with(section)


def test_delete_section_rejects_students(client, mock_session, fake_membership):
    fake_membership.role = Role.STUDENT
    response = client.delete(
        "/api/v1/courses/c/sections/intro",
        headers={"Host": "localhost"},
    )
    assert response.status_code == 403


def test_delete_section_404_when_missing(client, mock_session, fake_membership):
    mock_session.exec.return_value.first.return_value = None
    response = client.delete(
        "/api/v1/courses/c/sections/ghost",
        headers={"Host": "localhost"},
    )
    assert response.status_code == 404


# ---------- PATCH /courses/{course_slug}/sections/reorder ----------


def test_reorder_sections_happy_path(client, mock_session, fake_membership):
    course = CourseFactory.build(slug="intro", org_id=fake_membership.org_id)
    s1 = SectionFactory.build(course_id=course.id, org_id=fake_membership.org_id, position=0)
    s2 = SectionFactory.build(course_id=course.id, org_id=fake_membership.org_id, position=1)
    s3 = SectionFactory.build(course_id=course.id, org_id=fake_membership.org_id, position=2)
    # exec order: course lookup, sections list
    mock_session.exec.side_effect = [
        MagicMock(first=MagicMock(return_value=course)),
        MagicMock(all=MagicMock(return_value=[s1, s2, s3])),
    ]
    response = client.patch(
        "/api/v1/courses/intro/sections/reorder",
        json={"ids": [str(s3.id), str(s1.id), str(s2.id)]},
        headers={"Host": "localhost"},
    )
    assert response.status_code == 204
    assert s3.position == 0
    assert s1.position == 1
    assert s2.position == 2
    mock_session.commit.assert_called_once()


def test_reorder_sections_400_when_id_missing(client, mock_session, fake_membership):
    course = CourseFactory.build(slug="intro", org_id=fake_membership.org_id)
    s1 = SectionFactory.build(course_id=course.id, org_id=fake_membership.org_id)
    s2 = SectionFactory.build(course_id=course.id, org_id=fake_membership.org_id)
    mock_session.exec.side_effect = [
        MagicMock(first=MagicMock(return_value=course)),
        MagicMock(all=MagicMock(return_value=[s1, s2])),
    ]
    response = client.patch(
        "/api/v1/courses/intro/sections/reorder",
        json={"ids": [str(s1.id)]},  # missing s2
        headers={"Host": "localhost"},
    )
    assert response.status_code == 400


def test_reorder_sections_400_when_extra_id_present(client, mock_session, fake_membership):
    from uuid import uuid4
    course = CourseFactory.build(slug="intro", org_id=fake_membership.org_id)
    s1 = SectionFactory.build(course_id=course.id, org_id=fake_membership.org_id)
    mock_session.exec.side_effect = [
        MagicMock(first=MagicMock(return_value=course)),
        MagicMock(all=MagicMock(return_value=[s1])),
    ]
    response = client.patch(
        "/api/v1/courses/intro/sections/reorder",
        json={"ids": [str(s1.id), str(uuid4())]},  # extra UUID not in course
        headers={"Host": "localhost"},
    )
    assert response.status_code == 400


def test_reorder_sections_400_on_duplicate_ids(client, mock_session, fake_membership):
    course = CourseFactory.build(slug="intro", org_id=fake_membership.org_id)
    s1 = SectionFactory.build(course_id=course.id, org_id=fake_membership.org_id)
    s2 = SectionFactory.build(course_id=course.id, org_id=fake_membership.org_id)
    mock_session.exec.side_effect = [
        MagicMock(first=MagicMock(return_value=course)),
        MagicMock(all=MagicMock(return_value=[s1, s2])),
    ]
    response = client.patch(
        "/api/v1/courses/intro/sections/reorder",
        json={"ids": [str(s1.id), str(s1.id)]},  # duplicate, s2 missing in effect
        headers={"Host": "localhost"},
    )
    assert response.status_code == 400


def test_reorder_sections_rejects_students(client, mock_session, fake_membership):
    fake_membership.role = Role.STUDENT
    response = client.patch(
        "/api/v1/courses/intro/sections/reorder",
        json={"ids": []},
        headers={"Host": "localhost"},
    )
    assert response.status_code == 403


def test_reorder_sections_404_when_course_missing(client, mock_session, fake_membership):
    mock_session.exec.side_effect = _exec_results(None)
    response = client.patch(
        "/api/v1/courses/ghost/sections/reorder",
        json={"ids": []},
        headers={"Host": "localhost"},
    )
    assert response.status_code == 404


def test_reorder_sections_requires_authentication(client, mock_session):
    response = client.patch(
        "/api/v1/courses/intro/sections/reorder",
        json={"ids": []},
        headers={"Host": "localhost"},
    )
    assert response.status_code == 401


def test_reorder_sections_empty_list_is_ok_for_empty_course(client, mock_session, fake_membership):
    course = CourseFactory.build(slug="empty", org_id=fake_membership.org_id)
    mock_session.exec.side_effect = [
        MagicMock(first=MagicMock(return_value=course)),
        MagicMock(all=MagicMock(return_value=[])),
    ]
    response = client.patch(
        "/api/v1/courses/empty/sections/reorder",
        json={"ids": []},
        headers={"Host": "localhost"},
    )
    assert response.status_code == 204


def test_delete_section_requires_authentication(client, mock_session):
    response = client.delete(
        "/api/v1/courses/c/sections/intro",
        headers={"Host": "localhost"},
    )
    assert response.status_code == 401
