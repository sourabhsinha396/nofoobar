import pytest

from app.db.models.membership import Role

HOSTS = ["localhost", "acme.algoholic.app"]


@pytest.fixture
def configured_s3(monkeypatch):
    """Pretend R2 is configured and stub the put_object call so tests don't
    hit the network. Captured args are exposed via the returned dict."""
    for attr, value in [
        ("S3_ENDPOINT_URL", "https://s3.example.com"),
        ("S3_ACCESS_KEY_ID", "test-key"),
        ("S3_SECRET_ACCESS_KEY", "test-secret"),
        ("S3_BUCKET", "test-bucket"),
        ("S3_PUBLIC_URL_BASE", "https://cdn.example.com"),
    ]:
        monkeypatch.setattr(f"app.services.storage.s3.settings.{attr}", value)

    captured: dict = {}

    async def fake_put(key: str, body: bytes, content_type: str) -> None:
        captured["key"] = key
        captured["body"] = body
        captured["content_type"] = content_type

    monkeypatch.setattr("app.services.storage.s3.put_object", fake_put)
    return captured


def _png_bytes() -> bytes:
    # 1x1 transparent PNG — minimal valid file for round-trip tests.
    return bytes.fromhex(
        "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4"
        "890000000d49444154789c63000100000005000100"
        "0d0a2db40000000049454e44ae426082"
    )


@pytest.mark.parametrize("host", HOSTS)
def test_upload_returns_public_url(client, fake_membership, configured_s3, host):
    response = client.post(
        "/api/v1/uploads/image",
        files={"file": ("Cover.PNG", b"hello-bytes", "image/png")},
        headers={"Host": host},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["public_url"].startswith("https://cdn.example.com/")
    assert str(fake_membership.org_id) in body["public_url"]
    assert body["public_url"].endswith(".png")

    # Verify the storage layer was called with the expected arguments.
    assert configured_s3["content_type"] == "image/png"
    assert configured_s3["body"] == b"hello-bytes"
    # Defaults to the thumbnails category — preserves the original behavior
    # for LogoUploader, which doesn't send a category.
    assert configured_s3["key"].startswith(f"uploads/thumbnails/{fake_membership.org_id}/")


def test_upload_with_explicit_images_category(client, fake_membership, configured_s3):
    response = client.post(
        "/api/v1/uploads/image",
        files={"file": ("photo.png", b"x", "image/png")},
        data={"category": "images"},
        headers={"Host": "localhost"},
    )
    assert response.status_code == 200
    assert configured_s3["key"].startswith(f"uploads/images/{fake_membership.org_id}/")


def test_upload_rejects_unknown_category(client, fake_membership, configured_s3):
    response = client.post(
        "/api/v1/uploads/image",
        files={"file": ("photo.png", b"x", "image/png")},
        data={"category": "videos"},  # not in the Literal allowlist
        headers={"Host": "localhost"},
    )
    assert response.status_code == 422


def test_upload_rejects_students(client, fake_membership, configured_s3):
    fake_membership.role = Role.STUDENT
    response = client.post(
        "/api/v1/uploads/image",
        files={"file": ("cover.png", b"x", "image/png")},
        headers={"Host": "localhost"},
    )
    assert response.status_code == 403


def test_upload_requires_authentication(client, mock_session, configured_s3):
    response = client.post(
        "/api/v1/uploads/image",
        files={"file": ("cover.png", b"x", "image/png")},
        headers={"Host": "localhost"},
    )
    assert response.status_code == 401


def test_upload_rejects_unsupported_extension(client, fake_membership, configured_s3):
    response = client.post(
        "/api/v1/uploads/image",
        files={"file": ("danger.svg", b"<svg/>", "image/svg+xml")},
        headers={"Host": "localhost"},
    )
    assert response.status_code == 422


def test_upload_rejects_extensionless_filename(client, fake_membership, configured_s3):
    response = client.post(
        "/api/v1/uploads/image",
        files={"file": ("logo", b"x", "application/octet-stream")},
        headers={"Host": "localhost"},
    )
    assert response.status_code == 422


def test_upload_rejects_oversized_file(client, fake_membership, configured_s3):
    big = b"x" * (2 * 1024 * 1024 + 1)
    response = client.post(
        "/api/v1/uploads/image",
        files={"file": ("cover.png", big, "image/png")},
        headers={"Host": "localhost"},
    )
    assert response.status_code == 413


def test_upload_503_when_storage_not_configured(client, fake_membership, monkeypatch):
    monkeypatch.setattr("app.services.storage.s3.settings.S3_BUCKET", "")
    response = client.post(
        "/api/v1/uploads/image",
        files={"file": ("cover.png", b"x", "image/png")},
        headers={"Host": "localhost"},
    )
    assert response.status_code == 503


def test_upload_accepts_jpeg_jpg_gif(client, fake_membership, configured_s3):
    for filename, expected_ct in [
        ("a.jpg", "image/jpeg"),
        ("a.jpeg", "image/jpeg"),
        ("a.gif", "image/gif"),
    ]:
        response = client.post(
            "/api/v1/uploads/image",
            files={"file": (filename, b"x", expected_ct)},
            headers={"Host": "localhost"},
        )
        assert response.status_code == 200, filename
        # The stored Content-Type is derived from the filename extension,
        # not the multipart Content-Type the client claims.
        assert configured_s3["content_type"] == expected_ct
