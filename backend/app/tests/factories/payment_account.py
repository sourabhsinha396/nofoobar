from polyfactory.factories.pydantic_factory import ModelFactory

from app.db.models.payment_account import OrgPaymentAccount


class OrgPaymentAccountFactory(ModelFactory[OrgPaymentAccount]):
    """Polyfactory generates random bytes for `secret_key` by default — fine for
    tests that don't read `decrypted_secret_key`. Tests that DO need to decrypt
    should `.build(secret_key=encrypt("sk_test_..."))` explicitly."""

    __model__ = OrgPaymentAccount
