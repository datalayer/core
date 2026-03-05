---
title: OTEL Client
description: Python client and CLI for the Datalayer OTEL observability service.
---

[![Datalayer](https://assets.datalayer.tech/datalayer-25.svg)](https://datalayer.io)

# Datalayer OTEL Client

Python client and CLI commands for querying and interacting with the Datalayer OTEL observability service.

## Installation

The OTEL client is included in the `datalayer-core` package:

```bash
pip install datalayer-core
```

## Quick Start

### Python Client

```python
from datalayer_core.otel import OtelClient

client = OtelClient(
    base_url="http://localhost:7800",
    token="your-jwt-token",
)

# Check service health
print(client.ping())

# List recent traces
traces = client.list_traces(limit=10)
print(traces)

# Get spans for a specific trace
spans = client.get_trace("01020304050607080102040810203040")
print(spans)

# List observed services
services = client.list_services()
print(services)

# Query metrics
metrics = client.query_metrics(metric_name="http.request.duration")
print(metrics)

# Query logs
logs = client.query_logs(service_name="datalayer-iam", severity="ERROR")
print(logs)

# Run ad-hoc SQL queries via SQL Engine
result = client.query_sql("SELECT * FROM spans LIMIT 10")
print(result)

# Storage statistics
stats = client.get_stats()
print(stats)

# Flush buffered data
client.flush()
```

### CLI

The OTEL commands are available as a subcommand of the Datalayer CLI:

```bash
# List traces
datalayer otel traces

# Get a specific trace
datalayer otel traces <trace-id>

# Filter traces by service
datalayer otel traces --service datalayer-iam --limit 50

# Query metrics
datalayer otel metrics --name http.request.duration --service datalayer-iam

# Query logs
datalayer otel logs --service datalayer-iam --severity ERROR

# Run ad-hoc SQL via SQL Engine
datalayer otel query "SELECT * FROM spans LIMIT 10"
datalayer otel query "SELECT * FROM spans LIMIT 10" --raw  # Raw JSON output

# Storage statistics
datalayer otel stats

# List observed services
datalayer otel services

# Force-flush buffered data
datalayer otel flush

# End-to-end smoke test
datalayer otel smoke-test --url http://localhost:7800 --otlp-endpoint http://localhost:4318

# Test with Logfire SDK
datalayer otel logfire
datalayer otel logfire --no-send  # Local-only, no cloud
```

## Authentication

All query endpoints require a valid JWT token (same authentication as all Datalayer platform services).

### Methods (in priority order)

1. **`DATALAYER_API_KEY` environment variable** — read automatically by the CLI and Python client
2. **`--token` CLI flag** — pass directly to any CLI command
3. **Constructor parameter** — pass `token=` to `OtelClient`

```bash
# Set your JWT token
export DATALAYER_API_KEY="your-jwt-token"

# Or pass explicitly
datalayer otel traces --token "your-jwt-token"
```

## Connecting to the Service

### Port-Forward (Development)

```bash
# Port-forward to expose services locally
plane pf-otel
```

This opens:
- `http://localhost:7800` – FastAPI query service
- `http://localhost:4317` – OTEL Collector gRPC
- `http://localhost:4318` – OTEL Collector HTTP

### Direct Connection

```bash
# Set the OTEL service URL
export DATALAYER_OTEL_URL="http://localhost:7800"

# Or pass to CLI
datalayer otel stats --url http://localhost:7800
```

## Environment Variables

### Client Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `DATALAYER_API_KEY` | JWT authentication token | _(empty)_ |
| `DATALAYER_OTEL_URL` | OTEL query service base URL | `http://localhost:7800` |

### Standard OTEL SDK Variables (for Instrumented Services)

These configure where client services send telemetry — not the OTEL service itself:

| Variable | Description | Example |
|----------|-------------|---------|
| `OTEL_EXPORTER_OTLP_ENDPOINT` | Base OTLP endpoint (all signals) | `http://...-collector-svc:4318` |
| `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT` | OTLP traces endpoint | `http://...:4318/v1/traces` |
| `OTEL_EXPORTER_OTLP_METRICS_ENDPOINT` | OTLP metrics endpoint | `http://...:4318/v1/metrics` |
| `OTEL_EXPORTER_OTLP_LOGS_ENDPOINT` | OTLP logs endpoint | `http://...:4318/v1/logs` |
| `OTEL_SERVICE_NAME` | Service name tag | `datalayer-iam` |
| `OTEL_PYTHON_LOG_LEVEL` | SDK log level | `info` |

### Logfire Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `DATALAYER_LOGFIRE_API_KEY` | Logfire write token | _(empty)_ |
| `DATALAYER_LOGFIRE_PROJECT` | Logfire project name | `starter-project` |
| `DATALAYER_LOGFIRE_URL` | Logfire base URL | `https://logfire-us.pydantic.dev` |
| `DATALAYER_LOGFIRE_SEND_TO_LOGFIRE` | Send data to Logfire cloud | `true` |

## Client Integration

### Using the Logfire SDK

Clients emit telemetry using the [Pydantic Logfire](https://github.com/pydantic/logfire) Python SDK which is OTEL-compatible:

```python
import logfire

# Logfire reads OTEL_EXPORTER_OTLP_* env vars automatically.
logfire.configure(
    send_to_logfire=True,
    console=logfire.ConsoleOptions(verbose=True),
)
logfire.info("Hello from {service}!", service="my-app")
```

### Using the OpenTelemetry SDK Directly

```python
import os
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor

# Reads OTEL_EXPORTER_OTLP_TRACES_ENDPOINT automatically, or specify:
exporter = OTLPSpanExporter(
    endpoint=os.environ.get(
        "OTEL_EXPORTER_OTLP_TRACES_ENDPOINT",
        "http://localhost:4318/v1/traces",
    )
)
provider = TracerProvider()
provider.add_span_processor(BatchSpanProcessor(exporter))
```

> **Tip:** If `OTEL_EXPORTER_OTLP_ENDPOINT` or `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT`
> is set, `OTLPSpanExporter()` with no arguments will pick it up automatically.
> The same applies to `OTLPMetricExporter` and `OTLPLogExporter`.

## API Endpoints

The OTEL service exposes these REST endpoints:

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/otel/v1/ping` | Health check (no auth) |
| GET | `/api/otel/v1/version` | Service version |
| GET | `/api/otel/v1/stats` | Storage statistics |
| POST | `/api/otel/v1/flush` | Force-flush buffers |
| GET | `/api/otel/v1/traces/` | List recent traces |
| GET | `/api/otel/v1/traces/{trace_id}` | Get spans for a trace |
| GET | `/api/otel/v1/traces/services/list` | List known services |
| GET | `/api/otel/v1/metrics/` | List metric names |
| GET | `/api/otel/v1/metrics/query` | Query metric data points |
| GET | `/api/otel/v1/logs/` | Query log records |
| POST | `/api/otel/v1/query/` | Execute ad-hoc SQL |
| | `/api/otel/v1/docs` | Swagger UI |
| | `/api/otel/v1/redoc` | ReDoc |

## Architecture

```
┌─────────────────┐    OTLP     ┌──────────────────┐     Pulsar      ┌──────────────────────┐
│  Clients        │ ──────────> │  OTEL Collector   │ ─────────────> │  datalayer-otel      │
│  (logfire SDK)  │             │  (grpc + http)    │                │  (Pulsar consumer +  │
└─────────────────┘             └──────────────────┘                 │   SQL Engine store)  │
                                                                     └─────────┬────────────┘
                                                                               │
                                                                    ┌──────────▼───────────┐
                                                                    │   Parquet files      │
                                                                    │   (spans / metrics / │
                                                                    │    logs)             │
                                                                    └──────────┬───────────┘
                                                                               │
                                                                    ┌──────────▼───────────┐
                                                                    │   FastAPI REST API   │
                                                                    │   (SQL Engine SQL)   │
                                                                    └──────────────────────┘
```
