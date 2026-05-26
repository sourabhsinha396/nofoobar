from polyfactory.factories.pydantic_factory import ModelFactory

from app.db.models.video_asset import VideoAsset


class VideoAssetFactory(ModelFactory[VideoAsset]):
    __model__ = VideoAsset
