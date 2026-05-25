from sqlmodel import SQLModel


class ImageUploadResponse(SQLModel):
    # Where the uploaded file lives. Writable directly into logo_url
    # (or any other image-URL column).
    public_url: str
