from functools import cache

from cryptography.fernet import Fernet, InvalidToken

from app.core.config import settings


class EncryptionError(Exception):
    """Raised when a secret can't be decrypted (wrong key, corrupted ciphertext)."""


@cache
def _cipher() -> Fernet:
    if not settings.SECRETS_ENCRYPTION_KEY:
        raise RuntimeError(
            "SECRETS_ENCRYPTION_KEY is not set. Generate one with "
            "`python -c \"from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())\"` "
            "and add it to backend/.env."
        )
    return Fernet(settings.SECRETS_ENCRYPTION_KEY.encode())


def encrypt(plain: str) -> bytes:
    """Symmetric-encrypt a string for at-rest storage. Returns raw ciphertext bytes."""
    return _cipher().encrypt(plain.encode("utf-8"))


def decrypt(encrypted: bytes) -> str:
    """Inverse of `encrypt`. Raises EncryptionError if the ciphertext can't be decrypted."""
    try:
        return _cipher().decrypt(encrypted).decode("utf-8")
    except InvalidToken as exc:
        raise EncryptionError("Failed to decrypt secret (key mismatch or corrupted data)") from exc
