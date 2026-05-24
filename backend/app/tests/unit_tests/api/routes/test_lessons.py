from unittest.mock import MagicMock

import pytest

from app.db.models.lesson import ContentType
from app.db.models.membership import Role
from app.tests.factories.lesson import LessonFactory, tiptap_doc
from app.tests.factories.section import SectionFactory

HOSTS = ["localhost", "acme.algoholic.app"]

ARTICLE_BODY = tiptap_doc("Hello, world.")
ARTICLE_PAYLOAD = {
    "slug": "intro",
    "title": "Intro",
    "content": {"content_type": "article", "body": ARTICLE_BODY},
}
VIDEO_PAYLOAD = {
    "slug": "demo",
    "title": "Demo",
    "content": {
        "content_type": "video",
        "url": "https://example.com/video",
        "duration_seconds": 120,
    },
}


def _exec_results(*first_values):
    return [MagicMock(first=MagicMock(return_value=v)) for v in first_values]


@pytest.mark.parametrize("role", [Role.OWNER, Role.INSTRUCTOR])
@pytest.mark.parametrize("host", HOSTS)
def test_create_article_lesson_succeeds_for_authors(client, mock_session, fake_membership, host, role):
    fake_membership.role = role
    section = SectionFactory.build(slug="getting-started", org_id=fake_membership.org_id)
    mock_session.exec.side_effect = _exec_results(section, None, None)
    response = client.post(
        "/api/v1/courses/intro/sections/getting-started/lessons",
        json=ARTICLE_PAYLOAD,
        headers={"Host": host},
    )
    assert response.status_code == 201
    body = response.json()
    assert body["slug"] == "intro"
    assert body["content_type"] == "article"
    assert body["content"] == {"body": ARTICLE_BODY}
    assert body["section_id"] == str(section.id)
    assert body["course_id"] == str(section.course_id)
    assert body["org_id"] == str(fake_membership.org_id)
    assert body["position"] == 0


def test_create_video_lesson_persists_content(client, mock_session, fake_membership):
    section = SectionFactory.build(org_id=fake_membership.org_id)
    mock_session.exec.side_effect = _exec_results(section, None, None)
    response = client.post(
        f"/api/v1/courses/c/sections/{section.slug}/lessons",
        json=VIDEO_PAYLOAD,
        headers={"Host": "localhost"},
    )
    assert response.status_code == 201
    added = mock_session.add.call_args.args[0]
    assert added.content_type == ContentType.VIDEO
    assert added.content["url"].startswith("https://example.com/video")
    assert added.content["duration_seconds"] == 120


def test_create_lesson_assigns_next_position(client, mock_session, fake_membership):
    section = SectionFactory.build(org_id=fake_membership.org_id)
    mock_session.exec.side_effect = _exec_results(section, None, 7)
    response = client.post(
        f"/api/v1/courses/c/sections/{section.slug}/lessons",
        json=ARTICLE_PAYLOAD,
        headers={"Host": "localhost"},
    )
    assert response.status_code == 201
    assert response.json()["position"] == 8


def test_create_lesson_rejects_students(client, mock_session, fake_membership):
    fake_membership.role = Role.STUDENT
    response = client.post(
        "/api/v1/courses/c/sections/s/lessons",
        json=ARTICLE_PAYLOAD,
        headers={"Host": "localhost"},
    )
    assert response.status_code == 403


def test_create_lesson_404_when_section_missing(client, mock_session, fake_membership):
    mock_session.exec.side_effect = _exec_results(None)
    response = client.post(
        "/api/v1/courses/c/sections/ghost/lessons",
        json=ARTICLE_PAYLOAD,
        headers={"Host": "localhost"},
    )
    assert response.status_code == 404


def test_create_lesson_rejects_duplicate_slug_in_section(client, mock_session, fake_membership):
    section = SectionFactory.build(org_id=fake_membership.org_id)
    existing = LessonFactory.build(slug="intro", section_id=section.id, org_id=fake_membership.org_id)
    mock_session.exec.side_effect = _exec_results(section, existing)
    response = client.post(
        f"/api/v1/courses/c/sections/{section.slug}/lessons",
        json=ARTICLE_PAYLOAD,
        headers={"Host": "localhost"},
    )
    assert response.status_code == 409


def test_create_lesson_rejects_mismatched_content_shape(client, mock_session, fake_membership):
    """Article content with `url` instead of `body` must fail discriminated-union validation."""
    response = client.post(
        "/api/v1/courses/c/sections/s/lessons",
        json={
            "slug": "x",
            "title": "X",
            "content": {"content_type": "article", "url": "https://example.com"},
        },
        headers={"Host": "localhost"},
    )
    assert response.status_code == 422


