from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest

from app.db.models.video_asset import VideoAsset, VideoAssetStatus, VideoProviderName
from app.services.video.base import (
    ProviderAsset,
    UploadStatus,
    VideoProviderAPIError,
)


def _exec_results(*first_values):
    return [MagicMock(first=MagicMock(return_value=v)) for v in first_values]


@pytest.fixture
def video_asset(fake_membership) -> VideoAsset:
    return VideoAsset(
        id=uuid4(),
        org_id=fake_membership.org_id,
        provider=VideoProviderName.MUX,
        provider_upload_ref="upload_xyz",
        provider_asset_ref=None,
        playback_ref=None,
        status=VideoAssetStatus.PENDING,
    )


@pytest.fixture
def fake_video_provider(monkeypatch) -> MagicMock:
    fake = MagicMock()
    fake.fetch_upload = AsyncMock()
    fake.fetch_asset = AsyncMock()
    monkeypatch.setattr("app.api.routes.video_assets.get_provider", lambda name: fake)
    return fake


# ---- 404 / auth -----------------------------------------------------------


def test_get_video_asset_returns_404_when_missing(client, fake_membership, mock_session):
    mock_session.exec.side_effect = _exec_results(None)
    response = client.get(f"/api/v1/video_assets/{uuid4()}", headers={"Host": "localhost"})
    assert response.status_code == 404


def test_get_video_asset_requires_authentication(client, mock_session):
    response = client.get(f"/api/v1/video_assets/{uuid4()}", headers={"Host": "localhost"})
    assert response.status_code == 401


def test_get_video_asset_isolates_by_org(client, fake_membership, mock_session):
    # The route filters .where(org_id == membership.org_id) before .first(); if
    # the row belongs to a different org the query returns None and we 404.
    mock_session.exec.side_effect = _exec_results(None)
    response = client.get(f"/api/v1/video_assets/{uuid4()}", headers={"Host": "localhost"})
    assert response.status_code == 404


# ---- terminal states short-circuit the provider call ---------------------


def test_get_ready_asset_returns_without_provider_call(
    client, fake_membership, video_asset, fake_video_provider, mock_session
):
    video_asset.status = VideoAssetStatus.READY
    video_asset.playback_ref = "playback_xyz"
    video_asset.duration_seconds = 42
    mock_session.exec.side_effect = _exec_results(video_asset)

    response = client.get(f"/api/v1/video_assets/{video_asset.id}", headers={"Host": "localhost"})

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ready"
    assert body["playback_ref"] == "playback_xyz"
    assert body["duration_seconds"] == 42
    fake_video_provider.fetch_upload.assert_not_called()
    fake_video_provider.fetch_asset.assert_not_called()


def test_get_errored_asset_returns_without_provider_call(
    client, fake_membership, video_asset, fake_video_provider, mock_session
):
    video_asset.status = VideoAssetStatus.ERRORED
    mock_session.exec.side_effect = _exec_results(video_asset)

    response = client.get(f"/api/v1/video_assets/{video_asset.id}", headers={"Host": "localhost"})

    assert response.status_code == 200
    assert response.json()["status"] == "errored"
    fake_video_provider.fetch_upload.assert_not_called()
    fake_video_provider.fetch_asset.assert_not_called()


# ---- upload phase: fetch_upload + maybe-graduate -------------------------


def test_pending_upload_still_waiting_returns_pending(
    client, fake_membership, video_asset, fake_video_provider, mock_session
):
    fake_video_provider.fetch_upload.return_value = UploadStatus(
        provider_asset_ref=None, is_errored=False
    )
    mock_session.exec.side_effect = _exec_results(video_asset)

    response = client.get(f"/api/v1/video_assets/{video_asset.id}", headers={"Host": "localhost"})

    assert response.status_code == 200
    assert response.json()["status"] == "pending"
    fake_video_provider.fetch_upload.assert_awaited_once_with(provider_upload_ref="upload_xyz")
    # Didn't graduate yet — fetch_asset should NOT have been called.
    fake_video_provider.fetch_asset.assert_not_called()


def test_pending_upload_graduated_then_fetches_asset(
    client, fake_membership, video_asset, fake_video_provider, mock_session
):
    fake_video_provider.fetch_upload.return_value = UploadStatus(
        provider_asset_ref="asset_abc", is_errored=False
    )
    fake_video_provider.fetch_asset.return_value = ProviderAsset(
        provider_asset_ref="asset_abc",
        playback_ref="playback_xyz",
        status=VideoAssetStatus.READY,
        duration_seconds=42,
        max_resolution_height=720,
    )
    mock_session.exec.side_effect = _exec_results(video_asset)

    response = client.get(f"/api/v1/video_assets/{video_asset.id}", headers={"Host": "localhost"})

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ready"
    assert body["playback_ref"] == "playback_xyz"
    assert body["duration_seconds"] == 42
    assert body["max_resolution_height"] == 720
    # Both calls happen in the same request — graduation then asset fetch.
    fake_video_provider.fetch_upload.assert_awaited_once()
    fake_video_provider.fetch_asset.assert_awaited_once_with(provider_asset_ref="asset_abc")


def test_pending_upload_errored_marks_asset_errored(
    client, fake_membership, video_asset, fake_video_provider, mock_session
):
    fake_video_provider.fetch_upload.return_value = UploadStatus(
        provider_asset_ref=None, is_errored=True, error_message="upload timed_out"
    )
    mock_session.exec.side_effect = _exec_results(video_asset)

    response = client.get(f"/api/v1/video_assets/{video_asset.id}", headers={"Host": "localhost"})

    assert response.status_code == 200
    assert response.json()["status"] == "errored"
    # No fetch_asset call — terminal failure short-circuits.
    fake_video_provider.fetch_asset.assert_not_called()


# ---- asset phase: direct fetch_asset -------------------------------------


def test_pending_asset_phase_polls_fetch_asset_only(
    client, fake_membership, video_asset, fake_video_provider, mock_session
):
    # provider_asset_ref already populated from an earlier poll — skip
    # fetch_upload entirely.
    video_asset.provider_asset_ref = "asset_abc"
    fake_video_provider.fetch_asset.return_value = ProviderAsset(
        provider_asset_ref="asset_abc",
        playback_ref=None,
        status=VideoAssetStatus.PENDING,  # still transcoding
    )
    mock_session.exec.side_effect = _exec_results(video_asset)

    response = client.get(f"/api/v1/video_assets/{video_asset.id}", headers={"Host": "localhost"})

    assert response.status_code == 200
    assert response.json()["status"] == "pending"
    fake_video_provider.fetch_upload.assert_not_called()
    fake_video_provider.fetch_asset.assert_awaited_once_with(provider_asset_ref="asset_abc")


# ---- provider error handling ---------------------------------------------


def test_provider_error_returns_current_db_state(
    client, fake_membership, video_asset, fake_video_provider, mock_session
):
    fake_video_provider.fetch_upload.side_effect = VideoProviderAPIError("Mux 503")
    mock_session.exec.side_effect = _exec_results(video_asset)

    response = client.get(f"/api/v1/video_assets/{video_asset.id}", headers={"Host": "localhost"})

    # Don't fail the request — let frontend keep polling. State is whatever
    # the DB row currently says.
    assert response.status_code == 200
    assert response.json()["status"] == "pending"
