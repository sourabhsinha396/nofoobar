from pydantic import computed_field
from pydantic_core import MultiHostUrl
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_ignore_empty=True,
        extra="ignore",
    )

    PROJECT_NAME: str = "nofoobar"
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

    APEX_DOMAIN: str = "nofoobar.com"

    # Public hostname the API itself is served at (e.g. backend.nofoobar.com).
    # Requests addressed to this host carry the tenant in X-Tenant-Slug, same
    # as the apex - without this, an API host under the apex would be
    # misread as tenant subdomain "backend". Empty disables the carve-out.
    API_HOST: str = ""

    # Where tenants point their custom-domain DNS (e.g. domains.nofoobar.com,
    # a DNS-only record on the server IP). Used by the live DNS check in org
    # settings and shown to tenants as the CNAME target. Empty disables
    # checking. See docs/devops/custom-domains-caddy.md.
    DOMAINS_CNAME_TARGET: str = ""

    # Single regex covers apex + every tenant subdomain. Default matches localhost dev
    # without subdomains; override in .env for the dev-subdomains workflow or prod.
    CORS_ORIGIN_REGEX: str = r"^http://(localhost|127\.0\.0\.1):3000$"

    # Fernet key for at-rest encryption of tenant payment-provider secrets
    # stored in org_payment_accounts. Generate with:
    #   python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
    # Rotating this key invalidates every stored secret - tenants must re-paste keys.
    SECRETS_ENCRYPTION_KEY: str = ""

    # S3-compatible object storage for tenant-uploaded images (course logos,
    # later: lesson covers, org logos). Nofoobar uses Cloudflare R2 in
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
    # Public URL prefix that the bucket is reachable at - R2's public dev URL
    # (https://pub-<hash>.r2.dev) or a custom domain. logo_url written to the
    # DB is built as {S3_PUBLIC_URL_BASE}/{object-key}.
    S3_PUBLIC_URL_BASE: str = ""

    # Daily Postgres backup. A pg_dump (-Fc custom format: compressed +
    # selectively restorable) is pushed to the same S3/R2 bucket as uploads,
    # under BACKUP_S3_PREFIX. Retention keeps BACKUP_KEEP newest and prunes the
    # rest. Triggered by Celery beat at BACKUP_HOUR_UTC - see app/worker.py and
    # docs/devops/db-backups.md. Reuses the S3_* and POSTGRES_* settings above.
    BACKUP_S3_PREFIX: str = "db_backups/"
    BACKUP_KEEP: int = 7
    BACKUP_HOUR_UTC: int = 2

    # Local-dev escape hatch. When true, the backup task writes the dump to
    # LOCAL_BACKUP_DIR on disk and skips the S3/R2 upload entirely - so you can
    # exercise pg_dump + retention without object-storage credentials. Retention
    # (BACKUP_KEEP) still applies, against the local directory. Keep false in
    # prod. (Env key spelled RUNNING_LOCALALLY to match the .env.)
    RUNNING_LOCALALLY: bool = False
    LOCAL_BACKUP_DIR: str = "db_backups"

    # Celery broker + result backend. Used by the worker/beat containers for
    # the backup task (and any later background jobs). Defaults to the compose
    # `redis` service; override in prod if Redis lives elsewhere.
    REDIS_URL: str = "redis://redis:6379/0"

    # Mux centralized credentials. One platform account, not BYO - see
    # docs/backend/video.md. Empty values disable Mux integration; the upload
    # route checks is_configured() and fails closed.
    MUX_TOKEN_ID: str = ""
    MUX_TOKEN_SECRET: str = ""

    # Outbound webhook integration. Every delivery is bounded by this timeout
    # (connect + read + write) so a slow or unresponsive tenant endpoint can't
    # tie up the background delivery task. Failures are logged and dropped -
    # delivery is at-most-once.
    WEBHOOK_TIMEOUT_SECONDS: float = 10.0

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
