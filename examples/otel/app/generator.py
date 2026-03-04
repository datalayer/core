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
from opentelemetry.sdk.metrics.view import View, ExponentialBucketHistogramAggregation

from opentelemetry.sdk.resources import Resource

logger = logging.getLogger(__name__)

# ── OTLP endpoint helper ────────────────────────────────────────────

def _otlp_endpoint() -> str:
    """Return the OTLP base endpoint (without /v1/traces etc.).

    Uses ``DATALAYER_OTLP_URL`` which should point at the OTLP
    collector HTTP port (default 4318), **not** the query API (7800).
    """
    base = os.environ.get("DATALAYER_OTLP_URL", "http://localhost:4318")
    return base.rstrip("/")


def _otel_api_url() -> str:
    """Return the OTEL REST-query API base URL (port 7800 by default)."""
    return os.environ.get("DATALAYER_OTEL_URL", "http://localhost:7800").rstrip("/")


def _flush_and_wait(wait: float = 2.0) -> None:
    """Call the flush endpoint on the OTEL service and wait for ingestion."""
    import httpx

    url = _otel_api_url()
    token = os.environ.get("DATALAYER_API_KEY", "")
    headers = {"Authorization": f"Bearer {token}"} if token else {}
    try:
        resp = httpx.post(f"{url}/api/otel/v1/flush", headers=headers, timeout=10, follow_redirects=True)
        resp.raise_for_status()
        logger.info("Flush response: %s", resp.json())
    except Exception as exc:
        logger.warning("Flush failed (non-fatal): %s", exc)
    time.sleep(wait)


def _resource(service_name: str = "otel-example") -> Resource:
    """Create an OTel resource with service name and user identity.

    If ``DATALAYER_USER_UID`` is set the resource includes a
    ``datalayer.user_uid`` attribute so the OTEL backend can
    associate the data with the authenticated user.
    """
    attrs: dict[str, str] = {"service.name": service_name}
    user_uid = os.environ.get("DATALAYER_USER_UID")
    if user_uid:
        attrs["datalayer.user_uid"] = user_uid
    return Resource.create(attrs)


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

# ── Pydantic-AI / Logfire style agent traces ────────────────────────

AI_MODELS = [
    ("ollama:gemma3:1b-it-qat", "gemma3:1b-it-qat"),
    ("openai:gpt-4o", "gpt-4o"),
    ("openai:gpt-4o-mini", "gpt-4o-mini"),
    ("anthropic:claude-sonnet-4-20250514", "claude-sonnet-4-20250514"),
    ("ollama:llama3:8b", "llama3:8b"),
]

AI_PROMPTS = [
    'Where does "hello world" come from?',
    "Explain quantum computing in one sentence.",
    "What is the capital of France?",
    "Write a haiku about programming.",
    "Summarize the theory of relativity.",
    "What are the benefits of type checking?",
]

AI_RESPONSES = [
    '"Hello, world!" is a classic introductory message originating from Brian Kernighan\'s 1978 book on C programming.',
    "Quantum computing uses quantum bits that can exist in superpositions to solve certain problems exponentially faster than classical computers.",
    "The capital of France is Paris.",
    "Code flows like water,\nBugs emerge then fade away,\nTests keep us afloat.",
    "Einstein's theory of relativity describes how space and time are interlinked and how gravity is a curvature of spacetime caused by mass and energy.",
    "Type checking catches errors at compile time, improving code reliability and developer productivity.",
]

AI_INSTRUCTIONS = [
    "Be concise, reply with one sentence.",
    "You are a helpful assistant.",
    "Answer accurately and briefly.",
    "Respond in a friendly tone.",
]


