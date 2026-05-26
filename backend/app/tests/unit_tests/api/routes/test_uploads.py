from unittest.mock import AsyncMock, MagicMock

import pytest

from app.db.models.membership import Role
from app.db.models.video_asset import VideoAsset, VideoAssetStatus, VideoProviderName
from app.services.video.base import UploadHandle, VideoProviderAPIError

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
        data={"purpose": "course_logo"},
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
    # Key lives under uploads/images/<purpose>/ — `uploads/images/` is
    # mandatory so future file types (docs, scripts) get their own siblings.
    assert configured_s3["key"].startswith(
        f"uploads/images/course_logo/{fake_membership.org_id}/"
    )


def test_upload_routes_by_purpose(client, fake_membership, configured_s3):
    response = client.post(
        "/api/v1/uploads/image",
        files={"file": ("logo.png", b"x", "image/png")},
        data={"purpose": "organization_logo"},
        headers={"Host": "localhost"},
    )
    assert response.status_code == 200
    assert configured_s3["key"].startswith(
        f"uploads/images/organization_logo/{fake_membership.org_id}/"
    )


def test_upload_rejects_missing_purpose(client, fake_membership, configured_s3):
    # Purpose is required — no default — so an upload that forgets to declare
    # one fails fast with 422 rather than landing in a catchall directory.
    response = client.post(
        "/api/v1/uploads/image",
        files={"file": ("photo.png", b"x", "image/png")},
        headers={"Host": "localhost"},
    )
    assert response.status_code == 422


def test_upload_rejects_unknown_purpose(client, fake_membership, configured_s3):
    response = client.post(
        "/api/v1/uploads/image",
        files={"file": ("photo.png", b"x", "image/png")},
        data={"purpose": "videos"},  # not in the Literal allowlist
        headers={"Host": "localhost"},
    )
    assert response.status_code == 422


def test_upload_rejects_students(client, fake_membership, configured_s3):
    fake_membership.role = Role.STUDENT
    response = client.post(
        "/api/v1/uploads/image",
        files={"file": ("cover.png", b"x", "image/png")},
        data={"purpose": "course_logo"},
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
        data={"purpose": "course_logo"},
        headers={"Host": "localhost"},
    )
    assert response.status_code == 422


def test_upload_rejects_extensionless_filename(client, fake_membership, configured_s3):
    response = client.post(
        "/api/v1/uploads/image",
        files={"file": ("logo", b"x", "application/octet-stream")},
        data={"purpose": "course_logo"},
        headers={"Host": "localhost"},
    )
    assert response.status_code == 422


def test_upload_rejects_oversized_file(client, fake_membership, configured_s3):
    big = b"x" * (2 * 1024 * 1024 + 1)
    response = client.post(
        "/api/v1/uploads/image",
        files={"file": ("cover.png", big, "image/png")},
        data={"purpose": "course_logo"},
        headers={"Host": "localhost"},
    )
    assert response.status_code == 413


def test_upload_503_when_storage_not_configured(client, fake_membership, monkeypatch):
    monkeypatch.setattr("app.services.storage.s3.settings.S3_BUCKET", "")
    response = client.post(
        "/api/v1/uploads/image",
        files={"file": ("cover.png", b"x", "image/png")},
        data={"purpose": "course_logo"},
        headers={"Host": "localhost"},
    )
    assert response.status_code == 503


# ---------- POST /uploads/video ----------


@pytest.fixture
def configured_mux(monkeypatch):
    monkeypatch.setattr("app.services.video.mux_provider.settings.MUX_TOKEN_ID", "test_token_id")
    monkeypatch.setattr(
        "app.services.video.mux_provider.settings.MUX_TOKEN_SECRET", "test_token_secret"
    )


@pytest.fixture
def fake_video_provider(monkeypatch):
    """Replace get_provider() in the uploads route so create_upload is in-memory."""
    fake = MagicMock()
    fake.create_upload = AsyncMock(
        return_value=UploadHandle(
            upload_url="https://storage.googleapis.com/signed",
            provider_upload_ref="upload_xyz",
        )
    )
    monkeypatch.setattr("app.api.routes.uploads.get_provider", lambda name: fake)
    return fake


def test_video_upload_happy_path(
    client, fake_membership, configured_mux, fake_video_provider, mock_session
):
    response = client.post("/api/v1/uploads/video", headers={"Host": "localhost"})
    assert response.status_code == 200
    body = response.json()
    assert body["upload_url"] == "https://storage.googleapis.com/signed"
    assert body["provider"] == "mux"
    assert "video_asset_id" in body

    # create_upload was called with the same id we returned to the client.
    create_call = fake_video_provider.create_upload.await_args
    assert str(create_call.kwargs["video_asset_id"]) == body["video_asset_id"]
    assert create_call.kwargs["org_id"] == fake_membership.org_id

    # The DB row carries the upload ref from the provider.
    added = [c.args[0] for c in mock_session.add.call_args_list]
    persisted = [a for a in added if isinstance(a, VideoAsset)]
    assert len(persisted) == 1
    assert persisted[0].provider is VideoProviderName.MUX
    assert persisted[0].provider_upload_ref == "upload_xyz"
    assert persisted[0].status is VideoAssetStatus.PENDING
    assert persisted[0].org_id == fake_membership.org_id


def test_video_upload_requires_authentication(client, mock_session, configured_mux):
    response = client.post("/api/v1/uploads/video", headers={"Host": "localhost"})
    assert response.status_code == 401


def test_video_upload_rejects_students(client, fake_membership, configured_mux):
    fake_membership.role = Role.STUDENT
    response = client.post("/api/v1/uploads/video", headers={"Host": "localhost"})
    assert response.status_code == 403


def test_video_upload_503_when_mux_not_configured(client, fake_membership, monkeypatch):
    monkeypatch.setattr("app.services.video.mux_provider.settings.MUX_TOKEN_ID", "")
    response = client.post("/api/v1/uploads/video", headers={"Host": "localhost"})
    assert response.status_code == 503


def test_video_upload_502_when_provider_errors(
    client, fake_membership, configured_mux, monkeypatch, mock_session
):
    fake = MagicMock()
    fake.create_upload = AsyncMock(side_effect=VideoProviderAPIError("Mux is down"))
    monkeypatch.setattr("app.api.routes.uploads.get_provider", lambda name: fake)

    response = client.post("/api/v1/uploads/video", headers={"Host": "localhost"})
    assert response.status_code == 502


# ---------- existing image upload tests below ----------


def test_upload_accepts_jpeg_jpg_gif(client, fake_membership, configured_s3):
    for filename, expected_ct in [
        ("a.jpg", "image/jpeg"),
        ("a.jpeg", "image/jpeg"),
        ("a.gif", "image/gif"),
    ]:
        response = client.post(
            "/api/v1/uploads/image",
            files={"file": (filename, b"x", expected_ct)},
            data={"purpose": "course_logo"},
            headers={"Host": "localhost"},
        )
        assert response.status_code == 200, filename
        # The stored Content-Type is derived from the filename extension,
        # not the multipart Content-Type the client claims.
        assert configured_s3["content_type"] == expected_ct
