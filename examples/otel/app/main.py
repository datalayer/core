# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""FastAPI application that generates OTEL signals and proxies read queries."""

from __future__ import annotations

import logging
import os
import random
import time
import uuid
from typing import Any, Optional

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

logger = logging.getLogger(__name__)

from datalayer_core.otel import OtelClient

from .generator import (
    _flush_and_wait,
    generate_pydantic_ai_traces,
    generate_sample_logs,
    generate_sample_metrics,
    generate_sample_traces,
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
        base_url=os.environ.get("DATALAYER_OTEL_URL")
        or os.environ.get("DATALAYER_RUN_URL")
        or None,
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


def _proxy(func, *args, **kwargs) -> Any:
    """Call *func* and translate upstream HTTP errors into proper responses."""
    try:
        return func(*args, **kwargs)
    except httpx.HTTPStatusError as exc:
        status = exc.response.status_code
        detail = exc.response.text or str(exc)
        logger.warning(
            "Upstream %s %s → %s", exc.request.method, exc.request.url, status
        )
        return JSONResponse(status_code=status, content={"detail": detail})
    except httpx.ConnectError as exc:
        logger.error("Cannot reach upstream: %s", exc)
        return JSONResponse(
            status_code=502,
            content={"detail": f"Cannot reach upstream OTEL service: {exc}"},
        )


@app.get("/api/otel/v1/traces/")
def list_traces(
    request: Request,
    service_name: str | None = None,
    limit: int = 20,
) -> Any:
    """Proxy: list recent traces."""
    client = _client(_extract_token(request))
    return _proxy(client.list_traces, service_name=service_name, limit=limit)


@app.get("/api/otel/v1/traces/services/list/")
def list_services(request: Request) -> Any:
    """Proxy: list observed service names."""
    client = _client(_extract_token(request))
    svc = _proxy(client.list_services)
    if isinstance(svc, JSONResponse):
        return svc
    # Normalise to dict if client returns a plain list
    if isinstance(svc, list):
        return {"services": svc}
    return svc


@app.get("/api/otel/v1/traces/{trace_id}/")
def get_trace(trace_id: str, request: Request) -> Any:
    """Proxy: get spans of a single trace."""
    return _proxy(_client(_extract_token(request)).get_trace, trace_id)


@app.get("/api/otel/v1/logs/")
def list_logs(
    request: Request,
    service_name: str | None = None,
    severity: str | None = None,
    limit: int = 50,
) -> Any:
    """Proxy: list log records."""
    client = _client(_extract_token(request))
    return _proxy(
        client.query_logs,
        service_name=service_name,
        severity=severity,
        limit=limit,
    )


@app.get("/api/otel/v1/metrics/")
def list_metrics(
    request: Request,
    metric_name: str | None = None,
    service_name: str | None = None,
    limit: int = 20,
) -> Any:
    """Proxy: list metrics."""
    client = _client(_extract_token(request))
    return _proxy(
        client.list_metrics,
        metric_name=metric_name,
        service_name=service_name,
        limit=limit,
    )


@app.get("/api/otel/v1/stats/")
def get_stats(request: Request) -> Any:
    """Proxy: storage statistics."""
    return _proxy(_client(_extract_token(request)).get_stats)
