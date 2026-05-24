import pytest

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
