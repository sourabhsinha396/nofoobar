import pytest

from app.db.models.video_asset import VideoProviderName
from app.services.video.mux_provider import MuxVideoProvider
from app.services.video.registry import get_provider


def test_get_provider_returns_mux_for_mux_enum():
    provider = get_provider(VideoProviderName.MUX)
    assert isinstance(provider, MuxVideoProvider)


def test_get_provider_is_cached_singleton():
    a = get_provider(VideoProviderName.MUX)
    b = get_provider(VideoProviderName.MUX)
    assert a is b


def test_get_provider_raises_for_unimplemented():
    with pytest.raises(NotImplementedError):
        get_provider(VideoProviderName.BUNNY)
    with pytest.raises(NotImplementedError):
        get_provider(VideoProviderName.CLOUDFLARE)
