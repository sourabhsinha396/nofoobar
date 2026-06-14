import json
from enum import StrEnum
from typing import Any
from uuid import UUID, uuid4

from sqlalchemy import Enum as SAEnum
from sqlalchemy import LargeBinary, text
from sqlmodel import Field

from app.core.encryption import decrypt, encrypt
from app.db.models.common import TimestampedModel


class IntegrationProvider(StrEnum):
    """Stable identifier for each integration. Persisted on OrgIntegration rows,
    so values are part of the schema - never rename, only add.

    Defined here (the model layer) so it can back the DB column; the integration
    service imports it from here, mirroring how PaymentProvider lives on
    OrgPaymentAccount.
    """

    WEBHOOK = "webhook"
    SLACK = "slack"
    POSTHOG = "posthog"


class OrgIntegration(TimestampedModel, table=True):
    """A tenant's configured instance of an outbound integration.

    Multiple rows may exist per (org, provider) - e.g. several webhook endpoints
    pointing at different URLs - so the row `id` is the handle, not
    (org_id, provider). The presence of a row plus `enabled=True` means the
    integration fires; flipping `enabled` off pauses it without losing config.

    `encrypted_config` holds the *entire* provider config as Fernet-encrypted
    JSON, because some providers' config includes secrets. Non-secret fields are
    still only exposed through the API after decrypt + SecretStr masking.
    """

    __tablename__ = "org_integrations"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    org_id: UUID = Field(foreign_key="organizations.id", index=True)
    provider: IntegrationProvider = Field(
        sa_type=SAEnum(
            IntegrationProvider,
            name="integration_provider",
            values_callable=lambda enum: [m.value for m in enum],
        ),
    )
    enabled: bool = Field(
        default=True,
        sa_column_kwargs={"server_default": text("true"), "nullable": False},
    )
    encrypted_config: bytes = Field(sa_type=LargeBinary)

    @property
    def config(self) -> dict[str, Any]:
        """Decrypted provider config. Never serialise this raw - secret fields
        must be masked before leaving the API."""
        return json.loads(decrypt(self.encrypted_config))

    @staticmethod
    def encrypt_config(data: dict[str, Any]) -> bytes:
        """Encrypt a config dict for at-rest storage. JSON so it round-trips
        through one opaque ciphertext column regardless of provider shape."""
        return encrypt(json.dumps(data))
