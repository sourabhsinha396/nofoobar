from app.db.models.enrollment import Enrollment
from app.tests.factories.course import CourseFactory
from app.tests.factories.enrollment import EnrollmentFactory

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
