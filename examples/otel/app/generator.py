# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""Generate sample OpenTelemetry traces, logs and metrics using the OTel SDK.

Signals are exported via OTLP/HTTP to the Datalayer OTEL backend (which
expects OTLP on its `/v1/traces`, `/v1/logs`, `/v1/metrics` endpoints).
"""

from __future__ import annotations

import logging
import os
import random
import time
import uuid
from contextlib import contextmanager
from typing import Iterator

from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.trace import StatusCode

from opentelemetry.sdk._logs import LoggerProvider, LoggingHandler
from opentelemetry.sdk._logs.export import BatchLogRecordProcessor
from opentelemetry.exporter.otlp.proto.http._log_exporter import OTLPLogExporter
from opentelemetry._logs import set_logger_provider, get_logger_provider

from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.exporter.otlp.proto.http.metric_exporter import OTLPMetricExporter

from opentelemetry.sdk.resources import Resource

logger = logging.getLogger(__name__)

# ── OTLP endpoint helper ────────────────────────────────────────────

def _otlp_endpoint() -> str:
    """Return the OTLP base endpoint (without /v1/traces etc.)."""
    # The Datalayer OTEL service exposes OTLP endpoints under /v1/
    base = os.environ.get("DATALAYER_OTEL_URL", "http://localhost:7800")
    return base.rstrip("/")


def _resource(service_name: str = "otel-example") -> Resource:
    return Resource.create({"service.name": service_name})


# ── Trace generation ────────────────────────────────────────────────

SERVICE_NAMES = ["otel-example", "api-gateway", "user-service", "ml-pipeline"]
SPAN_TEMPLATES = [
    ("HTTP GET /api/users", "SERVER"),
    ("HTTP POST /api/predict", "SERVER"),
    ("SELECT * FROM users", "CLIENT"),
    ("Redis GET session:{uid}", "CLIENT"),
    ("gpt-4o chat completion", "CLIENT"),
    ("preprocess_data", "INTERNAL"),
    ("validate_input", "INTERNAL"),
    ("serialize_response", "INTERNAL"),
    ("send_notification", "PRODUCER"),
    ("consume_event", "CONSUMER"),
]


def generate_sample_traces(count: int = 3) -> None:
    """Generate *count* multi-span traces and export via OTLP/HTTP.

    Each trace has a root span with 1-3 children, each child can have
    0-2 grandchildren, and each grandchild can have 0-1 great-grandchild,
    producing realistic nested call-trees for the tree-view UI.
    """
    endpoint = _otlp_endpoint()
    for _ in range(count):
        svc = random.choice(SERVICE_NAMES)
        provider = TracerProvider(resource=_resource(svc))
        exporter = OTLPSpanExporter(endpoint=f"{endpoint}/v1/traces")
        provider.add_span_processor(BatchSpanProcessor(exporter))
        tracer = provider.get_tracer("otel-example-generator")

        # Root span
        root_tpl = random.choice(SPAN_TEMPLATES)
        with tracer.start_as_current_span(root_tpl[0]) as root:
            root.set_attribute("service.name", svc)
            root.set_attribute("example.generated", True)

            # 1–3 child spans
            n_children = random.randint(1, 3)
            for _ in range(n_children):
                child_tpl = random.choice(SPAN_TEMPLATES)
                child_svc = random.choice(SERVICE_NAMES)
                with tracer.start_as_current_span(child_tpl[0]) as child:
                    child.set_attribute("service.name", child_svc)
                    time.sleep(random.uniform(0.001, 0.02))
                    if random.random() > 0.6:
                        child.add_event(
                            "cache.miss",
                            attributes={"cache.key": f"user:{random.randint(1,999)}"},
                        )
                    if random.random() > 0.85:
                        child.set_status(StatusCode.ERROR, "simulated error")

                    # 0–2 grandchild spans
                    n_grandchildren = random.randint(0, 2)
                    for _ in range(n_grandchildren):
                        gc_tpl = random.choice(SPAN_TEMPLATES)
                        gc_svc = random.choice(SERVICE_NAMES)
                        with tracer.start_as_current_span(gc_tpl[0]) as gc:
                            gc.set_attribute("service.name", gc_svc)
                            time.sleep(random.uniform(0.001, 0.01))
                            if random.random() > 0.7:
                                gc.add_event(
                                    "db.query",
                                    attributes={"db.statement": "SELECT ..."},
                                )
                            if random.random() > 0.9:
                                gc.set_status(StatusCode.ERROR, "downstream failure")

                            # 0–1 great-grandchild span
                            if random.random() > 0.5:
                                ggc_tpl = random.choice(SPAN_TEMPLATES)
                                ggc_svc = random.choice(SERVICE_NAMES)
                                with tracer.start_as_current_span(ggc_tpl[0]) as ggc:
                                    ggc.set_attribute("service.name", ggc_svc)
                                    time.sleep(random.uniform(0.001, 0.005))

            # Small delay for root realism
            time.sleep(random.uniform(0.005, 0.03))

        provider.force_flush()
        provider.shutdown()


# ── Log generation ──────────────────────────────────────────────────

LOG_MESSAGES = [
    ("INFO", "Request processed successfully"),
    ("INFO", "User logged in"),
    ("WARNING", "Slow query detected: 2340ms"),
    ("ERROR", "Connection refused to database"),
    ("DEBUG", "Cache hit for key user:42"),
    ("INFO", "Model inference completed in 120ms"),
    ("ERROR", "Timeout waiting for upstream service"),
    ("WARNING", "Rate limit approaching: 95% used"),
    ("INFO", "Batch job completed: 1024 records"),
    ("DEBUG", "Serialised response payload: 4.2KB"),
]


def generate_sample_logs(count: int = 10) -> None:
    """Generate *count* log records and export via OTLP/HTTP."""
    endpoint = _otlp_endpoint()
    svc = random.choice(SERVICE_NAMES)
    resource = _resource(svc)

    log_provider = LoggerProvider(resource=resource)
    exporter = OTLPLogExporter(endpoint=f"{endpoint}/v1/logs")
    log_provider.add_log_record_processor(BatchLogRecordProcessor(exporter))
    set_logger_provider(log_provider)

    handler = LoggingHandler(level=logging.DEBUG, logger_provider=log_provider)
    otel_logger = logging.getLogger("otel-example-log-generator")
    otel_logger.addHandler(handler)
    otel_logger.setLevel(logging.DEBUG)

    for _ in range(count):
        severity, msg = random.choice(LOG_MESSAGES)
        level = getattr(logging, severity, logging.INFO)
        otel_logger.log(level, msg, extra={"service.name": svc})

    log_provider.force_flush()
    log_provider.shutdown()
    otel_logger.removeHandler(handler)


# ── Metric generation ───────────────────────────────────────────────

METRIC_NAMES = [
    ("http.server.duration", "ms"),
    ("http.server.request_count", "1"),
    ("system.cpu.utilization", "%"),
    ("system.memory.usage", "By"),
    ("db.client.operation.duration", "ms"),
]


def generate_sample_metrics(count: int = 5) -> None:
    """Generate *count* metric data-points and export via OTLP/HTTP."""
    endpoint = _otlp_endpoint()
    svc = random.choice(SERVICE_NAMES)
    resource = _resource(svc)

    exporter = OTLPMetricExporter(endpoint=f"{endpoint}/v1/metrics")
    reader = PeriodicExportingMetricReader(exporter, export_interval_millis=1000)
    provider = MeterProvider(resource=resource, metric_readers=[reader])

    meter = provider.get_meter("otel-example-generator")

    for _ in range(count):
        name, unit = random.choice(METRIC_NAMES)
        if "count" in name:
            counter = meter.create_counter(name, unit=unit, description=f"Sample {name}")
            counter.add(random.randint(1, 100), {"service.name": svc})
        elif "duration" in name:
            histogram = meter.create_histogram(name, unit=unit, description=f"Sample {name}")
            histogram.record(random.uniform(1.0, 5000.0), {"service.name": svc})
        else:
            gauge_val = random.uniform(0.0, 100.0)
            # Use an up-down counter to simulate a gauge
            gauge = meter.create_up_down_counter(name, unit=unit, description=f"Sample {name}")
            gauge.add(gauge_val, {"service.name": svc})

    # Wait for the reader to export
    provider.force_flush()
    provider.shutdown()
