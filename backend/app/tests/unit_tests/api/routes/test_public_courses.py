import pytest

from app.db.models.course import CourseVisibility
from app.tests.factories.course import CourseFactory
from app.tests.factories.lesson import LessonFactory
from app.tests.factories.section import SectionFactory

HOSTS = ["localhost", "acme.algoholic.app"]


# ---------- GET /public/courses ----------


@pytest.mark.parametrize("host", HOSTS)
def test_list_published_courses_returns_published_only(client, mock_session, fake_org, host):
    courses = [
        CourseFactory.build(
            slug="a", title="A", org_id=fake_org.id, visibility=CourseVisibility.PUBLISHED
        ),
        CourseFactory.build(
            slug="b", title="B", org_id=fake_org.id, visibility=CourseVisibility.PUBLISHED
        ),
    ]
    mock_session.exec.return_value.all.return_value = courses
    response = client.get("/api/v1/public/courses", headers={"Host": host})
    assert response.status_code == 200
    body = response.json()
    assert {c["slug"] for c in body} == {"a", "b"}


def test_list_published_courses_does_not_require_authentication(client, mock_session, fake_org):
    mock_session.exec.return_value.all.return_value = []
    response = client.get("/api/v1/public/courses", headers={"Host": "localhost"})
    assert response.status_code == 200


def test_list_published_courses_query_filters_by_org_and_visibility(client, mock_session, fake_org):
    mock_session.exec.return_value.all.return_value = []
    client.get("/api/v1/public/courses", headers={"Host": "localhost"})
    called_stmt = mock_session.exec.call_args.args[0]
    compiled = str(called_stmt.compile(compile_kwargs={"literal_binds": True})).lower()
    assert "org_id" in compiled
    assert fake_org.id.hex in compiled
    assert "visibility" in compiled
    assert "published" in compiled


def test_list_published_courses_response_omits_visibility_and_org_id(
    client, mock_session, fake_org
):
    course = CourseFactory.build(
        slug="a", title="A", org_id=fake_org.id, visibility=CourseVisibility.PUBLISHED
    )
    mock_session.exec.return_value.all.return_value = [course]
    response = client.get("/api/v1/public/courses", headers={"Host": "localhost"})
    body = response.json()
    assert len(body) == 1
    assert "visibility" not in body[0]
    assert "org_id" not in body[0]
    assert set(body[0].keys()) == {
        "id", "slug", "title", "description", "price_cents", "currency",
        "logo_url", "level", "tags",
    }


# ---------- GET /public/courses/{slug} ----------


def _build_landing_course(org_id):
    lesson = LessonFactory.build(
        org_id=org_id,
        slug="welcome",
        title="Welcome",
    )
    section = SectionFactory.build(
        org_id=org_id,
        slug="getting-started",
        title="Getting started",
        position=0,
    )
    section.lessons = [lesson]
    course = CourseFactory.build(
        slug="intro",
        title="Intro",
        org_id=org_id,
        visibility=CourseVisibility.PUBLISHED,
    )
    course.sections = [section]
    return course


def test_get_published_course_returns_landing_with_outline(client, mock_session, fake_org):
    course = _build_landing_course(fake_org.id)
    mock_session.exec.return_value.first.return_value = course
    response = client.get("/api/v1/public/courses/intro", headers={"Host": "localhost"})
    assert response.status_code == 200
    body = response.json()
    assert body["slug"] == "intro"
    assert body["title"] == "Intro"
    assert len(body["sections"]) == 1
    section = body["sections"][0]
    assert section["slug"] == "getting-started"
    assert len(section["lessons"]) == 1
    lesson = section["lessons"][0]
    assert lesson["slug"] == "welcome"
    assert lesson["title"] == "Welcome"
    assert lesson["content_type"] == "article"


def test_get_published_course_lesson_outline_omits_content_body(client, mock_session, fake_org):
    course = _build_landing_course(fake_org.id)
    mock_session.exec.return_value.first.return_value = course
    response = client.get("/api/v1/public/courses/intro", headers={"Host": "localhost"})
    lesson = response.json()["sections"][0]["lessons"][0]
    assert "content" not in lesson
    assert set(lesson.keys()) == {"id", "slug", "title", "content_type", "position"}


def test_get_published_course_response_omits_visibility_and_org_id(client, mock_session, fake_org):
    course = _build_landing_course(fake_org.id)
    mock_session.exec.return_value.first.return_value = course
    response = client.get("/api/v1/public/courses/intro", headers={"Host": "localhost"})
    body = response.json()
    assert "visibility" not in body
    assert "org_id" not in body


def test_get_published_course_404_when_missing(client, mock_session, fake_org):
    mock_session.exec.return_value.first.return_value = None
    response = client.get("/api/v1/public/courses/ghost", headers={"Host": "localhost"})
    assert response.status_code == 404


def test_get_published_course_does_not_require_authentication(client, mock_session, fake_org):
    course = _build_landing_course(fake_org.id)
    mock_session.exec.return_value.first.return_value = course
    response = client.get("/api/v1/public/courses/intro", headers={"Host": "localhost"})
    assert response.status_code == 200


def test_get_published_course_query_filters_by_published_visibility(client, mock_session, fake_org):
    mock_session.exec.return_value.first.return_value = None
    client.get("/api/v1/public/courses/intro", headers={"Host": "localhost"})
    called_stmt = mock_session.exec.call_args.args[0]
    compiled = str(called_stmt.compile(compile_kwargs={"literal_binds": True})).lower()
    assert "visibility" in compiled
    assert "published" in compiled
    assert fake_org.id.hex in compiled


def test_get_published_course_treats_draft_as_missing(client, mock_session, fake_org):
    # The query itself filters out drafts; from the route's perspective the
    # session simply returns None for a draft course, so it should 404 the same
    # way a missing course does.
    mock_session.exec.return_value.first.return_value = None
    response = client.get("/api/v1/public/courses/draft-only", headers={"Host": "localhost"})
    assert response.status_code == 404


# ---------- regression: existing /api/v1/courses still requires auth ----------


def test_authenticated_courses_route_still_requires_auth(client, mock_session):
    response = client.get("/api/v1/courses", headers={"Host": "localhost"})
    assert response.status_code == 401
