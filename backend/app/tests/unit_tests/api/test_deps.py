from unittest.mock import MagicMock

import pytest
from fastapi import HTTPException

from app.api.deps import _resolve_slug


def _request(host: str, slug_header: str | None = None) -> MagicMock:
    request = MagicMock()
    headers = {"host": host}
    if slug_header is not None:
        headers["x-tenant-slug"] = slug_header
    request.headers = headers
    return request


def test_localhost_with_slug_header_returns_slug():
    assert _resolve_slug(_request("localhost", "acme")) == "acme"


def test_localhost_strips_port():
    assert _resolve_slug(_request("localhost:8000", "acme")) == "acme"


def test_127_loopback_treated_as_local():
    assert _resolve_slug(_request("127.0.0.1", "acme")) == "acme"


def test_host_docker_internal_treated_as_local():
    assert _resolve_slug(_request("host.docker.internal", "acme")) == "acme"


def test_localhost_without_slug_header_raises_400():
    with pytest.raises(HTTPException) as exc:
        _resolve_slug(_request("localhost"))
    assert exc.value.status_code == 400


def test_slug_header_is_lowercased():
    assert _resolve_slug(_request("localhost", "ACME")) == "acme"


def test_subdomain_resolves_to_first_label():
    assert _resolve_slug(_request("acme.algoholic.app")) == "acme"


def test_apex_domain_raises_404():
    with pytest.raises(HTTPException) as exc:
        _resolve_slug(_request("algoholic.app"))
    assert exc.value.status_code == 404
