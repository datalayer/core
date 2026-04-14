# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""
HTTP client for the Datalayer OTEL query service.

Provides a high-level Python API for querying traces, metrics, logs, and
running ad-hoc SQL against the datalayer-otel FastAPI service.

Usage::

    from datalayer_core.otel import OtelClient

    client = OtelClient(base_url="https://prod1.datalayer.run", token="my-jwt")
    traces = client.list_traces(service_name="my-service", limit=10)
    metrics = client.query_metrics(metric_name="http.requests")
    logs = client.query_logs(severity="ERROR", limit=50)
    rows = client.query_sql("SELECT * FROM spans LIMIT 5")
    stats = client.get_stats()
    services = client.list_services()
    client.flush()
"""

from __future__ import annotations

import base64
import json
import os
from typing import Any

import httpx

from datalayer_core.otel.config import OTEL_BASE_URL


class OtelClient:
    """
    Client for the Datalayer OTEL REST API.

    Parameters
    ----------
    base_url : str, optional
        OTEL service base URL.  Defaults to ``DATALAYER_OTEL_URL`` env var
        or ``DEFAULT_DATALAYER_OTEL_URL`` (``https://prod1.datalayer.run``).
    token : str, optional
        JWT bearer token for authentication.  Falls back to
        ``DATALAYER_API_KEY`` env var.
    timeout : float
        HTTP request timeout in seconds.
    """

    def __init__(
        self,
        base_url: str | None = None,
        token: str | None = None,
        user_uid: str | None = None,
        timeout: float = 30.0,
    ) -> None:
        self.base_url = (base_url or OTEL_BASE_URL).rstrip("/")
        self.token = token or os.environ.get("DATALAYER_API_KEY", "")
        self.user_uid = (
            user_uid
            or os.environ.get("DATALAYER_USER_UID")
            or self._decode_user_uid(self.token)
            or ""
        )
        self.timeout = timeout

    # ── internal helpers ─────────────────────────────────────────────

    @staticmethod
    def _decode_user_uid(token: str | None) -> str | None:
        if not token:
            return None
        try:
            parts = token.split(".")
            if len(parts) != 3:
                return None
            payload_b64 = parts[1]
            payload_b64 += "=" * (-len(payload_b64) % 4)
            payload = json.loads(base64.urlsafe_b64decode(payload_b64))
            user_claim = payload.get("user")
            if isinstance(user_claim, dict) and user_claim.get("uid"):
                return str(user_claim["uid"])
            sub = payload.get("sub")
            if isinstance(sub, str) and sub.strip():
                return sub.strip()
        except Exception:
            return None
        return None

    def _headers(self) -> dict[str, str]:
        if not self.token:
            raise ValueError(
                "OTEL client requires an authenticated token (DATALAYER_API_KEY)"
            )
        if not self.user_uid:
            raise ValueError(
                "OTEL client requires datalayer.user_uid; pass user_uid or use a JWT token containing user.uid/sub"
            )
        return {
            "Authorization": f"Bearer {self.token}",
            "X-Datalayer-User-Uid": self.user_uid,
        }

    def _get(self, path: str, params: dict[str, Any] | None = None) -> Any:
        resp = httpx.get(
            f"{self.base_url}{path}",
            params=params,
            headers=self._headers(),
            timeout=self.timeout,
            follow_redirects=True,
        )
        resp.raise_for_status()
        return resp.json()

    def _post(self, path: str, json: dict[str, Any] | None = None) -> Any:
        resp = httpx.post(
            f"{self.base_url}{path}",
            json=json,
            headers=self._headers(),
            timeout=self.timeout,
            follow_redirects=True,
        )
        resp.raise_for_status()
        return resp.json()

    # ── public API ───────────────────────────────────────────────────

    def ping(self) -> dict[str, Any]:
        """
        Health check (no auth required).
        """
        return self._get("/api/otel/v1/ping/")

    def version(self) -> dict[str, Any]:
        """
        Get service version.
        """
        return self._get("/api/otel/v1/version/")

    def get_stats(self) -> dict[str, Any]:
        """
        Get storage statistics.
        """
        return self._get("/api/otel/v1/stats/")

    def flush(self) -> dict[str, Any]:
        """
        Force-flush all buffered telemetry data to storage.
        """
        return self._post("/api/otel/v1/flush/")

    # ── traces ───────────────────────────────────────────────────────

    def list_traces(
        self,
        service_name: str | None = None,
        limit: int = 20,
    ) -> dict[str, Any]:
        """
        List recent traces.

        Parameters
        ----------
        service_name : str, optional
            Filter by service name.
        limit : int
            Maximum number of traces.
        """
        params: dict[str, Any] = {"limit": limit}
        if service_name:
            params["service_name"] = service_name
        return self._get("/api/otel/v1/traces/", params=params)

    def get_trace(self, trace_id: str) -> dict[str, Any]:
        """
        Get spans for a specific trace.

        Parameters
        ----------
        trace_id : str
            The trace ID.
        """
        return self._get(f"/api/otel/v1/traces/{trace_id}/")

    def list_services(self) -> list[str]:
        """
        List all observed service names.
        """
        data = self._get("/api/otel/v1/traces/services/list/")
        return data.get("services", data)

    # ── metrics ──────────────────────────────────────────────────────

    def list_metrics(
        self,
        metric_name: str | None = None,
        service_name: str | None = None,
        limit: int = 20,
    ) -> dict[str, Any]:
        """
        List metric names / data points.

        Parameters
        ----------
        metric_name : str, optional
            Filter by metric name.
        service_name : str, optional
            Filter by service name.
        limit : int
            Maximum number of rows.
        """
        params: dict[str, Any] = {"limit": limit}
        if metric_name:
            params["metric_name"] = metric_name
        if service_name:
            params["service_name"] = service_name
        return self._get("/api/otel/v1/metrics/", params=params)

    def query_metrics(
        self,
        name: str | None = None,
        service_name: str | None = None,
        limit: int = 20,
    ) -> dict[str, Any]:
        """
        Query metric data points.

        Parameters
        ----------
        name : str, optional
            Metric name.
        service_name : str, optional
            Service name filter.
        limit : int
            Maximum rows.
        """
        params: dict[str, Any] = {"limit": limit}
        if name:
            params["name"] = name
        if service_name:
            params["service_name"] = service_name
        return self._get("/api/otel/v1/metrics/query/", params=params)

    # ── logs ─────────────────────────────────────────────────────────

    def query_logs(
        self,
        service_name: str | None = None,
        severity: str | None = None,
        trace_id: str | None = None,
        limit: int = 50,
    ) -> dict[str, Any]:
        """
        Query log records.

        Parameters
        ----------
        service_name : str, optional
            Filter by service name.
        severity : str, optional
            Filter by severity (INFO, WARN, ERROR, etc.).
        trace_id : str, optional
            Filter by trace ID.
        limit : int
            Maximum rows.
        """
        params: dict[str, Any] = {"limit": limit}
        if service_name:
            params["service_name"] = service_name
        if severity:
            params["severity"] = severity
        if trace_id:
            params["trace_id"] = trace_id
        return self._get("/api/otel/v1/logs/", params=params)

    # ── SQL query ────────────────────────────────────────────────────

    def query_sql(self, sql: str) -> dict[str, Any]:
        """
        Run an ad-hoc SQL query via SQL Engine.

        Parameters
        ----------
        sql : str
            SQL query string.
        """
        return self._post("/api/otel/v1/query/", json={"sql": sql})

    def admin_sql(self, sql: str) -> dict[str, Any]:
        """
        Run an arbitrary SQL query without user-scope filtering.

        Requires ``platform_admin`` role.  Sends the SQL directly to the
        admin endpoint so the result spans all accounts.

        Parameters
        ----------
        sql : str
            SQL query string.
        """
        return self._post("/api/otel/v1/system/sql/", json={"sql": sql})
