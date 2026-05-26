import json
from collections.abc import Callable
from uuid import uuid4

import httpx
import pytest

from app.db.models.video_asset import VideoAssetStatus
from app.services.video.base import (
    VideoProviderAPIError,
    VideoProviderNotConfigured,
)
from app.services.video.mux_provider import MuxVideoProvider, is_configured


@pytest.fixture(autouse=True)
def _mux_credentials(monkeypatch):
    monkeypatch.setattr("app.services.video.mux_provider.settings.MUX_TOKEN_ID", "test_token_id")
    monkeypatch.setattr("app.services.video.mux_provider.settings.MUX_TOKEN_SECRET", "test_token_secret")


def _provider(handler: Callable[[httpx.Request], httpx.Response]) -> MuxVideoProvider:
    return MuxVideoProvider(transport=httpx.MockTransport(handler))


# ---- create_upload ---------------------------------------------------------


async def test_create_upload_returns_url_and_upload_id():
    captured: dict = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured["url"] = str(request.url)
        captured["method"] = request.method
        captured["body"] = json.loads(request.content)
        captured["auth"] = request.headers.get("authorization")
        return httpx.Response(
            201,
            json={"data": {"id": "upload_123", "url": "https://storage.googleapis.com/signed-url"}},
        )

    provider = _provider(handler)
    handle = await provider.create_upload(org_id=uuid4(), video_asset_id=uuid4())

    assert handle.upload_url == "https://storage.googleapis.com/signed-url"
    assert handle.provider_upload_ref == "upload_123"
    assert captured["method"] == "POST"
    assert captured["url"].endswith("/video/v1/uploads")
    assert captured["auth"].startswith("Basic ")  # basic auth header present


async def test_create_upload_stamps_passthrough_with_ids():
    org_id = uuid4()
    video_asset_id = uuid4()
    captured: dict = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured["body"] = json.loads(request.content)
        return httpx.Response(201, json={"data": {"id": "upload_x", "url": "https://x"}})

    provider = _provider(handler)
    await provider.create_upload(org_id=org_id, video_asset_id=video_asset_id)

    passthrough = json.loads(captured["body"]["new_asset_settings"]["passthrough"])
    assert passthrough == {"org_id": str(org_id), "video_asset_id": str(video_asset_id)}


async def test_create_upload_requests_public_playback_policy():
    captured: dict = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured["body"] = json.loads(request.content)
        return httpx.Response(201, json={"data": {"id": "u", "url": "https://x"}})

    provider = _provider(handler)
    await provider.create_upload(org_id=uuid4(), video_asset_id=uuid4())

    assert captured["body"]["new_asset_settings"]["playback_policy"] == ["public"]


# ---- fetch_upload ----------------------------------------------------------


async def test_fetch_upload_returns_asset_ref_once_graduated():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            200,
            json={"data": {"id": "upload_x", "status": "asset_created", "asset_id": "asset_y"}},
        )

    provider = _provider(handler)
    status = await provider.fetch_upload(provider_upload_ref="upload_x")

    assert status.provider_asset_ref == "asset_y"
    assert status.is_errored is False


async def test_fetch_upload_returns_none_while_waiting():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            200, json={"data": {"id": "upload_x", "status": "waiting", "asset_id": None}}
        )

    provider = _provider(handler)
    status = await provider.fetch_upload(provider_upload_ref="upload_x")

    assert status.provider_asset_ref is None
    assert status.is_errored is False


@pytest.mark.parametrize("terminal_status", ["errored", "cancelled", "timed_out"])
async def test_fetch_upload_reports_terminal_failures(terminal_status: str):
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            200,
            json={
                "data": {
                    "id": "upload_x",
                    "status": terminal_status,
                    "errors": [{"message": f"upload failed: {terminal_status}"}],
                }
            },
        )

    provider = _provider(handler)
    status = await provider.fetch_upload(provider_upload_ref="upload_x")

    assert status.is_errored is True
    assert status.provider_asset_ref is None
    assert status.error_message  # not empty


# ---- fetch_asset -----------------------------------------------------------


