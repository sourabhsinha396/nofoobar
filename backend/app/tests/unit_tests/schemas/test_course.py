from app.schemas.course import (
    TAG_MAX_LENGTH,
    TAGS_MAX_COUNT,
    CourseCreate,
    CourseUpdate,
    normalize_tags,
)


def test_normalize_tags_trims_and_lowercases():
    assert normalize_tags(["  FastAPI ", "Python"]) == ["fastapi", "python"]


def test_normalize_tags_dedupes_case_insensitively():
    assert normalize_tags(["FastAPI", "fastapi", "FASTAPI"]) == ["fastapi"]


def test_normalize_tags_drops_empties():
    assert normalize_tags(["", "   ", "python"]) == ["python"]


def test_normalize_tags_truncates_overlong_entries():
    long = "a" * (TAG_MAX_LENGTH + 10)
    assert normalize_tags([long]) == ["a" * TAG_MAX_LENGTH]


def test_normalize_tags_caps_total_count():
    many = [f"tag{i}" for i in range(TAGS_MAX_COUNT + 5)]
    assert len(normalize_tags(many)) == TAGS_MAX_COUNT


def test_course_create_normalizes_tags_via_validator():
    payload = CourseCreate(slug="intro", title="Intro", tags=["  FastAPI ", "fastapi"])
    assert payload.tags == ["fastapi"]


def test_course_update_passes_through_none_tags():
    payload = CourseUpdate()
    assert payload.tags is None


def test_course_update_normalizes_explicit_tags():
    payload = CourseUpdate(tags=["Python", " python "])
    assert payload.tags == ["python"]
