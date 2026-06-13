import socket

from anyio import to_thread
from pydantic import BaseModel


class DomainDnsStatus(BaseModel):
    domain: str
    expected_target: str | None
    connected: bool
    resolved_ips: list[str]
    expected_ips: list[str]
    message: str | None = None


def _resolve_ips(host: str) -> set[str]:
    # getaddrinfo follows CNAME chains, so this works whether the tenant
    # added a CNAME to the platform target or pointed an A record straight
    # at the server IP.
    infos = socket.getaddrinfo(host, None, proto=socket.IPPROTO_TCP)
    return {info[4][0] for info in infos}


async def check_domain_dns(domain: str, expected_target: str) -> DomainDnsStatus:
    """Live DNS check: does `domain` currently resolve to the same address(es)
    as the platform's ingress target? Computed on demand - no stored state, so
    the answer is never stale."""
    target = expected_target.strip().lower()
    if not target:
        return DomainDnsStatus(
            domain=domain,
            expected_target=None,
            connected=False,
            resolved_ips=[],
            expected_ips=[],
            message="Domain checking is not configured on this server (DOMAINS_CNAME_TARGET).",
        )

    try:
        expected_ips = await to_thread.run_sync(_resolve_ips, target)
    except OSError:
        return DomainDnsStatus(
            domain=domain,
            expected_target=target,
            connected=False,
            resolved_ips=[],
            expected_ips=[],
            message=f"The platform target {target} did not resolve; contact support.",
        )

    try:
        resolved_ips = await to_thread.run_sync(_resolve_ips, domain)
    except OSError:
        return DomainDnsStatus(
            domain=domain,
            expected_target=target,
            connected=False,
            resolved_ips=[],
            expected_ips=sorted(expected_ips),
            message="Domain does not resolve yet. DNS changes can take a few minutes to propagate.",
        )

    connected = bool(resolved_ips & expected_ips)
    return DomainDnsStatus(
        domain=domain,
        expected_target=target,
        connected=connected,
        resolved_ips=sorted(resolved_ips),
        expected_ips=sorted(expected_ips),
        message=None if connected else "Domain resolves, but not to this platform yet.",
    )
