from sqlmodel import SQLModel

from app.db.models.payment_account import PaymentProvider


class OrgPaymentAccountPublic(SQLModel):
    """Minimal projection of a connected payment account.

    Frontend uses provider + key_id to render "Stripe connected as pk_test_..."
    and dispatch checkout. secret_key is never exposed.
    """

    provider: PaymentProvider
    key_id: str
