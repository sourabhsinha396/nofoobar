import pytest
from cryptography.fernet import Fernet

from app.core import encryption
from app.core.config import settings
from app.core.encryption import EncryptionError, decrypt, encrypt


@pytest.fixture(autouse=True)
def _stable_key(monkeypatch):
    """Pin an encryption key for the test and reset the @cache'd Fernet."""
    monkeypatch.setattr(settings, "SECRETS_ENCRYPTION_KEY", Fernet.generate_key().decode())
    encryption._cipher.cache_clear()
    yield
    encryption._cipher.cache_clear()


def test_encrypt_decrypt_roundtrip():
    plain = "sk_test_super_secret_value_12345"
    assert decrypt(encrypt(plain)) == plain


def test_encrypt_produces_different_ciphertext_each_call():
    # Fernet uses a random nonce per call - same plaintext, different output.
    plain = "sk_test_same_input"
    assert encrypt(plain) != encrypt(plain)


def test_decrypt_with_rotated_key_raises(monkeypatch):
    encrypted = encrypt("sk_test_original")
    # Rotate the key - now the cipher can't decrypt the old token.
    monkeypatch.setattr(settings, "SECRETS_ENCRYPTION_KEY", Fernet.generate_key().decode())
    encryption._cipher.cache_clear()
    with pytest.raises(EncryptionError):
        decrypt(encrypted)


def test_cipher_raises_when_key_missing(monkeypatch):
    monkeypatch.setattr(settings, "SECRETS_ENCRYPTION_KEY", "")
    encryption._cipher.cache_clear()
    with pytest.raises(RuntimeError, match="SECRETS_ENCRYPTION_KEY"):
        encrypt("anything")
