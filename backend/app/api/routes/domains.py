from fastapi import APIRouter, HTTPException, status
from sqlmodel import select

from app.api.deps import SessionDep
from app.db.models.organization import Organization

router = APIRouter(prefix="/domains", tags=["domains"])


@router.get("/check")
async def check_domain(domain: str, session: SessionDep) -> dict[str, str]:
    """Caddy on-demand TLS "ask" endpoint.

    Caddy calls this before issuing a certificate for an unknown hostname:
    200 means "this domain belongs to a tenant, mint the cert"; any other
    status refuses issuance. This is the guard that stops strangers from
    pointing arbitrary domains at the server and burning ACME rate limits.
    See docs/devops/custom-domains-caddy.md.
    """
    host = domain.split(":")[0].strip().lower().rstrip(".")
    if not host or "/" in host or "." not in host:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Invalid domain: {domain}")
    result = await session.exec(
        select(Organization).where(Organization.custom_domain == host)
    )
    org = result.first()
    if org is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Unknown domain: {host}")
    return {"domain": host, "slug": org.slug}
