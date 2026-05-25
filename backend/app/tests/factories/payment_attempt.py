from polyfactory.factories.pydantic_factory import ModelFactory

from app.db.models.payment_attempt import PaymentAttempt


class PaymentAttemptFactory(ModelFactory[PaymentAttempt]):
    __model__ = PaymentAttempt
