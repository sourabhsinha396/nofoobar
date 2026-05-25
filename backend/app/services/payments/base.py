from typing import Protocol

from pydantic import BaseModel

from app.db.models.payment_account import PaymentProvider

__all__ = [
    "GatewayCheckoutSession",
    "GatewayCheckoutStatus",
    "GatewayCredentials",
    "InvalidCredentialsError",
    "PaymentGateway",
    "PaymentProvider",
]


class InvalidCredentialsError(Exception):
    """Raised when a gateway can't authenticate with the supplied credentials."""


class GatewayCredentials(BaseModel):
    """Tenant-provided credentials passed per-call to a PaymentGateway.

    `key_id` is the provider's public-ish identifier (Stripe pk_*, Razorpay
    key_id). `secret_key` is the decrypted secret — never log or serialise.
    """

    key_id: str
    secret_key: str


class GatewayCheckoutSession(BaseModel):
    external_session_id: str
    # Populated for redirect-based hosted checkouts (Stripe). None for
    # modal-based flows (Razorpay) where the frontend opens a JS SDK overlay
    # using fields the route reconstructs from the OrgPaymentAccount + Course.
    redirect_url: str | None = None


class GatewayCheckoutStatus(BaseModel):
    paid: bool
    expired: bool


class PaymentGateway(Protocol):
    """Provider-agnostic interface for BYO-keys payment integrations.

    Implementations live in app/services/payments/<provider>_gateway.py and are
    registered via app/services/payments/registry.py. Routes resolve a gateway
    via get_gateway(provider), pull GatewayCredentials from OrgPaymentAccount,
    and never import provider SDKs directly.
    """

    provider: PaymentProvider

    def verify_credentials(self, *, credentials: GatewayCredentials) -> bool:
        """Cheap ping to confirm credentials are valid. Returns False on auth failure;
        re-raises other transport errors."""
        ...

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
        """Create a hosted checkout session using the tenant's own credentials.

        amount_cents + currency reflect what the buyer chose at checkout time
        (PPP-converted from the course's base price by the route); the gateway
        just uses them verbatim.
        """
        ...

    def retrieve_checkout_status(
        self,
        *,
        credentials: GatewayCredentials,
        external_session_id: str,
    ) -> GatewayCheckoutStatus:
        """Look up the current payment state of a previously-created session."""
        ...
