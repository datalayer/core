# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""FastAPI application that generates OTEL signals and proxies read queries."""

from __future__ import annotations

import os
import random
import time
import uuid
from typing import Any, Optional

from dotenv import load_dotenv
from fastapi import FastAPI, Query, Request
from fastapi.middleware.cors import CORSMiddleware

from datalayer_core.otel import OtelClient

from .generator import (
    generate_sample_traces,
    generate_pydantic_ai_traces,
    generate_sample_logs,
    generate_sample_metrics,
    _flush_and_wait,
)

load_dotenv()

app = FastAPI(title="Datalayer OTEL Example", version="0.1.0")

# CORS for the Vite dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def _client(token: Optional[str] = None) -> OtelClient:
    """Create an OtelClient from env vars, optionally using a caller token."""
    return OtelClient(
        base_url=os.environ.get("DATALAYER_OTEL_URL", "http://localhost:7800"),
        token=token or os.environ.get("DATALAYER_API_KEY", ""),
    )


def _extract_token(request: Request) -> Optional[str]:
    """Extract the Bearer token from the Authorization header, if present."""
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        return auth[7:]
    return None


# ── Home ─────────────────────────────────────────────────────────────

@app.get("/")
def home() -> dict:
    """Welcome page."""
    return {
        "message": "Datalayer OTEL Example – POST /api/generate/{traces,logs,metrics} to create signals",
    }


# ── Signal generators ───────────────────────────────────────────────

@app.post("/api/generate/traces")
def gen_traces(request: Request, count: int = Query(3, ge=1, le=50)) -> dict:
    """Generate *count* sample traces with nested spans and send them via OTLP."""
    generate_sample_traces(count, token=_extract_token(request))
    _flush_and_wait()
    return {"status": "ok", "generated_traces": count}


@app.post("/api/generate/ai-traces")
def gen_ai_traces(request: Request, count: int = Query(3, ge=1, le=50)) -> dict:
    """Generate *count* pydantic-ai / logfire-style nested agent traces."""
    generate_pydantic_ai_traces(count, token=_extract_token(request))
    _flush_and_wait()
    return {"status": "ok", "generated_ai_traces": count}


@app.post("/api/generate/logs")
def gen_logs(request: Request, count: int = Query(10, ge=1, le=200)) -> dict:
    """Generate *count* sample log records and send them via OTLP."""
    generate_sample_logs(count, token=_extract_token(request))
    _flush_and_wait()
    return {"status": "ok", "generated_logs": count}


@app.post("/api/generate/metrics")
def gen_metrics(request: Request, count: int = Query(5, ge=1, le=100)) -> dict:
    """Generate *count* sample metric data-points and send them via OTLP."""
    generate_sample_metrics(count, token=_extract_token(request))
    _flush_and_wait()
    return {"status": "ok", "generated_metrics": count}


# ── Read-query proxies (use OtelClient) ─────────────────────────────

@app.get("/api/otel/v1/traces")
def list_traces(
    request: Request,
    service_name: str | None = None,
    limit: int = 20,
) -> Any:
    """Proxy: list recent traces."""
    return _client(_extract_token(request)).list_traces(service_name=service_name, limit=limit)


@app.get("/api/otel/v1/traces/services/list")
def list_services(request: Request) -> Any:
    """Proxy: list observed service names."""
    svc = _client(_extract_token(request)).list_services()
    # Normalise to dict if client returns a plain list
    if isinstance(svc, list):
        return {"services": svc}
    return svc


@app.get("/api/otel/v1/traces/{trace_id}")
def get_trace(trace_id: str, request: Request) -> Any:
    """Proxy: get spans of a single trace."""
    return _client(_extract_token(request)).get_trace(trace_id)


@app.get("/api/otel/v1/logs")
def list_logs(
    request: Request,
    service_name: str | None = None,
    severity: str | None = None,
    limit: int = 50,
) -> Any:
    """Proxy: list log records."""
    return _client(_extract_token(request)).query_logs(
        service_name=service_name,
        severity=severity,
        limit=limit,
    )


@app.get("/api/otel/v1/metrics")
def list_metrics(
    request: Request,
    metric_name: str | None = None,
    service_name: str | None = None,
    limit: int = 20,
) -> Any:
    """Proxy: list metrics."""
    return _client(_extract_token(request)).list_metrics(
        metric_name=metric_name,
        service_name=service_name,
        limit=limit,
    )


@app.get("/api/otel/v1/stats")
def get_stats(request: Request) -> Any:
    """Proxy: storage statistics."""
    return _client(_extract_token(request)).get_stats()
