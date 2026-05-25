from functools import cache

from app.services.payments.base import PaymentGateway, PaymentProvider
from app.services.payments.razorpay_gateway import RazorpayPaymentGateway
from app.services.payments.stripe_gateway import StripePaymentGateway


@cache
def get_gateway(provider: PaymentProvider) -> PaymentGateway:
    """Return a singleton PaymentGateway instance for the given provider.

    Routes call this to dispatch checkout / verify work to the right SDK.
    Add new providers here as they're implemented.
    """
    if provider is PaymentProvider.STRIPE:
        return StripePaymentGateway()
    if provider is PaymentProvider.RAZORPAY:
        return RazorpayPaymentGateway()
    raise NotImplementedError(f"Payment provider {provider} is not yet implemented.")
