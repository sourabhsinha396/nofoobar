import socket

import pytest

from app.services import domains


def _fake_resolver(mapping: dict[str, set[str]]):
    def resolve(host: str) -> set[str]:
        try:
            return mapping[host]
        except KeyError:
            raise OSError(f"NXDOMAIN: {host}") from None

    return resolve


@pytest.mark.anyio
async def test_connected_when_domain_and_target_share_an_ip(monkeypatch):
    monkeypatch.setattr(
        domains,
        "_resolve_ips",
        _fake_resolver(
            {
                "domains.nofoobar.com": {"1.2.3.4"},
                "learn.acme.com": {"1.2.3.4"},
            }
        ),
    )
    result = await domains.check_domain_dns("learn.acme.com", "domains.nofoobar.com")
    assert result.connected is True
    assert result.resolved_ips == ["1.2.3.4"]


@pytest.mark.anyio
async def test_not_connected_when_ips_differ(monkeypatch):
    monkeypatch.setattr(
        domains,
        "_resolve_ips",
        _fake_resolver(
            {
                "domains.nofoobar.com": {"1.2.3.4"},
                "learn.acme.com": {"9.9.9.9"},
            }
        ),
    )
    result = await domains.check_domain_dns("learn.acme.com", "domains.nofoobar.com")
    assert result.connected is False
    assert result.message is not None


@pytest.mark.anyio
async def test_unresolvable_domain_reports_propagation_message(monkeypatch):
    monkeypatch.setattr(
        domains,
        "_resolve_ips",
        _fake_resolver({"domains.nofoobar.com": {"1.2.3.4"}}),
    )
    result = await domains.check_domain_dns("not-set-up.com", "domains.nofoobar.com")
    assert result.connected is False
    assert "propagate" in (result.message or "")


@pytest.mark.anyio
async def test_unconfigured_target_short_circuits(monkeypatch):
    def boom(host: str) -> set[str]:
        raise AssertionError("must not resolve anything when target is unset")

    monkeypatch.setattr(domains, "_resolve_ips", boom)
    result = await domains.check_domain_dns("learn.acme.com", "")
    assert result.connected is False
    assert "not configured" in (result.message or "")


def test_resolver_uses_tcp_proto_to_dedupe():
    # Sanity check against the real resolver on localhost - should not raise
    # and should return at least one address.
    ips = domains._resolve_ips("localhost")
    assert ips
    assert all(isinstance(ip, str) for ip in ips)
    # Guard the proto choice: without IPPROTO_TCP, getaddrinfo returns
    # duplicate entries per socket type.
    infos = socket.getaddrinfo("localhost", None, proto=socket.IPPROTO_TCP)
    assert {i[4][0] for i in infos} == ips