async def test_fetch_asset_ready_extracts_playback_and_duration():
    def handler(request: httpx.Request) -> httpx.Response:
        assert "/video/v1/assets/asset_abc" in str(request.url)
        return httpx.Response(
            200,
            json={
                "data": {
                    "id": "asset_abc",
                    "status": "ready",
                    "playback_ids": [{"id": "playback_xyz", "policy": "public"}],
                    "duration": 42.7,
                    "max_stored_resolution": "HD",
                }
            },
        )

    provider = _provider(handler)
    asset = await provider.fetch_asset(provider_asset_ref="asset_abc")

    assert asset.provider_asset_ref == "asset_abc"
    assert asset.playback_ref == "playback_xyz"
    assert asset.status is VideoAssetStatus.READY
    assert asset.duration_seconds == 42
    assert asset.max_resolution_height == 720


async def test_fetch_asset_preparing_maps_to_pending():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            200, json={"data": {"id": "asset_abc", "status": "preparing", "playback_ids": []}}
        )

    provider = _provider(handler)
    asset = await provider.fetch_asset(provider_asset_ref="asset_abc")

    assert asset.status is VideoAssetStatus.PENDING
    assert asset.playback_ref is None


async def test_fetch_asset_errored_maps_to_errored():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            200,
            json={
                "data": {
                    "id": "asset_abc",
                    "status": "errored",
                    "errors": [{"message": "input invalid"}],
                }
            },
        )

    provider = _provider(handler)
    asset = await provider.fetch_asset(provider_asset_ref="asset_abc")

    assert asset.status is VideoAssetStatus.ERRORED


async def test_fetch_asset_unknown_resolution_label_yields_null_height():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            200,
            json={
                "data": {
                    "id": "asset_abc",
                    "status": "ready",
                    "playback_ids": [{"id": "p", "policy": "public"}],
                    "duration": 1,
                    "max_stored_resolution": "8K",
                }
            },
        )

    provider = _provider(handler)
    asset = await provider.fetch_asset(provider_asset_ref="asset_abc")

    assert asset.max_resolution_height is None


# ---- error handling --------------------------------------------------------


async def test_request_raises_video_provider_api_error_on_4xx():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(404, text="not found")

    provider = _provider(handler)
    with pytest.raises(VideoProviderAPIError, match="404"):
        await provider.fetch_asset(provider_asset_ref="missing")


async def test_request_raises_video_provider_api_error_on_5xx():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(500, text="upstream error")

    provider = _provider(handler)
    with pytest.raises(VideoProviderAPIError, match="500"):
        await provider.fetch_asset(provider_asset_ref="asset_abc")


async def test_request_raises_video_provider_api_error_on_transport_failure():
    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("network down")

    provider = _provider(handler)
    with pytest.raises(VideoProviderAPIError, match="failed"):
        await provider.fetch_asset(provider_asset_ref="asset_abc")


async def test_request_raises_not_configured_when_credentials_unset(monkeypatch):
    monkeypatch.setattr("app.services.video.mux_provider.settings.MUX_TOKEN_ID", "")
    monkeypatch.setattr("app.services.video.mux_provider.settings.MUX_TOKEN_SECRET", "")
    provider = MuxVideoProvider()
    with pytest.raises(VideoProviderNotConfigured):
        await provider.fetch_asset(provider_asset_ref="asset_abc")


# ---- is_configured --------------------------------------------------------


def test_is_configured_requires_both_creds(monkeypatch):
    monkeypatch.setattr("app.services.video.mux_provider.settings.MUX_TOKEN_ID", "x")
    monkeypatch.setattr("app.services.video.mux_provider.settings.MUX_TOKEN_SECRET", "")
    assert is_configured() is False

    monkeypatch.setattr("app.services.video.mux_provider.settings.MUX_TOKEN_SECRET", "y")
    assert is_configured() is True


# ---- still-stubbed methods -------------------------------------------------


async def test_delete_is_still_stub():
    provider = _provider(lambda r: httpx.Response(204))
    with pytest.raises(NotImplementedError, match="sweeper"):
        await provider.delete(provider_asset_ref="asset_abc")
