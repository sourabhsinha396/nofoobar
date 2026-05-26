from uuid import uuid4

from app.services.storage import s3


def test_normalize_extension_lowercases():
    assert s3.normalize_extension("Photo.PNG") == "png"


def test_normalize_extension_accepts_jpeg_aliases():
    assert s3.normalize_extension("a.jpg") == "jpg"
    assert s3.normalize_extension("a.jpeg") == "jpeg"


def test_normalize_extension_rejects_unknown():
    assert s3.normalize_extension("danger.svg") is None
    assert s3.normalize_extension("notes.pdf") is None


def test_normalize_extension_rejects_extensionless():
    assert s3.normalize_extension("logo") is None


def test_build_image_key_uses_images_purpose_org_uuid_layout():
    org_id = uuid4()
    key = s3.build_image_key("organization_logo", org_id, "png")
    assert key.startswith(f"uploads/images/organization_logo/{org_id}/")
    assert key.endswith(".png")


def test_build_image_key_unique_per_call():
    org_id = uuid4()
    keys = {s3.build_image_key("course_logo", org_id, "png") for _ in range(5)}
    assert len(keys) == 5


def test_build_image_key_segments_by_purpose():
    # The `<purpose>` segment is the whole point — different purposes land
    # in different subdirectories under uploads/images/.
    org_id = uuid4()
    course = s3.build_image_key("course_logo", org_id, "png")
    org = s3.build_image_key("organization_logo", org_id, "png")
    assert "uploads/images/course_logo/" in course
    assert "uploads/images/organization_logo/" in org


def test_public_url_for_strips_trailing_slash_on_base(monkeypatch):
    monkeypatch.setattr("app.services.storage.s3.settings.S3_PUBLIC_URL_BASE", "https://cdn.example.com/")
    assert s3.public_url_for("a/b.png") == "https://cdn.example.com/a/b.png"


def test_is_configured_requires_all_five(monkeypatch):
    monkeypatch.setattr("app.services.storage.s3.settings.S3_ENDPOINT_URL", "x")
    monkeypatch.setattr("app.services.storage.s3.settings.S3_ACCESS_KEY_ID", "x")
    monkeypatch.setattr("app.services.storage.s3.settings.S3_SECRET_ACCESS_KEY", "x")
    monkeypatch.setattr("app.services.storage.s3.settings.S3_BUCKET", "x")
    monkeypatch.setattr("app.services.storage.s3.settings.S3_PUBLIC_URL_BASE", "")
    assert s3.is_configured() is False

    monkeypatch.setattr("app.services.storage.s3.settings.S3_PUBLIC_URL_BASE", "x")
    assert s3.is_configured() is True


def test_put_object_delegates_to_boto_client(monkeypatch):
    calls: dict = {}

    class FakeClient:
        def put_object(self, **kwargs):
            calls.update(kwargs)

    monkeypatch.setattr("app.services.storage.s3._client", lambda: FakeClient())
    monkeypatch.setattr("app.services.storage.s3.settings.S3_BUCKET", "my-bucket")

    s3._put_object_sync("some/key.png", b"hello", "image/png")

    assert calls == {
        "Bucket": "my-bucket",
        "Key": "some/key.png",
        "Body": b"hello",
        "ContentType": "image/png",
    }