def test_create_lesson_rejects_unknown_content_type(client, mock_session, fake_membership):
    response = client.post(
        "/api/v1/courses/c/sections/s/lessons",
        json={
            "slug": "x",
            "title": "X",
            "content": {"content_type": "podcast", "url": "https://example.com"},
        },
        headers={"Host": "localhost"},
    )
    assert response.status_code == 422


def test_create_lesson_requires_authentication(client, mock_session):
    response = client.post(
        "/api/v1/courses/c/sections/s/lessons",
        json=ARTICLE_PAYLOAD,
        headers={"Host": "localhost"},
    )
    assert response.status_code == 401


@pytest.mark.parametrize("host", HOSTS)
def test_list_lessons_returns_ordered_lessons(client, mock_session, fake_membership, host):
    section = SectionFactory.build(org_id=fake_membership.org_id)
    lessons = [
        LessonFactory.build(slug="a", position=0, section_id=section.id, org_id=fake_membership.org_id),
        LessonFactory.build(slug="b", position=1, section_id=section.id, org_id=fake_membership.org_id),
    ]
    section_result = MagicMock(first=MagicMock(return_value=section))
    lessons_result = MagicMock(all=MagicMock(return_value=lessons))
    mock_session.exec.side_effect = [section_result, lessons_result]
    response = client.get(
        f"/api/v1/courses/c/sections/{section.slug}/lessons",
        headers={"Host": host},
    )
    assert response.status_code == 200
    assert [lesson["slug"] for lesson in response.json()] == ["a", "b"]


def test_list_lessons_404_when_section_missing(client, mock_session, fake_membership):
    mock_session.exec.side_effect = _exec_results(None)
    response = client.get(
        "/api/v1/courses/c/sections/ghost/lessons",
        headers={"Host": "localhost"},
    )
    assert response.status_code == 404


