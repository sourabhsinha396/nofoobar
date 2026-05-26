from functools import cache

from app.services.video.base import VideoProvider, VideoProviderName
from app.services.video.mux_provider import MuxVideoProvider


@cache
def get_provider(name: VideoProviderName) -> VideoProvider:
    """Return a singleton VideoProvider instance for the given name.

    Routes resolve adapters through this; routes never import provider
    modules directly. Add new providers (Bunny, Cloudflare) here as they're
    implemented."""
    if name is VideoProviderName.MUX:
        return MuxVideoProvider()
    raise NotImplementedError(f"Video provider {name} is not yet implemented.")
