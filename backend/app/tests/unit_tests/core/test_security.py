from app.core.security import hash_password, verify_password


def test_hash_password_returns_argon2_hash():
    hashed = hash_password("hunter2")
    assert hashed.startswith("$argon2")
    assert hashed != "hunter2"


def test_verify_password_accepts_correct_password():
    hashed = hash_password("hunter2")
    assert verify_password("hunter2", hashed) is True


def test_verify_password_rejects_wrong_password():
    hashed = hash_password("hunter2")
    assert verify_password("wrong", hashed) is False


def test_hash_password_produces_different_hash_each_call():
    assert hash_password("same") != hash_password("same")
