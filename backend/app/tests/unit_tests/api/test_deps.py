from unittest.mock import MagicMock

import pytest
from fastapi import HTTPException

from app.api.deps import _resolve_tenant
from app.core.config import settings


def _request(host: str, slug_header: str | None = None) -> MagicMock:
    request = MagicMock()
    headers = {"host": host}
    if slug_header is not None:
        headers["x-tenant-slug"] = slug_header
    request.headers = headers
    return request


def test_localhost_with_slug_header_returns_slug_lookup():
    assert _resolve_tenant(_request("localhost", "acme")) == ("slug", "acme")


def test_localhost_strips_port():
    assert _resolve_tenant(_request("localhost:8000", "acme")) == ("slug", "acme")


def test_127_loopback_treated_as_local():
    assert _resolve_tenant(_request("127.0.0.1", "acme")) == ("slug", "acme")


def test_host_docker_internal_treated_as_local():
    assert _resolve_tenant(_request("host.docker.internal", "acme")) == ("slug", "acme")


def test_localhost_without_slug_header_raises_400():
    with pytest.raises(HTTPException) as exc:
        _resolve_tenant(_request("localhost"))
    assert exc.value.status_code == 400


def test_slug_header_is_lowercased():
    assert _resolve_tenant(_request("localhost", "ACME")) == ("slug", "acme")


def test_subdomain_of_apex_returns_slug_lookup():
    assert _resolve_tenant(_request(f"acme.{settings.APEX_DOMAIN}")) == ("slug", "acme")


def test_subdomain_match_is_case_insensitive():
    assert _resolve_tenant(_request(f"ACME.{settings.APEX_DOMAIN.upper()}")) == ("slug", "acme")


def test_nested_subdomain_raises_404():
    with pytest.raises(HTTPException) as exc:
        _resolve_tenant(_request(f"foo.acme.{settings.APEX_DOMAIN}"))
    assert exc.value.status_code == 404


def test_custom_domain_returns_domain_lookup():
    assert _resolve_tenant(_request("learn.acme.com")) == ("domain", "learn.acme.com")


def test_apex_with_slug_header_uses_slug_lookup():
    # Server-to-server: Next fetches the backend at apex:port and tells us the
    # originating tenant via X-Tenant-Slug. The apex host is a trusted carrier.
    assert _resolve_tenant(_request(settings.APEX_DOMAIN, "demo")) == ("slug", "demo")


def test_apex_without_slug_header_raises_400():
    with pytest.raises(HTTPException) as exc:
        _resolve_tenant(_request(settings.APEX_DOMAIN))
    assert exc.value.status_code == 400
