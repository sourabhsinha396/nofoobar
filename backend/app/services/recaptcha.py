"""Server-side verification of Google reCAPTCHA v2 (checkbox) tokens.

The frontend renders the checkbox only when its site key is configured, and
the backend verifies only when RECAPTCHA_SECRET_KEY is set - so an
unconfigured environment (local dev, tests) skips the whole dance.
"""

import logging

import httpx
from fastapi import HTTPException, status

from app.core.config import settings

logger = logging.getLogger(__name__)

VERIFY_URL = "https://www.google.com/recaptcha/api/siteverify"


async def require_recaptcha(token: str) -> None:
    """Raise 400 unless the reCAPTCHA token verifies. No-op when unconfigured.

    Network failures reaching Google fail open (logged) - bot protection is
    best-effort and must not lock everyone out of signup/login during an
    upstream outage.
    """
    if not settings.RECAPTCHA_SECRET_KEY:
        return
    if not token:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Please complete the reCAPTCHA")
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.post(
                VERIFY_URL,
                data={"secret": settings.RECAPTCHA_SECRET_KEY, "response": token},
            )
            response.raise_for_status()
            result = response.json()
    except httpx.HTTPError:
        logger.warning("reCAPTCHA verification unreachable; allowing request")
        return
    if not result.get("success"):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "reCAPTCHA verification failed")
