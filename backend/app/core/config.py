from pydantic import computed_field
from pydantic_core import MultiHostUrl
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_ignore_empty=True,
        extra="ignore",
    )

    PROJECT_NAME: str = "algoholic"
    API_V1_STR: str = "/api/v1"

    POSTGRES_SERVER: str
    POSTGRES_PORT: int = 5432
    POSTGRES_USER: str
    POSTGRES_PASSWORD: str
    POSTGRES_DB: str

    SUPERADMIN_USERNAME: str
    SUPERADMIN_PASSWORD: str
    SESSION_SECRET: str
    SESSION_COOKIE_DOMAIN: str | None = None

    APEX_DOMAIN: str = "algoholic.io"

    # Single regex covers apex + every tenant subdomain. Default matches localhost dev
    # without subdomains; override in .env for the dev-subdomains workflow or prod.
    CORS_ORIGIN_REGEX: str = r"^http://(localhost|127\.0\.0\.1):3000$"

    # Fernet key for at-rest encryption of tenant payment-provider secrets
    # stored in org_payment_accounts. Generate with:
    #   python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
    # Rotating this key invalidates every stored secret — tenants must re-paste keys.
    SECRETS_ENCRYPTION_KEY: str = ""

    # S3-compatible object storage for tenant-uploaded images (course logos,
    # later: lesson covers, org logos). Algoholic uses Cloudflare R2 in
    # practice but everything goes through the boto3 client so any
    # S3-compatible provider works (AWS S3, Backblaze B2, MinIO, etc.).
    #
    # All five fields must be set for uploads to work. If any is empty, the
    # /uploads endpoint returns 503 and the frontend silently degrades to
    # paste-a-URL mode. See docs/devops/storage-r2.md for setup.
    S3_ENDPOINT_URL: str = ""  # e.g. https://<account>.r2.cloudflarestorage.com
    S3_ACCESS_KEY_ID: str = ""
    S3_SECRET_ACCESS_KEY: str = ""
    S3_BUCKET: str = ""
    # Public URL prefix that the bucket is reachable at — R2's public dev URL
    # (https://pub-<hash>.r2.dev) or a custom domain. logo_url written to the
    # DB is built as {S3_PUBLIC_URL_BASE}/{object-key}.
    S3_PUBLIC_URL_BASE: str = ""

    @computed_field  # type: ignore[prop-decorator]
    @property
    def DATABASE_URL(self) -> str:
        return str(
            MultiHostUrl.build(
                scheme="postgresql+asyncpg",
                username=self.POSTGRES_USER,
                password=self.POSTGRES_PASSWORD,
                host=self.POSTGRES_SERVER,
                port=self.POSTGRES_PORT,
                path=self.POSTGRES_DB,
            )
        )


settings = Settings()  # type: ignore[call-arg]
