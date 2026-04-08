# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""Generic OpenTelemetry emitter helpers.

This module provides a lightweight helper for emitting metrics and spans to OTLP
using Datalayer environment conventions.
"""

from __future__ import annotations

import os
from contextlib import contextmanager
from typing import Any, Generator


class OTelEmitter:
    """Generic OTEL emitter for counters, histograms, and spans.

    The class is intentionally no-op when OpenTelemetry dependencies are not
    installed, so callers can use it without defensive try/except wrappers.
    """

    def __init__(
        self,
        service_name: str = "datalayer-service",
        service_version: str = "0.0.0",
    ) -> None:
        self.service_name = service_name
        self.service_version = service_version
        self._enabled = False
        self._tracer = None
        self._meter = None
        self._counters: dict[str, Any] = {}
        self._histograms: dict[str, Any] = {}

        try:
            from opentelemetry import metrics, trace
            from opentelemetry.exporter.otlp.proto.http.metric_exporter import (
                OTLPMetricExporter,
            )
            from opentelemetry.exporter.otlp.proto.http.trace_exporter import (
                OTLPSpanExporter,
            )
            from opentelemetry.sdk.metrics import MeterProvider
            from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
            from opentelemetry.sdk.resources import Resource
            from opentelemetry.sdk.trace import TracerProvider
            from opentelemetry.sdk.trace.export import BatchSpanProcessor

            otlp_base = (
                os.environ.get("DATALAYER_OTLP_URL")
                or os.environ.get("OTEL_EXPORTER_OTLP_ENDPOINT")
                or (
                    (os.environ.get("DATALAYER_RUN_URL") or "https://prod1.datalayer.run").rstrip("/")
                    + "/api/otel/v1/otlp"
                )
            ).rstrip("/")

            metrics_endpoint = (
                os.environ.get("DATALAYER_OTLP_METRICS_URL")
                or os.environ.get("OTEL_EXPORTER_OTLP_METRICS_ENDPOINT")
                or f"{otlp_base}/v1/metrics"
            )
            traces_endpoint = (
                os.environ.get("DATALAYER_OTLP_TRACES_URL")
                or os.environ.get("OTEL_EXPORTER_OTLP_TRACES_ENDPOINT")
                or f"{otlp_base}/v1/traces"
            )

            token = os.environ.get("DATALAYER_API_KEY")
            headers = {"Authorization": f"Bearer {token}"} if token else None

            resource = Resource.create(
                {
                    "service.name": self.service_name,
                    "service.version": self.service_version,
                }
            )

            tracer_provider = TracerProvider(resource=resource)
            tracer_provider.add_span_processor(
                BatchSpanProcessor(
                    OTLPSpanExporter(endpoint=traces_endpoint, headers=headers)
                )
            )
            trace.set_tracer_provider(tracer_provider)
            self._tracer = trace.get_tracer(self.service_name)

            metric_reader = PeriodicExportingMetricReader(
                OTLPMetricExporter(endpoint=metrics_endpoint, headers=headers),
                export_interval_millis=10_000,
            )
            meter_provider = MeterProvider(resource=resource, metric_readers=[metric_reader])
            metrics.set_meter_provider(meter_provider)
            self._meter = meter_provider.get_meter(self.service_name)

            self._enabled = True
        except Exception:
            self._enabled = False

    @property
    def enabled(self) -> bool:
        return self._enabled

    def add_counter(self, name: str, value: int | float, attributes: dict[str, Any] | None = None) -> None:
        if not self._enabled or self._meter is None:
            return
        if name not in self._counters:
            self._counters[name] = self._meter.create_counter(name)
        self._counters[name].add(value, attributes or {})

    def add_histogram(self, name: str, value: int | float, attributes: dict[str, Any] | None = None) -> None:
        if not self._enabled or self._meter is None:
            return
        if name not in self._histograms:
            self._histograms[name] = self._meter.create_histogram(name)
        self._histograms[name].record(value, attributes or {})

    @contextmanager
    def span(self, name: str, attributes: dict[str, Any] | None = None) -> Generator[Any, None, None]:
        if not self._enabled or self._tracer is None:
            yield None
            return
        with self._tracer.start_as_current_span(name, attributes=attributes or {}) as span:
            yield span
