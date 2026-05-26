from unittest.mock import MagicMock

import pytest

from app.db.models.lesson import ContentType, LessonVisibility
from app.db.models.membership import Role
from app.tests.factories.enrollment import EnrollmentFactory
from app.tests.factories.lesson import LessonFactory, tiptap_doc
from app.tests.factories.membership import UserOrgMembershipFactory

HOSTS = ["localhost", "acme.algoholic.app"]

LESSON_PATH = "/api/v1/learn/courses/intro/sections/getting-started/lessons/welcome"


def _exec_results(*first_values):
    return [MagicMock(first=MagicMock(return_value=v)) for v in first_values]


# ---------- auth gate ----------


def test_learn_requires_authentication(client, mock_session, fake_org):
    response = client.get(LESSON_PATH, headers={"Host": "localhost"})
    assert response.status_code == 401


# ---------- access paths ----------


def _published_lesson(**overrides):
    """LessonFactory.build with deterministic visibility/preview so access-path
    tests don't get tripped by polyfactory's randomness on these fields."""
    return LessonFactory.build(
        visibility=LessonVisibility.PUBLISHED,
        is_free_preview=False,
        **overrides,
    )


@pytest.mark.parametrize("host", HOSTS)
def test_enrolled_user_can_view_lesson(client, mock_session, fake_org, authed_user, host):
    lesson = _published_lesson(
        org_id=fake_org.id, slug="welcome", title="Welcome", content_type=ContentType.ARTICLE
    )
    enrollment = EnrollmentFactory.build(
        user_id=authed_user.id, org_id=fake_org.id, course_id=lesson.course_id
    )
    # exec order: lesson lookup, enrollment lookup
    mock_session.exec.side_effect = _exec_results(lesson, enrollment)

    response = client.get(LESSON_PATH, headers={"Host": host})
    assert response.status_code == 200
    body = response.json()
    assert body["slug"] == "welcome"
    assert body["title"] == "Welcome"
    assert body["content_type"] == "article"
    assert "content" in body


def test_org_member_without_enrollment_can_view_lesson(
    client, mock_session, fake_org, authed_user
):
    # Published lesson; member but no enrollment → falls through enrollment
    # lookup (None) to membership lookup (hit).
    lesson = _published_lesson(org_id=fake_org.id, slug="welcome")
    membership = UserOrgMembershipFactory.build(
        user_id=authed_user.id, org_id=fake_org.id, role=Role.OWNER
    )
    mock_session.exec.side_effect = _exec_results(lesson, None, membership)

    response = client.get(LESSON_PATH, headers={"Host": "localhost"})
    assert response.status_code == 200


def test_org_member_can_view_draft_lesson(client, mock_session, fake_org, authed_user):
    # Drafts are author-only. Member access path: lesson is draft, so the
    # enrollment check is skipped entirely; we go straight to membership.
    lesson = LessonFactory.build(
        org_id=fake_org.id,
        slug="draft-lesson",
        visibility=LessonVisibility.DRAFT,
        is_free_preview=False,
    )
    membership = UserOrgMembershipFactory.build(
        user_id=authed_user.id, org_id=fake_org.id, role=Role.OWNER
    )
    # exec order for draft path: lesson lookup, membership lookup (no enrollment call).
    mock_session.exec.side_effect = _exec_results(lesson, membership)

    response = client.get(LESSON_PATH, headers={"Host": "localhost"})
    assert response.status_code == 200


def test_instructor_member_can_view_lesson(client, mock_session, fake_org, authed_user):
    lesson = _published_lesson(org_id=fake_org.id, slug="welcome")
    membership = UserOrgMembershipFactory.build(
        user_id=authed_user.id, org_id=fake_org.id, role=Role.INSTRUCTOR
    )
    mock_session.exec.side_effect = _exec_results(lesson, None, membership)

    response = client.get(LESSON_PATH, headers={"Host": "localhost"})
    assert response.status_code == 200


def test_authed_user_without_enrollment_or_membership_gets_404(
    client, mock_session, fake_org, authed_user
):
    lesson = _published_lesson(org_id=fake_org.id, slug="welcome")
    # lesson exists; no enrollment; no membership → leak-safe 404
    mock_session.exec.side_effect = _exec_results(lesson, None, None)

    response = client.get(LESSON_PATH, headers={"Host": "localhost"})
    assert response.status_code == 404


