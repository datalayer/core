# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

# Copyright (c) 2023-2026 Datalayer, Inc.
# Datalayer License

"""The OTEL service declares its trace routes without a trailing slash and
does not redirect, so a request with one is a 404 for a trace the listing
route had just returned — which is what `datalayer mcp trace` sent for
every run, and why it showed nothing."""

from __future__ import annotations

from datalayer_core.otel.client import OtelClient


def _client(seen: list[str]) -> OtelClient:
    client = OtelClient(base_url="https://otel.test", token="t")
    client._get = lambda path, params=None: seen.append(path) or {"spans": [], "services": []}  # type: ignore[method-assign]
    return client


def test_a_trace_is_asked_for_without_a_trailing_slash():
    seen: list[str] = []
    _client(seen).get_trace("4bf92f3577b34da6a3ce929d0e0e4736")
    assert seen == ["/api/otel/v1/traces/4bf92f3577b34da6a3ce929d0e0e4736"]


def test_the_services_are_listed_without_one():
    seen: list[str] = []
    _client(seen).list_services()
    assert seen == ["/api/otel/v1/traces/services/list"]