def generate_pydantic_ai_traces(count: int = 3) -> None:
    """Generate *count* pydantic-ai / logfire-style nested agent traces.

    Each trace has:
      - A root "agent run" span (scope: pydantic-ai) with full agent attributes
      - A child "chat {model}" span with gen_ai semantic conventions
    This simulates what logfire.instrument_pydantic_ai() produces.
    """
    import json

    endpoint = _otlp_endpoint()
    for _ in range(count):
        model_full, model_short = random.choice(AI_MODELS)
        prompt_idx = random.randrange(len(AI_PROMPTS))
        prompt = AI_PROMPTS[prompt_idx]
        response = AI_RESPONSES[prompt_idx]
        instruction = random.choice(AI_INSTRUCTIONS)
        input_tokens = random.randint(20, 120)
        output_tokens = random.randint(10, 80)

        provider = TracerProvider(resource=_resource("unknown_service"))
        exporter = OTLPSpanExporter(endpoint=f"{endpoint}/v1/traces")
        provider.add_span_processor(BatchSpanProcessor(exporter))
        tracer = provider.get_tracer("pydantic-ai", "1.42.0")

        with tracer.start_as_current_span("agent run") as root:
            # Core agent attributes
            root.set_attribute("agent_name", "agent")
            root.set_attribute("gen_ai.agent.name", "agent")
            root.set_attribute("model_name", model_short)
            root.set_attribute("final_result", response)

            # Token usage on root span (aggregated)
            root.set_attribute("gen_ai.usage.input_tokens", input_tokens)
            root.set_attribute("gen_ai.usage.output_tokens", output_tokens)

            # System instructions as JSON string (OTEL attributes are flat)
            root.set_attribute(
                "gen_ai.system_instructions",
                json.dumps([{"type": "text", "content": instruction}]),
            )

            # Full conversation messages
            root.set_attribute(
                "pydantic_ai.all_messages",
                json.dumps([
                    {
                        "role": "user",
                        "parts": [{"type": "text", "content": prompt}],
                    },
                    {
                        "role": "assistant",
                        "parts": [{"type": "text", "content": response}],
                        "finish_reason": "stop",
                    },
                ]),
            )

            # Simulate agent thinking time
            time.sleep(random.uniform(0.01, 0.05))

            # Child: chat completion span
            with tracer.start_as_current_span(f"chat {model_short}") as child:
                child.set_attribute("gen_ai.system", "pydantic-ai")
                child.set_attribute("gen_ai.operation.name", "chat")
                child.set_attribute("gen_ai.request.model", model_full)
                child.set_attribute("gen_ai.response.model", model_short)
                child.set_attribute("gen_ai.usage.input_tokens", input_tokens)
                child.set_attribute("gen_ai.usage.output_tokens", output_tokens)
                child.set_attribute("gen_ai.response.finish_reason", "stop")

                # Request/response content
                child.set_attribute(
                    "gen_ai.input.messages",
                    json.dumps([
                        {
                            "role": "system",
                            "parts": [{"type": "text", "content": instruction}],
                        },
                        {
                            "role": "user",
                            "parts": [{"type": "text", "content": prompt}],
                        },
                    ]),
                )
                child.set_attribute(
                    "gen_ai.output.messages",
                    json.dumps([
                        {
                            "role": "assistant",
                            "parts": [{"type": "text", "content": response}],
                            "finish_reason": "stop",
                        },
                    ]),
                )

                # pydantic-ai model request parameters
                child.set_attribute("pydantic_ai.model_request_parameters.output_mode", "text")
                child.set_attribute("pydantic_ai.model_request_parameters.allow_text_output", True)

                # Simulate model latency
                time.sleep(random.uniform(0.02, 0.1))

        provider.force_flush()
        provider.shutdown()


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

# Each tuple: (name, unit, type).
# type is one of "sum", "histogram", "gauge".
SUM_METRICS = [
    ("http.server.request_count", "1"),
    ("http.client.request_count", "1"),
    ("process.runtime.gc.count", "1"),
]

HISTOGRAM_METRICS = [
    ("http.server.duration", "ms"),
    ("db.client.operation.duration", "ms"),
    ("http.client.duration", "ms"),
]

GAUGE_METRICS = [
    ("system.cpu.utilization", "%"),
    ("system.memory.usage", "By"),
    ("process.runtime.memory.usage", "By"),
]

EXPONENTIAL_HISTOGRAM_METRICS = [
    ("http.server.request.size", "By"),
    ("ml.model.inference.latency", "ms"),
    ("messaging.process.duration", "ms"),
]


def generate_sample_metrics(count: int = 5) -> None:
    """Generate metric data-points for every type and export via OTLP/HTTP.

    Always produces **sum** (counter), **histogram**, **gauge**
    (up-down-counter), and **exponentialHistogram** metrics so the UI
    can display each type differently.
    *count* controls the number of data-points per metric.
    """
    endpoint = _otlp_endpoint()
    svc = random.choice(SERVICE_NAMES)
    resource = _resource(svc)

    exporter = OTLPMetricExporter(endpoint=f"{endpoint}/v1/metrics")
    reader = PeriodicExportingMetricReader(exporter, export_interval_millis=1000)

    # Views that map specific instruments to Exponential Bucket Histogram
    # aggregation so they are exported as exponentialHistogram data points.
    exp_views = [
        View(
            instrument_name=name,
            aggregation=ExponentialBucketHistogramAggregation(),
        )
        for name, _ in EXPONENTIAL_HISTOGRAM_METRICS
    ]

    provider = MeterProvider(
        resource=resource, metric_readers=[reader], views=exp_views
    )

    meter = provider.get_meter("otel-example-generator")

    # ── Sum / Counter metrics ────────────────────────────────────────
    for name, unit in SUM_METRICS:
        counter = meter.create_counter(name, unit=unit, description=f"Sample {name}")
        for _ in range(count):
            counter.add(random.randint(1, 100), {"service.name": svc})

    # ── Histogram metrics ────────────────────────────────────────────
    for name, unit in HISTOGRAM_METRICS:
        histogram = meter.create_histogram(name, unit=unit, description=f"Sample {name}")
        for _ in range(count):
            histogram.record(random.uniform(1.0, 5000.0), {"service.name": svc})

    # ── Gauge (up-down counter) metrics ──────────────────────────────
    for name, unit in GAUGE_METRICS:
        gauge = meter.create_up_down_counter(name, unit=unit, description=f"Sample {name}")
        for _ in range(count):
            gauge.add(random.uniform(-20.0, 100.0), {"service.name": svc})

    # ── Exponential Histogram metrics ────────────────────────────
    # These are recorded as histograms but the View above maps them to
    # ExponentialBucketHistogramAggregation, so they are exported as
    # exponentialHistogram data points.
    for name, unit in EXPONENTIAL_HISTOGRAM_METRICS:
        hist = meter.create_histogram(name, unit=unit, description=f"Sample {name}")
        for _ in range(count):
            hist.record(random.uniform(0.5, 2000.0), {"service.name": svc})

    # Wait for the reader to export
    provider.force_flush()
    provider.shutdown()
