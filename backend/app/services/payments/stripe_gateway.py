import logging
from typing import Any

import stripe

from app.services.payments.base import (
    GatewayCheckoutSession,
    GatewayCheckoutStatus,
    GatewayCredentials,
    PaymentProvider,
)

logger = logging.getLogger(__name__)


class StripePaymentGateway:
    """BYO-keys Stripe integration.

    The tenant pastes their own sk_* secret key. All Stripe API calls pass
    `api_key=tenant_secret` per-call; we never set the module-level
    `stripe.api_key`, which means each tenant's requests are properly
    isolated.

    Each tenant is the merchant of record on their own Stripe account — no
    Connect, no platform fees, no `stripe_account=` header.
    """

    provider = PaymentProvider.STRIPE

    def verify_credentials(self, *, credentials: GatewayCredentials) -> bool:
        try:
            stripe.Balance.retrieve(api_key=credentials.secret_key)
            return True
        except stripe.AuthenticationError:
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
        session = stripe.checkout.Session.create(
            api_key=credentials.secret_key,
            **self._build_session_params(
                amount_cents=amount_cents,
                currency=currency,
                product_name=product_name,
                product_description=product_description,
                user_email=user_email,
                success_url=success_url,
                cancel_url=cancel_url,
                metadata=metadata,
            ),
        )
        return GatewayCheckoutSession(
            external_session_id=session.id,
            redirect_url=session.url,
        )

    def retrieve_checkout_status(
        self,
        *,
        credentials: GatewayCredentials,
        external_session_id: str,
    ) -> GatewayCheckoutStatus:
        session = stripe.checkout.Session.retrieve(
            external_session_id, api_key=credentials.secret_key
        )
        return GatewayCheckoutStatus(
            paid=session.payment_status == "paid",
            expired=session.status == "expired",
        )

    @staticmethod
    def _build_session_params(
        *,
        amount_cents: int,
        currency: str,
        product_name: str,
        product_description: str | None,
        user_email: str,
        success_url: str,
        cancel_url: str,
        metadata: dict[str, str],
    ) -> dict[str, Any]:
        product_data: dict[str, Any] = {"name": product_name}
        if product_description:
            product_data["description"] = product_description
        return {
            "mode": "payment",
            "line_items": [
                {
                    "price_data": {
                        "currency": currency.lower(),
                        "unit_amount": amount_cents,
                        "product_data": product_data,
                    },
                    "quantity": 1,
                }
            ],
            "customer_email": user_email,
            "success_url": success_url,
            "cancel_url": cancel_url,
            "metadata": metadata,
            "payment_intent_data": {"metadata": metadata},
        }
