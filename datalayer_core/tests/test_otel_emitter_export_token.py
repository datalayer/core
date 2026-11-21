# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""An emitter exports with the platform's key where the process holds one, under the person's uid."""

from __future__ import annotations

import base64
import json
from typing import Any

import pytest

pytest.importorskip("opentelemetry.exporter.otlp.proto.http.metric_exporter")

from opentelemetry.exporter.otlp.proto.http import metric_exporter, trace_exporter

from datalayer_core.otel.emitter import OTelEmitter


def _jwt(uid: str) -> str:
    def part(payload: dict[str, Any]) -> str:
        return (
            base64.urlsafe_b64encode(json.dumps(payload).encode()).decode().rstrip("=")
        )

    return f"{part({'alg': 'HS256'})}.{part({'sub': uid, 'user': {'uid': uid}})}.sig"


@pytest.fixture
def exporters(monkeypatch: pytest.MonkeyPatch) -> list[tuple[str, Any]]:
    """The exporters' headers, as built; nothing is sent."""
    built: list[tuple[str, Any]] = []

    def capture(kind: str, base: type[Any]) -> type[Any]:
        class Exporter(base):  # the real exporter, which records what it was built with
            def __init__(
                self,
                endpoint: str | None = None,
                headers: dict[str, str] | None = None,
                **kw: Any,
            ) -> None:
                built.append((kind, headers))
                super().__init__(endpoint=endpoint, headers=headers, **kw)

        return Exporter

    monkeypatch.setattr(
        metric_exporter,
        "OTLPMetricExporter",
        capture("metrics", metric_exporter.OTLPMetricExporter),
    )
    monkeypatch.setattr(
        trace_exporter,
        "OTLPSpanExporter",
        capture("traces", trace_exporter.OTLPSpanExporter),
    )
    return built


def test_the_person_s_token_carries_the_export_without_a_platform_key(
    monkeypatch: pytest.MonkeyPatch, exporters: list[tuple[str, Any]]
) -> None:
    monkeypatch.delenv("DATALAYER_OTEL_API_KEY", raising=False)
    monkeypatch.delenv("DATALAYER_API_KEY", raising=False)
    monkeypatch.delenv("DATALAYER_USER_UID", raising=False)
    person = _jwt("01PERSON")
    emitter = OTelEmitter(service_name="test", token=person)
    assert emitter.enabled
    assert {kind for kind, _ in exporters} == {"metrics", "traces"}
    assert all(
        headers == {"Authorization": f"Bearer {person}"} for _, headers in exporters
    )


def test_the_platform_key_carries_the_export_and_the_person_stays_the_account(
    monkeypatch: pytest.MonkeyPatch, exporters: list[tuple[str, Any]]
) -> None:
    monkeypatch.setenv("DATALAYER_OTEL_API_KEY", _jwt("01PLATFORM"))
    monkeypatch.delenv("DATALAYER_USER_UID", raising=False)
    person = _jwt("01PERSON")
    emitter = OTelEmitter(service_name="test", token=person)
    assert emitter.enabled
    assert all(
        headers == {"Authorization": f"Bearer {_jwt('01PLATFORM')}"}
        for _, headers in exporters
    )
    # Filed under the person: the resource names them, not the key's holder.
    from opentelemetry import trace
    from opentelemetry.sdk.trace import TracerProvider

    provider = trace.get_tracer_provider()
    assert isinstance(provider, TracerProvider)
    resource = provider.resource.attributes
    assert resource["datalayer.user_uid"] == "01PERSON"


def test_no_token_at_all_is_refused(
    monkeypatch: pytest.MonkeyPatch, exporters: list[tuple[str, Any]]
) -> None:
    monkeypatch.delenv("DATALAYER_OTEL_API_KEY", raising=False)
    monkeypatch.delenv("DATALAYER_API_KEY", raising=False)
    with pytest.raises(ValueError, match="requires a token"):
        OTelEmitter(service_name="test", user_uid="01PERSON")