def test_free_preview_lesson_accessible_without_enrollment(
    client, mock_session, fake_org, authed_user
):
    # Free-preview lessons skip the enrollment/membership checks entirely —
    # the gate fires only on the lesson's own attributes (published + preview).
    lesson = LessonFactory.build(
        org_id=fake_org.id,
        slug="welcome",
        visibility=LessonVisibility.PUBLISHED,
        is_free_preview=True,
    )
    mock_session.exec.side_effect = _exec_results(lesson)

    response = client.get(LESSON_PATH, headers={"Host": "localhost"})
    assert response.status_code == 200
    # Only one exec call: the lesson lookup. No enrollment, no membership.
    assert mock_session.exec.call_count == 1


def test_draft_lesson_returns_404_for_non_member(
    client, mock_session, fake_org, authed_user
):
    lesson = LessonFactory.build(
        org_id=fake_org.id,
        slug="welcome",
        visibility=LessonVisibility.DRAFT,
        is_free_preview=False,
    )
    # exec order for draft path: lesson lookup, membership lookup (None).
    mock_session.exec.side_effect = _exec_results(lesson, None)

    response = client.get(LESSON_PATH, headers={"Host": "localhost"})
    assert response.status_code == 404


# ---------- 404 leakage cases (all return the same shape) ----------


def test_lesson_404_when_lesson_does_not_exist(
    client, mock_session, fake_org, authed_user
):
    mock_session.exec.side_effect = _exec_results(None)
    response = client.get(LESSON_PATH, headers={"Host": "localhost"})
    assert response.status_code == 404


def test_lesson_404_when_course_is_draft(client, mock_session, fake_org, authed_user):
    # Query filters by visibility=published, so a draft course's lesson just
    # comes back as None at the route layer — same 404 path as missing lesson.
    mock_session.exec.side_effect = _exec_results(None)
    response = client.get(LESSON_PATH, headers={"Host": "localhost"})
    assert response.status_code == 404


# ---------- query shape ----------


def test_lesson_query_filters_by_org_published_and_path_slugs(
    client, mock_session, fake_org, authed_user
):
    mock_session.exec.side_effect = _exec_results(None)
    client.get(LESSON_PATH, headers={"Host": "localhost"})
    called_stmt = mock_session.exec.call_args_list[0].args[0]
    compiled = str(called_stmt.compile(compile_kwargs={"literal_binds": True})).lower()
    assert fake_org.id.hex in compiled
    assert "'intro'" in compiled
    assert "'getting-started'" in compiled
    assert "'welcome'" in compiled
    assert "visibility" in compiled
    assert "published" in compiled


# ---------- response shape ----------


def test_response_includes_full_lesson_content_body(
    client, mock_session, fake_org, authed_user
):
    lesson = _published_lesson(
        org_id=fake_org.id,
        slug="welcome",
        content_type=ContentType.ARTICLE,
    )
    doc = tiptap_doc("This is the article body.")
    lesson.content = {"body": doc}
    enrollment = EnrollmentFactory.build(
        user_id=authed_user.id, org_id=fake_org.id, course_id=lesson.course_id
    )
    mock_session.exec.side_effect = _exec_results(lesson, enrollment)

    response = client.get(LESSON_PATH, headers={"Host": "localhost"})
    body = response.json()
    assert body["content"] == {"body": doc}


def test_enrolled_user_skips_membership_lookup(
    client, mock_session, fake_org, authed_user
):
    """Enrolled users on a published lesson short-circuit before membership."""
    lesson = _published_lesson(org_id=fake_org.id, slug="welcome")
    enrollment = EnrollmentFactory.build(
        user_id=authed_user.id, org_id=fake_org.id, course_id=lesson.course_id
    )
    mock_session.exec.side_effect = _exec_results(lesson, enrollment)

    client.get(LESSON_PATH, headers={"Host": "localhost"})
    # Exactly two exec calls: lesson, enrollment. No membership lookup.
    assert mock_session.exec.call_count == 2
