import logging

import razorpay
import razorpay.errors

from app.services.payments.base import (
    GatewayCheckoutSession,
    GatewayCheckoutStatus,
    GatewayCredentials,
    PaymentProvider,
)

logger = logging.getLogger(__name__)


class RazorpayPaymentGateway:
    """BYO-keys Razorpay integration.

    Each tenant pastes their own rzp_test_/rzp_live_ key_id + key_secret.
    Unlike Stripe Hosted Checkout, Razorpay uses a client-side JS modal -
    the gateway creates an Order, and the frontend opens the modal with
    the order_id + key_id. There's no redirect URL.

    Each tenant is the merchant of record on their own Razorpay account.
    """

    provider = PaymentProvider.RAZORPAY

    def verify_credentials(self, *, credentials: GatewayCredentials) -> bool:
        client = self._client(credentials)
        try:
            client.order.all({"count": 1})
            return True
        except razorpay.errors.BadRequestError:
            return False

    def create_checkout_session(
        self,
        *,
        credentials: GatewayCredentials,
        amount_cents: int,
        currency: str,
        product_name: str,
        product_description: str | None,
        user_email: str,
        success_url: str,
        cancel_url: str,
        metadata: dict[str, str],
    ) -> GatewayCheckoutSession:
        client = self._client(credentials)
        order = client.order.create(
            {
                "amount": amount_cents,
                "currency": currency,
                "receipt": metadata.get("payment_attempt_id", ""),
                # Razorpay notes ≈ Stripe metadata. Cap is 15 keys / 256 chars each.
                "notes": metadata,
            }
        )
        # product_name + description aren't part of the Order payload - they
        # show up in the JS modal which the frontend opens separately with
        # the order_id we return.
        return GatewayCheckoutSession(
            external_session_id=order["id"],
            redirect_url=None,
        )

    def retrieve_checkout_status(
        self,
        *,
        credentials: GatewayCredentials,
        external_session_id: str,
    ) -> GatewayCheckoutStatus:
        client = self._client(credentials)
        order = client.order.fetch(external_session_id)
        # Razorpay order statuses: created / attempted / paid. "paid" means
        # the full amount has been captured. Orders don't expire by default.
        return GatewayCheckoutStatus(
            paid=order["status"] == "paid",
            expired=False,
        )

    @staticmethod
    def _client(credentials: GatewayCredentials) -> razorpay.Client:
        return razorpay.Client(auth=(credentials.key_id, credentials.secret_key))