def test_get_section_returns_detail_with_lessons(client, mock_session, fake_membership):
    section = SectionFactory.build(org_id=fake_membership.org_id)
    section.lessons = [
        LessonFactory.build(slug="a", position=0, section_id=section.id, org_id=fake_membership.org_id),
        LessonFactory.build(slug="b", position=1, section_id=section.id, org_id=fake_membership.org_id),
    ]
    mock_session.exec.return_value.first.return_value = section
    response = client.get(
        f"/api/v1/courses/c/sections/{section.slug}",
        headers={"Host": "localhost"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["slug"] == section.slug
    assert [lesson["slug"] for lesson in body["lessons"]] == ["a", "b"]


def test_get_section_404_when_missing(client, mock_session, fake_membership):
    mock_session.exec.return_value.first.return_value = None
    response = client.get(
        "/api/v1/courses/c/sections/ghost",
        headers={"Host": "localhost"},
    )
    assert response.status_code == 404


def test_get_section_requires_authentication(client, mock_session):
    response = client.get(
        "/api/v1/courses/c/sections/s",
        headers={"Host": "localhost"},
    )
    assert response.status_code == 401


# ---------- GET /lessons/{lesson_slug} ----------


@pytest.mark.parametrize("host", HOSTS)
def test_get_lesson_returns_lesson(client, mock_session, fake_membership, host):
    lesson = LessonFactory.build(slug="intro", org_id=fake_membership.org_id)
    mock_session.exec.return_value.first.return_value = lesson
    response = client.get(
        "/api/v1/courses/c/sections/s/lessons/intro",
        headers={"Host": host},
    )
    assert response.status_code == 200
    assert response.json()["slug"] == "intro"


def test_get_lesson_404_when_missing(client, mock_session, fake_membership):
    mock_session.exec.return_value.first.return_value = None
    response = client.get(
        "/api/v1/courses/c/sections/s/lessons/ghost",
        headers={"Host": "localhost"},
    )
    assert response.status_code == 404


def test_get_lesson_requires_authentication(client, mock_session):
    response = client.get(
        "/api/v1/courses/c/sections/s/lessons/intro",
        headers={"Host": "localhost"},
    )
    assert response.status_code == 401


# ---------- PATCH /lessons/{lesson_slug} ----------


def test_patch_lesson_title_only(client, mock_session, fake_membership):
    lesson = LessonFactory.build(
        slug="intro", title="Old", org_id=fake_membership.org_id, content_type=ContentType.ARTICLE
    )
    mock_session.exec.return_value.first.return_value = lesson
    response = client.patch(
        "/api/v1/courses/c/sections/s/lessons/intro",
        json={"title": "New"},
        headers={"Host": "localhost"},
    )
    assert response.status_code == 200
    assert response.json()["title"] == "New"
    assert lesson.title == "New"


def test_patch_lesson_slug_with_conflict(client, mock_session, fake_membership):
    lesson = LessonFactory.build(slug="intro", org_id=fake_membership.org_id)
    other = LessonFactory.build(slug="taken", section_id=lesson.section_id, org_id=fake_membership.org_id)
    mock_session.exec.side_effect = _exec_results(lesson, other)
    response = client.patch(
        "/api/v1/courses/c/sections/s/lessons/intro",
        json={"slug": "taken"},
        headers={"Host": "localhost"},
    )
    assert response.status_code == 409


def test_patch_lesson_slug_succeeds_when_unique(client, mock_session, fake_membership):
    lesson = LessonFactory.build(slug="intro", org_id=fake_membership.org_id)
    mock_session.exec.side_effect = _exec_results(lesson, None)
    response = client.patch(
        "/api/v1/courses/c/sections/s/lessons/intro",
        json={"slug": "fresh"},
        headers={"Host": "localhost"},
    )
    assert response.status_code == 200
    assert response.json()["slug"] == "fresh"


def test_patch_lesson_content_matching_type(client, mock_session, fake_membership):
    new_body = tiptap_doc("New body")
    lesson = LessonFactory.build(
        slug="intro",
        org_id=fake_membership.org_id,
        content_type=ContentType.ARTICLE,
        content={"body": tiptap_doc("Old")},
    )
    mock_session.exec.return_value.first.return_value = lesson
    response = client.patch(
        "/api/v1/courses/c/sections/s/lessons/intro",
        json={"content": {"content_type": "article", "body": new_body}},
        headers={"Host": "localhost"},
    )
    assert response.status_code == 200
    assert lesson.content == {"body": new_body}


def test_patch_lesson_rejects_content_type_change(client, mock_session, fake_membership):
    lesson = LessonFactory.build(
        slug="intro",
        org_id=fake_membership.org_id,
        content_type=ContentType.ARTICLE,
        content={"body": tiptap_doc()},
    )
    mock_session.exec.return_value.first.return_value = lesson
    response = client.patch(
        "/api/v1/courses/c/sections/s/lessons/intro",
        json={"content": {"content_type": "video", "url": "https://example.com/v"}},
        headers={"Host": "localhost"},
    )
    assert response.status_code == 409
    assert "content_type" in response.json()["detail"]


def test_patch_lesson_rejects_students(client, mock_session, fake_membership):
    fake_membership.role = Role.STUDENT
    response = client.patch(
        "/api/v1/courses/c/sections/s/lessons/intro",
        json={"title": "Nope"},
        headers={"Host": "localhost"},
    )
    assert response.status_code == 403


def test_patch_lesson_404_when_missing(client, mock_session, fake_membership):
    mock_session.exec.return_value.first.return_value = None
    response = client.patch(
        "/api/v1/courses/c/sections/s/lessons/ghost",
        json={"title": "X"},
        headers={"Host": "localhost"},
    )
    assert response.status_code == 404


def test_patch_lesson_requires_authentication(client, mock_session):
    response = client.patch(
        "/api/v1/courses/c/sections/s/lessons/intro",
        json={"title": "X"},
        headers={"Host": "localhost"},
    )
    assert response.status_code == 401


# ---------- DELETE /lessons/{lesson_slug} ----------


def test_delete_lesson_returns_204(client, mock_session, fake_membership):
    lesson = LessonFactory.build(slug="intro", org_id=fake_membership.org_id)
    mock_session.exec.return_value.first.return_value = lesson
    response = client.delete(
        "/api/v1/courses/c/sections/s/lessons/intro",
        headers={"Host": "localhost"},
    )
    assert response.status_code == 204
    mock_session.delete.assert_called_once_with(lesson)


def test_delete_lesson_rejects_students(client, mock_session, fake_membership):
    fake_membership.role = Role.STUDENT
    response = client.delete(
        "/api/v1/courses/c/sections/s/lessons/intro",
        headers={"Host": "localhost"},
    )
    assert response.status_code == 403


def test_delete_lesson_404_when_missing(client, mock_session, fake_membership):
    mock_session.exec.return_value.first.return_value = None
    response = client.delete(
        "/api/v1/courses/c/sections/s/lessons/ghost",
        headers={"Host": "localhost"},
    )
    assert response.status_code == 404


def test_delete_lesson_requires_authentication(client, mock_session):
    response = client.delete(
        "/api/v1/courses/c/sections/s/lessons/intro",
        headers={"Host": "localhost"},
    )
    assert response.status_code == 401


# ---------- PATCH /courses/{c}/sections/{s}/lessons/reorder ----------


def test_reorder_lessons_happy_path(client, mock_session, fake_membership):
    section = SectionFactory.build(org_id=fake_membership.org_id, slug="getting-started")
    l1 = LessonFactory.build(section_id=section.id, org_id=fake_membership.org_id, position=0)
    l2 = LessonFactory.build(section_id=section.id, org_id=fake_membership.org_id, position=1)
    l3 = LessonFactory.build(section_id=section.id, org_id=fake_membership.org_id, position=2)
    # exec order: section lookup (join with course), lessons list
    mock_session.exec.side_effect = [
        MagicMock(first=MagicMock(return_value=section)),
        MagicMock(all=MagicMock(return_value=[l1, l2, l3])),
    ]
    response = client.patch(
        "/api/v1/courses/intro/sections/getting-started/lessons/reorder",
        json={"ids": [str(l3.id), str(l1.id), str(l2.id)]},
        headers={"Host": "localhost"},
    )
    assert response.status_code == 204
    assert l3.position == 0
    assert l1.position == 1
    assert l2.position == 2
    mock_session.commit.assert_called_once()


def test_reorder_lessons_400_when_id_missing(client, mock_session, fake_membership):
    section = SectionFactory.build(org_id=fake_membership.org_id)
    l1 = LessonFactory.build(section_id=section.id, org_id=fake_membership.org_id)
    l2 = LessonFactory.build(section_id=section.id, org_id=fake_membership.org_id)
    mock_session.exec.side_effect = [
        MagicMock(first=MagicMock(return_value=section)),
        MagicMock(all=MagicMock(return_value=[l1, l2])),
    ]
    response = client.patch(
        "/api/v1/courses/intro/sections/getting-started/lessons/reorder",
        json={"ids": [str(l1.id)]},
        headers={"Host": "localhost"},
    )
    assert response.status_code == 400


def test_reorder_lessons_400_when_extra_id_present(client, mock_session, fake_membership):
    from uuid import uuid4
    section = SectionFactory.build(org_id=fake_membership.org_id)
    l1 = LessonFactory.build(section_id=section.id, org_id=fake_membership.org_id)
    mock_session.exec.side_effect = [
        MagicMock(first=MagicMock(return_value=section)),
        MagicMock(all=MagicMock(return_value=[l1])),
    ]
    response = client.patch(
        "/api/v1/courses/intro/sections/getting-started/lessons/reorder",
        json={"ids": [str(l1.id), str(uuid4())]},
        headers={"Host": "localhost"},
    )
    assert response.status_code == 400


def test_reorder_lessons_rejects_students(client, mock_session, fake_membership):
    fake_membership.role = Role.STUDENT
    response = client.patch(
        "/api/v1/courses/intro/sections/getting-started/lessons/reorder",
        json={"ids": []},
        headers={"Host": "localhost"},
    )
    assert response.status_code == 403


def test_reorder_lessons_404_when_section_missing(client, mock_session, fake_membership):
    mock_session.exec.return_value.first.return_value = None
    response = client.patch(
        "/api/v1/courses/intro/sections/ghost/lessons/reorder",
        json={"ids": []},
        headers={"Host": "localhost"},
    )
    assert response.status_code == 404


def test_reorder_lessons_requires_authentication(client, mock_session):
    response = client.patch(
        "/api/v1/courses/intro/sections/getting-started/lessons/reorder",
        json={"ids": []},
        headers={"Host": "localhost"},
    )
    assert response.status_code == 401


def test_reorder_lessons_empty_list_is_ok_for_empty_section(client, mock_session, fake_membership):
    section = SectionFactory.build(org_id=fake_membership.org_id)
    mock_session.exec.side_effect = [
        MagicMock(first=MagicMock(return_value=section)),
        MagicMock(all=MagicMock(return_value=[])),
    ]
    response = client.patch(
        "/api/v1/courses/intro/sections/empty/lessons/reorder",
        json={"ids": []},
        headers={"Host": "localhost"},
    )
    assert response.status_code == 204
