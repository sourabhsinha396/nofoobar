from uuid import uuid4

import pytest
from pydantic import TypeAdapter, ValidationError

from app.db.models.homepage_block import HomepageBlockType
from app.schemas.homepage_block import (
    HomepageBlockConfig,
    HomepageBlockInput,
    HomepageBlocksReplacePayload,
)

_ConfigAdapter = TypeAdapter(HomepageBlockConfig)


# --- Hero ---------------------------------------------------------------------


def test_hero_requires_headline():
    with pytest.raises(ValidationError):
        _ConfigAdapter.validate_python({"type": "hero"})


def test_hero_accepts_minimal_payload():
    cfg = _ConfigAdapter.validate_python({"type": "hero", "headline": "Welcome"})
    assert cfg.type == HomepageBlockType.HERO
    assert cfg.headline == "Welcome"
    assert cfg.subheadline is None
    assert cfg.cta_label is None


def test_hero_accepts_full_payload():
    cfg = _ConfigAdapter.validate_python(
        {
            "type": "hero",
            "headline": "Learn FastAPI",
            "subheadline": "From zero to API",
            "cta_label": "Browse courses",
            "cta_href": "/courses",
            "background_image_url": "https://cdn.example.com/hero.jpg",
        }
    )
    assert cfg.cta_href == "/courses"


# --- Stats --------------------------------------------------------------------


def test_stats_requires_at_least_one_item():
    with pytest.raises(ValidationError):
        _ConfigAdapter.validate_python({"type": "stats", "items": []})


def test_stats_caps_at_four_items():
    items = [{"value": str(i), "label": "thing"} for i in range(5)]
    with pytest.raises(ValidationError):
        _ConfigAdapter.validate_python({"type": "stats", "items": items})


def test_stats_item_requires_value_and_label():
    with pytest.raises(ValidationError):
        _ConfigAdapter.validate_python(
            {"type": "stats", "items": [{"value": "500+"}]}
        )


# --- Featured courses ---------------------------------------------------------


def test_featured_courses_accepts_empty_curation():
    # Empty list = fall-back-to-latest at render time. Still a valid config.
    cfg = _ConfigAdapter.validate_python({"type": "featured_courses"})
    assert cfg.course_ids == []


def test_featured_courses_preserves_id_order():
    ids = [uuid4() for _ in range(3)]
    cfg = _ConfigAdapter.validate_python(
        {"type": "featured_courses", "course_ids": [str(i) for i in ids]}
    )
    assert cfg.course_ids == ids


# --- Testimonials -------------------------------------------------------------


def test_testimonials_requires_at_least_one_item():
    with pytest.raises(ValidationError):
        _ConfigAdapter.validate_python({"type": "testimonials", "items": []})


def test_testimonial_item_requires_quote_and_name():
    with pytest.raises(ValidationError):
        _ConfigAdapter.validate_python(
            {"type": "testimonials", "items": [{"quote": "great"}]}
        )


# --- FAQs ---------------------------------------------------------------------


def test_faqs_requires_at_least_one_item():
    with pytest.raises(ValidationError):
        _ConfigAdapter.validate_python({"type": "faqs", "items": []})


def test_faq_item_requires_both_fields():
    with pytest.raises(ValidationError):
        _ConfigAdapter.validate_python(
            {"type": "faqs", "items": [{"question": "Why?"}]}
        )


# --- Discriminator ------------------------------------------------------------


def test_discriminator_rejects_unknown_type():
    with pytest.raises(ValidationError):
        _ConfigAdapter.validate_python({"type": "unknown", "headline": "x"})


def test_discriminator_rejects_missing_type():
    with pytest.raises(ValidationError):
        _ConfigAdapter.validate_python({"headline": "x"})


# --- Replace payload ----------------------------------------------------------


def test_replace_payload_accepts_empty_list():
    # Empty list is meaningful: "clear the homepage back to its default".
    payload = HomepageBlocksReplacePayload(blocks=[])
    assert payload.blocks == []


def test_replace_payload_validates_each_block():
    with pytest.raises(ValidationError):
        HomepageBlocksReplacePayload(
            blocks=[
                HomepageBlockInput(
                    config={"type": "hero"},  # missing headline
                )
            ]
        )


def test_replace_payload_accepts_mixed_block_types():
    payload = HomepageBlocksReplacePayload(
        blocks=[
            {"config": {"type": "hero", "headline": "Welcome"}},
            {
                "config": {
                    "type": "stats",
                    "items": [{"value": "500+", "label": "Students"}],
                },
                "is_enabled": False,
            },
            {
                "config": {
                    "type": "faqs",
                    "items": [{"question": "Q?", "answer": "A."}],
                }
            },
        ]
    )
    assert [b.config.type for b in payload.blocks] == [
        HomepageBlockType.HERO,
        HomepageBlockType.STATS,
        HomepageBlockType.FAQS,
    ]
    assert payload.blocks[1].is_enabled is False
