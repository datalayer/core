# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""FastAPI application that generates OTEL signals and proxies read queries."""

from __future__ import annotations

import os
import random
import time
import uuid
from typing import Any

from dotenv import load_dotenv
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware

from datalayer_core.otel import OtelClient

from .generator import generate_sample_traces, generate_sample_logs, generate_sample_metrics

load_dotenv()

app = FastAPI(title="Datalayer OTEL Example", version="0.1.0")

# CORS for the Vite dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def _client() -> OtelClient:
    """Create an OtelClient from env vars."""
    return OtelClient(
        base_url=os.environ.get("DATALAYER_OTEL_URL", "http://localhost:7800"),
        token=os.environ.get("DATALAYER_API_KEY", ""),
    )


# ── Home ─────────────────────────────────────────────────────────────

@app.get("/")
def home() -> dict:
    """Welcome page."""
    return {
        "message": "Datalayer OTEL Example – POST /api/generate/{traces,logs,metrics} to create signals",
    }


# ── Signal generators ───────────────────────────────────────────────

@app.post("/api/generate/traces")
def gen_traces(count: int = Query(3, ge=1, le=50)) -> dict:
    """Generate *count* sample traces with nested spans and send them via OTLP."""
    generate_sample_traces(count)
    return {"status": "ok", "generated_traces": count}


@app.post("/api/generate/logs")
def gen_logs(count: int = Query(10, ge=1, le=200)) -> dict:
    """Generate *count* sample log records and send them via OTLP."""
    generate_sample_logs(count)
    return {"status": "ok", "generated_logs": count}


@app.post("/api/generate/metrics")
def gen_metrics(count: int = Query(5, ge=1, le=100)) -> dict:
    """Generate *count* sample metric data-points and send them via OTLP."""
    generate_sample_metrics(count)
    return {"status": "ok", "generated_metrics": count}


# ── Read-query proxies (use OtelClient) ─────────────────────────────

@app.get("/api/otel/v1/traces")
def list_traces(
    service_name: str | None = None,
    limit: int = 20,
) -> Any:
    """Proxy: list recent traces."""
    return _client().list_traces(service_name=service_name, limit=limit)


@app.get("/api/otel/v1/traces/services/list")
def list_services() -> Any:
    """Proxy: list observed service names."""
    svc = _client().list_services()
    # Normalise to dict if client returns a plain list
    if isinstance(svc, list):
        return {"services": svc}
    return svc


@app.get("/api/otel/v1/traces/{trace_id}")
def get_trace(trace_id: str) -> Any:
    """Proxy: get spans of a single trace."""
    return _client().get_trace(trace_id)


@app.get("/api/otel/v1/logs")
def list_logs(
    service_name: str | None = None,
    severity: str | None = None,
    limit: int = 50,
) -> Any:
    """Proxy: list log records."""
    return _client().query_logs(
        service_name=service_name,
        severity=severity,
        limit=limit,
    )


@app.get("/api/otel/v1/metrics")
def list_metrics(
    metric_name: str | None = None,
    service_name: str | None = None,
    limit: int = 20,
) -> Any:
    """Proxy: list metrics."""
    return _client().list_metrics(
        metric_name=metric_name,
        service_name=service_name,
        limit=limit,
    )


@app.get("/api/otel/v1/stats")
def get_stats() -> Any:
    """Proxy: storage statistics."""
    return _client().get_stats()
