import json
import logging
from collections.abc import AsyncIterator
from typing import Any
from uuid import UUID

import httpx

from app.core.config import settings
from app.db.models.video_asset import VideoAssetStatus
from app.services.video.base import (
    ProviderAsset,
    UploadHandle,
    UploadStatus,
    VideoProviderAPIError,
    VideoProviderName,
    VideoProviderNotConfigured,
)

logger = logging.getLogger(__name__)

MUX_API_BASE = "https://api.mux.com"
# Mux upload statuses we care about. Anything else (cancelled, timed_out) is
# treated as a terminal failure — same handling as 'errored'.
_TERMINAL_UPLOAD_FAILURES = {"errored", "cancelled", "timed_out"}


class MuxVideoProvider:
    """Mux video adapter. Centralized credentials via settings.MUX_TOKEN_ID /
    settings.MUX_TOKEN_SECRET.

    Polling-based status updates, not webhooks — see docs/backend/video.md."""

    provider = VideoProviderName.MUX

    def __init__(self, transport: httpx.AsyncBaseTransport | None = None) -> None:
        # Tests inject httpx.MockTransport to short-circuit network calls.
        # Production callers go through get_provider() which uses the default
        # transport (real HTTP).
        self._transport = transport

    async def create_upload(self, *, org_id: UUID, video_asset_id: UUID) -> UploadHandle:
        # Passthrough is Mux's caller-controlled metadata field. We stash
        # {org_id, video_asset_id} so the reconciliation sweep can recover
        # ownership from Mux alone if our DB row is ever lost.
        passthrough = json.dumps({"org_id": str(org_id), "video_asset_id": str(video_asset_id)})
        body = {
            "new_asset_settings": {
                "playback_policy": ["public"],
                "passthrough": passthrough,
            },
            "cors_origin": "*",
        }
        data = await self._request("POST", "/video/v1/uploads", json=body)
        return UploadHandle(
            upload_url=data["url"],
            provider_upload_ref=data["id"],
        )

    async def fetch_upload(self, *, provider_upload_ref: str) -> UploadStatus:
        data = await self._request("GET", f"/video/v1/uploads/{provider_upload_ref}")
        status = data.get("status", "")
        asset_id = data.get("asset_id")
        if status in _TERMINAL_UPLOAD_FAILURES:
            return UploadStatus(
                provider_asset_ref=None,
                is_errored=True,
                error_message=_extract_error_message(data) or f"upload {status}",
            )
        return UploadStatus(provider_asset_ref=asset_id, is_errored=False)

    async def fetch_asset(self, *, provider_asset_ref: str) -> ProviderAsset:
        data = await self._request("GET", f"/video/v1/assets/{provider_asset_ref}")
        return _to_provider_asset(data)

    async def delete(self, *, provider_asset_ref: str) -> None:
        raise NotImplementedError("MuxVideoProvider.delete — implemented in sweeper chunk")

    async def list_assets(self) -> AsyncIterator[ProviderAsset]:
        raise NotImplementedError("MuxVideoProvider.list_assets — implemented in sweeper chunk")
        yield  # type: ignore[unreachable]

    async def _request(
        self,
        method: str,
        path: str,
        *,
        json: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        # Configuration is checked per-call rather than in __init__ so the
        # singleton registry can be instantiated even when Mux isn't configured
        # (e.g. dev environments running without video). Routes guard with
        # is_configured() before calling.
        if not settings.MUX_TOKEN_ID or not settings.MUX_TOKEN_SECRET:
            raise VideoProviderNotConfigured(
                "Mux credentials not set — configure MUX_TOKEN_ID and MUX_TOKEN_SECRET"
            )

        client_kwargs: dict[str, Any] = {
            "base_url": MUX_API_BASE,
            "auth": (settings.MUX_TOKEN_ID, settings.MUX_TOKEN_SECRET),
            "timeout": 30.0,
        }
        if self._transport is not None:
            client_kwargs["transport"] = self._transport

        async with httpx.AsyncClient(**client_kwargs) as client:
            try:
                response = await client.request(method, path, json=json)
            except httpx.HTTPError as exc:
                raise VideoProviderAPIError(f"Mux {method} {path} failed: {exc}") from exc

        if response.status_code >= 400:
            raise VideoProviderAPIError(
                f"Mux {method} {path} returned {response.status_code}: {response.text}"
            )
        payload = response.json()
        # Mux wraps every response in {"data": ...}. Unwrap once here so callers
        # work with the inner object directly.
        return payload.get("data", {})


def is_configured() -> bool:
    return bool(settings.MUX_TOKEN_ID and settings.MUX_TOKEN_SECRET)


def _to_provider_asset(data: dict[str, Any]) -> ProviderAsset:
    playback_ids = data.get("playback_ids") or []
    playback_ref = playback_ids[0]["id"] if playback_ids else None
    duration = data.get("duration")
    return ProviderAsset(
        provider_asset_ref=data.get("id", ""),
        playback_ref=playback_ref,
        status=_map_asset_status(data.get("status", "")),
        duration_seconds=int(duration) if duration is not None else None,
        max_resolution_height=_resolution_height_from_label(data.get("max_stored_resolution")),
        bytes=None,
        metadata={"raw": data},
    )


def _map_asset_status(mux_status: str) -> VideoAssetStatus:
    # Mux asset states: preparing → ready / errored. Anything we don't recognise
    # falls back to pending so the polling loop keeps trying rather than locking
    # the row in a wrong terminal state.
    if mux_status == "ready":
        return VideoAssetStatus.READY
    if mux_status == "errored":
        return VideoAssetStatus.ERRORED
    return VideoAssetStatus.PENDING


def _resolution_height_from_label(label: str | None) -> int | None:
    # Mux reports max_stored_resolution as a label (SD, HD, FHD, UHD); not all
    # accounts include exact heights. Best-effort mapping; null when unknown.
    mapping = {"SD": 480, "HD": 720, "FHD": 1080, "UHD": 2160}
    return mapping.get(label or "")


def _extract_error_message(data: dict[str, Any]) -> str | None:
    errors = data.get("errors") or []
    if errors and isinstance(errors, list):
        first = errors[0]
        if isinstance(first, dict):
            return first.get("message")
    return None
