# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""Configuration for the Datalayer OTEL client."""

import os

from datalayer_core.utils.urls import DEFAULT_DATALAYER_OTEL_URL

# ── OTEL service base URL ──────────────────────────────────────────
# The URL of the datalayer-otel FastAPI query service.
OTEL_BASE_URL = os.environ.get("DATALAYER_OTEL_URL") or DEFAULT_DATALAYER_OTEL_URL

# ── OTLP Collector endpoints ───────────────────────────────────────
# Standard OpenTelemetry env vars for client-side telemetry emission.
OTLP_ENDPOINT = os.environ.get(
    "OTEL_EXPORTER_OTLP_ENDPOINT",
    "http://localhost:4318",
)

OTLP_TRACES_ENDPOINT = os.environ.get(
    "OTEL_EXPORTER_OTLP_TRACES_ENDPOINT",
    f"{OTLP_ENDPOINT}/v1/traces",
)

OTLP_METRICS_ENDPOINT = os.environ.get(
    "OTEL_EXPORTER_OTLP_METRICS_ENDPOINT",
    f"{OTLP_ENDPOINT}/v1/metrics",
)

OTLP_LOGS_ENDPOINT = os.environ.get(
    "OTEL_EXPORTER_OTLP_LOGS_ENDPOINT",
    f"{OTLP_ENDPOINT}/v1/logs",
)

# ── Logfire ────────────────────────────────────────────────────────
LOGFIRE_TOKEN = os.environ.get("DATALAYER_LOGFIRE_API_KEY", "")
LOGFIRE_PROJECT = os.environ.get("DATALAYER_LOGFIRE_PROJECT", "starter-project")
LOGFIRE_URL = os.environ.get(
    "DATALAYER_LOGFIRE_URL",
    "https://logfire-us.pydantic.dev",
)
LOGFIRE_SEND_TO_LOGFIRE = os.environ.get(
    "DATALAYER_LOGFIRE_SEND_TO_LOGFIRE",
    "true",
).lower() in ("1", "true", "yes")
