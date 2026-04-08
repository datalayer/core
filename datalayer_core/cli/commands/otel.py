# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""OTEL commands for the Datalayer CLI.

Provides subcommands to query and interact with the Datalayer OTEL service::

    datalayer otel traces      # List / get traces
    datalayer otel metrics     # Query metrics
    datalayer otel logs        # Query logs
    datalayer otel query       # Run ad-hoc SQL via SQL Engine (user-scoped)
    datalayer otel sql         # Run arbitrary SQL as platform_admin (no user filter)
    datalayer otel stats       # Show storage statistics
    datalayer otel services    # List observed service names
    datalayer otel flush       # Force-flush buffered data
    datalayer otel smoke-test   # Send traces/metrics/logs and query them back
    datalayer otel load-test    # Continuously send test data at a configurable interval
    datalayer otel logfire-test # Send test traces/metrics/logs via Logfire to local OTLP
"""

from __future__ import annotations

import json
import os
import random
import time
from typing import Any, Optional

import typer
from rich import print as rprint
from rich.console import Console
from rich.table import Table

console = Console()

# Create Typer app for otel commands
app = typer.Typer(
    name="otel",
    help="OpenTelemetry observability commands – query traces, metrics, logs.",
    invoke_without_command=True,
)


@app.callback()
def main(ctx: typer.Context) -> None:
    """OpenTelemetry observability commands – query traces, metrics, logs."""
    if ctx.invoked_subcommand is None:
        rprint(ctx.get_help())


def _resolve_token(token: str | None) -> str:
    """Resolve the authentication token."""
    return token or os.environ.get("DATALAYER_API_KEY", "")


def _auth_headers(token: str | None) -> dict[str, str]:
    """Build HTTP headers with Bearer authentication."""
    resolved = _resolve_token(token)
    if resolved:
        return {"Authorization": f"Bearer {resolved}"}
    return {}


def _otel_base_url(url: str | None) -> str:
    """Resolve the OTEL service base URL."""
    return (
        url
        or os.environ.get("DATALAYER_OTEL_RUN_URL")
        or os.environ.get("DATALAYER_RUN_URL", "https://prod1.datalayer.run")
    )


# ── traces ───────────────────────────────────────────────────────────


@app.command()
def traces(
    trace_id: Optional[str] = typer.Argument(None, help="Specific trace ID to retrieve."),
    service_name: Optional[str] = typer.Option(None, "--service", "-s", help="Filter by service name."),
    limit: int = typer.Option(20, "--limit", "-n", help="Max number of traces to return."),
    base_url: Optional[str] = typer.Option(None, "--otel-run-url", help="OTEL service run URL."),
    token: Optional[str] = typer.Option(None, "--api-key", "-t", help="Auth token (or set DATALAYER_API_KEY)."),
) -> None:
    """List or get traces from the OTEL service."""
    import httpx

    url = _otel_base_url(base_url)
    headers = _auth_headers(token)

    if trace_id:
        resp = httpx.get(f"{url}/api/otel/v1/traces/{trace_id}", headers=headers, timeout=30, follow_redirects=True)
        resp.raise_for_status()
        rprint(json.dumps(resp.json(), indent=2))
    else:
        params: dict[str, Any] = {"limit": limit}
        if service_name:
            params["service_name"] = service_name
        resp = httpx.get(f"{url}/api/otel/v1/traces/", params=params, headers=headers, timeout=30, follow_redirects=True)
        resp.raise_for_status()
        data = resp.json()

        table = Table(title="Traces")
        table.add_column("Trace ID", style="cyan")
        table.add_column("Service", style="green")
        table.add_column("Operation", style="yellow")
        table.add_column("Duration (ms)", justify="right")
        table.add_column("Time", style="dim")

        rows = data.get("data", []) if isinstance(data, dict) else data
        for row in rows:
            table.add_row(
                str(row.get("trace_id", "")),
                str(row.get("service_name", "")),
                str(row.get("span_name", row.get("operation", ""))),
                str(row.get("duration_ms", "")),
                str(row.get("start_time", "")),
            )
        console.print(table)


# ── metrics ──────────────────────────────────────────────────────────


@app.command()
def metrics(
    metric_name: Optional[str] = typer.Option(None, "--name", "-m", help="Filter by metric name."),
    service_name: Optional[str] = typer.Option(None, "--service", "-s", help="Filter by service name."),
    limit: int = typer.Option(20, "--limit", "-n", help="Max rows."),
    base_url: Optional[str] = typer.Option(None, "--otel-run-url", help="OTEL service run URL."),
    token: Optional[str] = typer.Option(None, "--api-key", "-t", help="Auth token (or set DATALAYER_API_KEY)."),
) -> None:
    """Query metrics from the OTEL service."""
    import httpx

    url = _otel_base_url(base_url)
    headers = _auth_headers(token)
    params: dict[str, Any] = {"limit": limit}
    if metric_name:
        params["metric_name"] = metric_name
    if service_name:
        params["service_name"] = service_name

    resp = httpx.get(f"{url}/api/otel/v1/metrics/", params=params, headers=headers, timeout=30, follow_redirects=True)
    resp.raise_for_status()
    data = resp.json()

    table = Table(title="Metrics")
    table.add_column("Name", style="cyan")
    table.add_column("Service", style="green")
    table.add_column("Value", justify="right", style="yellow")
    table.add_column("Unit", style="dim")
    table.add_column("Time", style="dim")

    rows = data.get("data", []) if isinstance(data, dict) else data
    for row in rows:
        table.add_row(
            str(row.get("metric_name", "")),
            str(row.get("service_name", "")),
            str(row.get("value", "")),
            str(row.get("unit", "")),
            str(row.get("timestamp", "")),
        )
    console.print(table)


# ── logs ─────────────────────────────────────────────────────────────


@app.command()
def logs(
    service_name: Optional[str] = typer.Option(None, "--service", "-s", help="Filter by service name."),
    severity: Optional[str] = typer.Option(None, "--severity", help="Filter by severity (INFO, WARN, ERROR…)."),
    trace_id: Optional[str] = typer.Option(None, "--trace-id", help="Filter by trace ID."),
    limit: int = typer.Option(50, "--limit", "-n", help="Max rows."),
    base_url: Optional[str] = typer.Option(None, "--otel-run-url", help="OTEL service run URL."),
    token: Optional[str] = typer.Option(None, "--api-key", "-t", help="Auth token (or set DATALAYER_API_KEY)."),
) -> None:
    """Query log records from the OTEL service."""
    import httpx

    url = _otel_base_url(base_url)
    headers = _auth_headers(token)
    params: dict[str, Any] = {"limit": limit}
    if service_name:
        params["service_name"] = service_name
    if severity:
        params["severity"] = severity
    if trace_id:
        params["trace_id"] = trace_id

    resp = httpx.get(f"{url}/api/otel/v1/logs/", params=params, headers=headers, timeout=30, follow_redirects=True)
    resp.raise_for_status()
    data = resp.json()

    table = Table(title="Logs")
    table.add_column("Time", style="dim")
    table.add_column("Severity", style="red")
    table.add_column("Service", style="green")
    table.add_column("Body", style="white", max_width=80)
    table.add_column("Trace ID", style="cyan")

    rows = data.get("data", []) if isinstance(data, dict) else data
    for row in rows:
        table.add_row(
            str(row.get("timestamp", "")),
            str(row.get("severity_text", row.get("severity", ""))),
            str(row.get("service_name", "")),
            str(row.get("body", ""))[:80],
            str(row.get("trace_id", "")),
        )
    console.print(table)


# ── query ────────────────────────────────────────────────────────────


@app.command()
def query(
    sql: str = typer.Argument(..., help="SQL query to execute against the SQL Engine store."),
    base_url: Optional[str] = typer.Option(None, "--otel-run-url", help="OTEL service run URL."),
    raw: bool = typer.Option(False, "--raw", help="Output raw JSON instead of a table."),
    token: Optional[str] = typer.Option(None, "--api-key", "-t", help="Auth token (or set DATALAYER_API_KEY)."),
) -> None:
    """Run an ad-hoc SQL query via the SQL Engine engine."""
    import httpx

    url = _otel_base_url(base_url)
    headers = _auth_headers(token)
    resp = httpx.post(
        f"{url}/api/otel/v1/query/",
        json={"sql": sql},
        headers=headers,
        timeout=60,
        follow_redirects=True,
    )
    resp.raise_for_status()
    data = resp.json()

    if raw:
        rprint(json.dumps(data, indent=2))
        return

    rows = data.get("data", data.get("rows", []))
    if not rows:
        rprint("[yellow]No results.[/yellow]")
        return

    table = Table(title="Query Results")
    columns = list(rows[0].keys()) if rows else []
    for col in columns:
        table.add_column(col, style="cyan")
    for row in rows:
        table.add_row(*(str(row.get(c, "")) for c in columns))
    console.print(table)


# ── admin sql ────────────────────────────────────────────────────────


@app.command(name="sql")
def admin_sql(
    sql: str = typer.Argument(..., help="Arbitrary SQL to execute (no user-scope filter). Platform admin only."),
    base_url: Optional[str] = typer.Option(None, "--otel-run-url", help="OTEL service run URL."),
    raw: bool = typer.Option(False, "--raw", help="Output raw JSON instead of a table."),
    token: Optional[str] = typer.Option(None, "--api-key", "-t", help="Auth token (or set DATALAYER_API_KEY)."),
) -> None:
    """Run an arbitrary SQL query as platform_admin (no user-scope filtering).

    Useful for inspecting raw table contents across all accounts.
    Requires the DATALAYER_API_KEY to belong to a platform_admin user.
    """
    import httpx

    url = _otel_base_url(base_url)
    headers = _auth_headers(token)
    resp = httpx.post(
        f"{url}/api/otel/v1/system/sql",
        json={"sql": sql},
        headers=headers,
        timeout=60,
        follow_redirects=True,
    )
    resp.raise_for_status()
    data = resp.json()

    if raw:
        rprint(json.dumps(data, indent=2))
        return

    rows = data.get("data", [])
    if not rows:
        rprint("[yellow]No results.[/yellow]")
        return

    table = Table(title=f"Admin SQL — {data.get('count', len(rows))} row(s)")
    columns = list(rows[0].keys()) if rows else []
    for col in columns:
        table.add_column(col, style="cyan")
    for row in rows:
        table.add_row(*(str(row.get(c, "")) for c in columns))
    console.print(table)


# ── stats ────────────────────────────────────────────────────────────


@app.command()
def stats(
    base_url: Optional[str] = typer.Option(None, "--otel-run-url", help="OTEL service run URL."),
    token: Optional[str] = typer.Option(None, "--api-key", "-t", help="Auth token (or set DATALAYER_API_KEY)."),
) -> None:
    """Show storage statistics from the running OTEL service."""
    import httpx

    url = _otel_base_url(base_url)
    headers = _auth_headers(token)
    resp = httpx.get(f"{url}/api/otel/v1/stats/", headers=headers, timeout=15, follow_redirects=True)
    resp.raise_for_status()
    data = resp.json()

    table = Table(title="Storage Statistics")
    table.add_column("Key", style="cyan")
    table.add_column("Value", style="green", justify="right")

    for k, v in data.items():
        table.add_row(str(k), str(v))
    console.print(table)


# ── services ─────────────────────────────────────────────────────────


@app.command("services")
def list_services(
    base_url: Optional[str] = typer.Option(None, "--otel-run-url", help="OTEL service run URL."),
    token: Optional[str] = typer.Option(None, "--api-key", "-t", help="Auth token (or set DATALAYER_API_KEY)."),
) -> None:
    """List all observed service names."""
    import httpx

    url = _otel_base_url(base_url)
    headers = _auth_headers(token)
    resp = httpx.get(f"{url}/api/otel/v1/traces/services/list/", headers=headers, timeout=15, follow_redirects=True)
    resp.raise_for_status()
    data = resp.json()

    services = data.get("services", data)
    if not services:
        rprint("[yellow]No services observed yet.[/yellow]")
        return

    table = Table(title="Observed Services")
    table.add_column("#", style="dim", justify="right")
    table.add_column("Service Name", style="cyan")
    for idx, svc in enumerate(services, 1):
        table.add_row(str(idx), str(svc))
    console.print(table)


# ── flush ────────────────────────────────────────────────────────────


@app.command()
def flush(
    base_url: Optional[str] = typer.Option(None, "--otel-run-url", help="OTEL service run URL."),
    token: Optional[str] = typer.Option(None, "--api-key", "-t", help="Auth token (or set DATALAYER_API_KEY)."),
) -> None:
    """Force-flush all buffered telemetry data to Parquet storage."""
    import httpx

    url = _otel_base_url(base_url)
    headers = _auth_headers(token)
    resp = httpx.post(f"{url}/api/otel/v1/flush/", headers=headers, timeout=30, follow_redirects=True)
    resp.raise_for_status()
    data = resp.json()
    rprint("[bold green]Flush complete.[/bold green]")
    rprint(json.dumps(data, indent=2))


# ── smoke-test ───────────────────────────────────────────────────────


@app.command("smoke-test")
def smoke_test(
    otlp_endpoint: Optional[str] = typer.Option(
        None,
        "--otlp-endpoint",
        "-e",
        help="OTLP HTTP endpoint of the collector (defaults to <otel-run-url>/api/otel/v1/otlp).",
    ),
    base_url: Optional[str] = typer.Option(None, "--otel-run-url", help="OTEL query service run URL."),
    service_name: str = typer.Option("datalayer-otel-smoke", "--service", "-s", help="Service name for test data."),
    wait: int = typer.Option(3, "--wait", "-w", help="Seconds to wait for data to be ingested before querying."),
    token: Optional[str] = typer.Option(None, "--api-key", "-t", help="Auth token (or set DATALAYER_API_KEY)."),
) -> None:
    """End-to-end smoke test: send traces, metrics and logs, then query them back.

    This command exercises the full OTEL pipeline:
    1. Emit test traces (spans) via the OpenTelemetry SDK
    2. Emit test metrics via the OpenTelemetry SDK
    3. Emit test logs via the OpenTelemetry SDK
    4. Wait for ingestion
    5. Flush the service buffers
    6. Query traces, metrics and logs back via REST endpoints
    7. Run ad-hoc SQL queries via SQL Engine
    """
    import httpx

    url = _otel_base_url(base_url)
    otlp_endpoint = otlp_endpoint or f"{url}/api/otel/v1/otlp"
    headers = _auth_headers(token)

    try:
        from opentelemetry import _logs as otel_logs
        from opentelemetry import metrics as otel_metrics
        from opentelemetry import trace as otel_trace
        from opentelemetry.exporter.otlp.proto.http._log_exporter import OTLPLogExporter
        from opentelemetry.exporter.otlp.proto.http.metric_exporter import OTLPMetricExporter
        from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
        from opentelemetry.sdk._logs import LoggerProvider, LoggingHandler
        from opentelemetry.sdk._logs.export import BatchLogRecordProcessor
        from opentelemetry.sdk.metrics import MeterProvider
        from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
        from opentelemetry.sdk.resources import Resource
        from opentelemetry.sdk.trace import TracerProvider
        from opentelemetry.sdk.trace.export import BatchSpanProcessor
    except ImportError:
        rprint("[red]opentelemetry SDK packages are required. Install with:[/red]")
        rprint(
            "  pip install opentelemetry-api opentelemetry-sdk "
            "opentelemetry-exporter-otlp-proto-http"
        )
        raise typer.Exit(code=1)

    import base64
    import logging
    import uuid

    smoke_id = uuid.uuid4().hex[:8]
    tag = f"smoke-{smoke_id}"

    # Decode the JWT to extract user_uid so the OTLP resource attribute
    # matches what the query endpoints filter on.
    resolved_token = _resolve_token(token)
    user_uid: str | None = None
    if resolved_token:
        try:
            payload_b64 = resolved_token.split(".")[1]
            # Fix base64 padding
            payload_b64 += "=" * (-len(payload_b64) % 4)
            jwt_payload = json.loads(base64.urlsafe_b64decode(payload_b64))
            user_claim = jwt_payload.get("user")
            if isinstance(user_claim, dict):
                user_uid = user_claim.get("uid")
            if not user_uid:
                sub = jwt_payload.get("sub")
                if isinstance(sub, str):
                    user_uid = sub
            if user_uid:
                rprint(f"  [dim]Resolved user_uid from token: {user_uid}[/dim]")
        except Exception as exc:
            rprint(f"  [yellow]Could not decode user_uid from token: {exc}[/yellow]")

    resource_attrs: dict[str, Any] = {"service.name": service_name, "smoke.id": smoke_id}
    if user_uid:
        resource_attrs["datalayer.user_uid"] = user_uid
    resource = Resource.create(resource_attrs)

    passed = 0
    failed = 0

    # ── 1. Send traces ───────────────────────────────────────────────
    console.rule("[bold cyan]1/7  Sending test traces[/bold cyan]")
    trace_provider = TracerProvider(resource=resource)
    trace_exporter = OTLPSpanExporter(endpoint=f"{otlp_endpoint}/v1/traces")
    trace_provider.add_span_processor(BatchSpanProcessor(trace_exporter))
    otel_trace.set_tracer_provider(trace_provider)
    tracer = otel_trace.get_tracer("datalayer-otel-smoke")

    with tracer.start_as_current_span(f"{tag}-parent") as parent:
        parent.set_attribute("smoke.id", smoke_id)
        parent.set_attribute("smoke.signal", "trace")
        for i in range(3):
            with tracer.start_as_current_span(f"{tag}-child-{i}") as child:
                child.set_attribute("test.iteration", i)

    trace_provider.force_flush()
    rprint("[green]  Sent 4 test spans (1 parent + 3 children).[/green]")

    # ── 2. Send metrics ──────────────────────────────────────────────
    console.rule("[bold cyan]2/7  Sending test metrics[/bold cyan]")
    metric_reader = PeriodicExportingMetricReader(
        OTLPMetricExporter(endpoint=f"{otlp_endpoint}/v1/metrics"),
        export_interval_millis=1000,
    )
    meter_provider = MeterProvider(resource=resource, metric_readers=[metric_reader])
    otel_metrics.set_meter_provider(meter_provider)
    meter = otel_metrics.get_meter("datalayer-otel-smoke")

    counter = meter.create_counter(
        name=f"smoke_test.requests.{smoke_id}",
        description="Smoke test request counter",
        unit="1",
    )
    histogram = meter.create_histogram(
        name=f"smoke_test.latency.{smoke_id}",
        description="Smoke test latency histogram",
        unit="ms",
    )

    # Observable gauge – exported as OTLP "gauge" type.
    from opentelemetry.metrics import Observation as _Observation
    gauge_values = [42.0, 37.5, 55.1, 60.0, 48.8]
    gauge_idx = 0
    def _gauge_callback(options: Any) -> list[Any]:
        nonlocal gauge_idx
        if gauge_idx < len(gauge_values):
            obs = _Observation(value=gauge_values[gauge_idx], attributes={"smoke.id": smoke_id})
            gauge_idx += 1
            return [obs]
        return []
    meter.create_observable_gauge(
        name=f"smoke_test.temperature.{smoke_id}",
        callbacks=[_gauge_callback],
        description="Smoke test gauge (temperature)",
        unit="C",
    )

    # Exponential histogram – uses ExponentialBucketHistogramAggregation view.
    from opentelemetry.sdk.metrics.view import View, ExponentialBucketHistogramAggregation
    exp_hist_name = f"smoke_test.payload_size.{smoke_id}"
    exp_view = View(
        instrument_name=exp_hist_name,
        aggregation=ExponentialBucketHistogramAggregation(),
    )
    # We need to recreate the MeterProvider with the view to get exponentialHistogram export.
    # Flush the current provider first, then create a new one with the view.
    for i in range(5):
        counter.add(1, {"smoke.id": smoke_id, "endpoint": f"/test/{i}"})
        histogram.record(50.0 + i * 10, {"smoke.id": smoke_id})

    meter_provider.force_flush()

    # Second MeterProvider with exponential histogram view.
    metric_reader2 = PeriodicExportingMetricReader(
        OTLPMetricExporter(endpoint=f"{otlp_endpoint}/v1/metrics"),
        export_interval_millis=1000,
    )
    meter_provider2 = MeterProvider(resource=resource, metric_readers=[metric_reader2], views=[exp_view])
    meter2 = meter_provider2.get_meter("datalayer-otel-smoke-exp")
    exp_histogram = meter2.create_histogram(
        name=exp_hist_name,
        description="Smoke test exponential histogram (payload size)",
        unit="By",
    )
    for i in range(5):
        exp_histogram.record(100.0 + i * 50, {"smoke.id": smoke_id})

    meter_provider2.force_flush()
    rprint("[green]  Sent 5 counter + 5 histogram + gauge + 5 exponentialHistogram data points.[/green]")

    # ── 3. Send logs ─────────────────────────────────────────────────
    console.rule("[bold cyan]3/7  Sending test logs[/bold cyan]")
    log_provider = LoggerProvider(resource=resource)
    log_exporter = OTLPLogExporter(endpoint=f"{otlp_endpoint}/v1/logs")
    log_provider.add_log_record_processor(BatchLogRecordProcessor(log_exporter))
    otel_logs.set_logger_provider(log_provider)

    handler = LoggingHandler(level=logging.DEBUG, logger_provider=log_provider)
    test_logger = logging.getLogger(f"smoke-test-{smoke_id}")
    test_logger.addHandler(handler)
    test_logger.setLevel(logging.DEBUG)

    test_logger.info("Smoke test INFO log – id=%s", smoke_id)
    test_logger.warning("Smoke test WARNING log – id=%s", smoke_id)
    test_logger.error("Smoke test ERROR log – id=%s", smoke_id)

    log_provider.force_flush()
    rprint("[green]  Sent 3 test log records (INFO, WARNING, ERROR).[/green]")

    # ── 4. Wait for ingestion ────────────────────────────────────────
    console.rule("[bold cyan]4/7  Waiting for ingestion[/bold cyan]")
    rprint(f"  Waiting {wait}s for data to flow through the pipeline …")
    for remaining in range(wait, 0, -1):
        rprint(f"  [dim]{remaining}s remaining …[/dim]", end="\r")
        time.sleep(1)
    rprint(f"  [dim]Done waiting.{'':30s}[/dim]")

    # ── 5. Flush service buffers ─────────────────────────────────────
    console.rule("[bold cyan]5/7  Flushing service buffers[/bold cyan]")
    rprint("  [dim]CLI: datalayer otel flush[/dim]")
    try:
        resp = httpx.post(f"{url}/api/otel/v1/flush/", headers=headers, timeout=30, follow_redirects=True)
        resp.raise_for_status()
        rprint(f"  [green]Flush result: {resp.json()}[/green]")
    except Exception as exc:
        rprint(f"  [yellow]Flush call failed (non-fatal): {exc}[/yellow]")

    # ── 6. Query back ────────────────────────────────────────────────
    console.rule("[bold cyan]6/7  Querying data back[/bold cyan]")

    # 6a – traces
    rprint("\n  [bold]Traces:[/bold]")
    rprint(f"  [dim]CLI: datalayer otel traces --service {service_name}[/dim]")
    try:
        resp = httpx.get(
            f"{url}/api/otel/v1/traces/",
            params={"service_name": service_name, "limit": 10},
            headers=headers, timeout=30, follow_redirects=True,
        )
        resp.raise_for_status()
        trace_data = resp.json()
        trace_rows = trace_data.get("data", []) if isinstance(trace_data, dict) else trace_data
        trace_count = len(trace_rows) if isinstance(trace_rows, list) else 0
        if trace_count > 0:
            rprint(f"  [green]  ✓ Found {trace_count} trace(s) for service '{service_name}'[/green]")
            tbl = Table(show_header=True, header_style="bold")
            tbl.add_column("Trace ID", style="cyan")
            tbl.add_column("Span", style="yellow")
            tbl.add_column("Time", style="dim")
            for row in trace_rows[:5]:
                tbl.add_row(
                    str(row.get("trace_id", ""))[:16] + "…",
                    str(row.get("span_name", row.get("operation", ""))),
                    str(row.get("start_time", "")),
                )
            console.print(tbl)
            passed += 1
        else:
            rprint(f"  [red]  ✗ No traces found for service '{service_name}'[/red]")
            failed += 1
    except Exception as exc:
        rprint(f"  [red]  ✗ Trace query failed: {exc}[/red]")
        failed += 1

    # 6b – metrics
    counter_name = f"smoke_test.requests.{smoke_id}"
    rprint("\n  [bold]Metrics:[/bold]")
    rprint(f"  [dim]CLI: datalayer otel metrics --name {counter_name} --service {service_name}[/dim]")
    try:
        resp = httpx.get(
            f"{url}/api/otel/v1/metrics/query",
            params={"name": counter_name, "service_name": service_name, "limit": 10},
            headers=headers, timeout=30, follow_redirects=True,
        )
        resp.raise_for_status()
        metric_data = resp.json()
        metric_rows = metric_data.get("data", []) if isinstance(metric_data, dict) else metric_data
        metric_count = len(metric_rows) if isinstance(metric_rows, list) else 0
        if metric_count > 0:
            rprint(f"  [green]  ✓ Found {metric_count} metric data point(s) for '{counter_name}'[/green]")
            tbl = Table(show_header=True, header_style="bold")
            tbl.add_column("Metric Name", style="cyan")
            tbl.add_column("Value", style="yellow")
            tbl.add_column("Unit", style="dim")
            tbl.add_column("Time", style="dim")
            for row in metric_rows[:5]:
                tbl.add_row(
                    str(row.get("metric_name", row.get("name", ""))),
                    str(row.get("value_double", row.get("value", ""))),
                    str(row.get("metric_unit", row.get("unit", ""))),
                    str(row.get("start_time", row.get("time", ""))),
                )
            console.print(tbl)
            passed += 1
        else:
            rprint(f"  [red]  ✗ No metrics found for '{counter_name}'[/red]")
            failed += 1
    except Exception as exc:
        rprint(f"  [red]  ✗ Metric query failed: {exc}[/red]")
        failed += 1

    # 6c – logs
    rprint("\n  [bold]Logs:[/bold]")
    rprint(f"  [dim]CLI: datalayer otel logs --service {service_name}[/dim]")
    try:
        resp = httpx.get(
            f"{url}/api/otel/v1/logs/",
            params={"service_name": service_name, "limit": 10},
            headers=headers, timeout=30, follow_redirects=True,
        )
        resp.raise_for_status()
        log_data = resp.json()
        log_rows = log_data.get("data", []) if isinstance(log_data, dict) else log_data
        log_count = len(log_rows) if isinstance(log_rows, list) else 0
        if log_count > 0:
            rprint(f"  [green]  ✓ Found {log_count} log(s) for service '{service_name}'[/green]")
            tbl = Table(show_header=True, header_style="bold")
            tbl.add_column("Severity", style="cyan")
            tbl.add_column("Body", style="yellow", max_width=60)
            tbl.add_column("Time", style="dim")
            for row in log_rows[:5]:
                tbl.add_row(
                    str(row.get("severity_text", row.get("severity", ""))),
                    str(row.get("body", ""))[:60],
                    str(row.get("timestamp", row.get("time", ""))),
                )
            console.print(tbl)
            passed += 1
        else:
            rprint(f"  [red]  ✗ No logs found for service '{service_name}'[/red]")
            failed += 1
    except Exception as exc:
        rprint(f"  [red]  ✗ Log query failed: {exc}[/red]")
        failed += 1

    # ── 7. SQL queries ───────────────────────────────────────────────
    console.rule("[bold cyan]7/7  Running SQL queries via SQL Engine[/bold cyan]")

    sql_queries = [
        ("spans", f"SELECT trace_id, operation_name, service_name FROM spans WHERE service_name = '{service_name}' LIMIT 5"),
        ("metrics", f"SELECT metric_name, value_double, metric_unit FROM metrics WHERE service_name = '{service_name}' LIMIT 5"),
        ("logs", f"SELECT severity_text, body, service_name FROM logs WHERE service_name = '{service_name}' LIMIT 5"),
    ]

    for table_name, sql_str in sql_queries:
        rprint(f"\n  [bold]SQL on {table_name}:[/bold]  [dim]{sql_str}[/dim]")
        escaped_sql = sql_str.replace('"', '\\"')
        rprint(f'  [dim]CLI: datalayer otel query "{escaped_sql}"[/dim]')
        try:
            resp = httpx.post(
                f"{url}/api/otel/v1/query/",
                json={"sql": sql_str},
                headers=headers, timeout=30, follow_redirects=True,
            )
            resp.raise_for_status()
            sql_data = resp.json()
            sql_rows = sql_data.get("data", [])
            if sql_rows:
                rprint(f"  [green]  ✓ Got {len(sql_rows)} row(s) from {table_name}[/green]")
                # Build a table from whatever columns the rows have.
                tbl = Table(show_header=True, header_style="bold")
                columns = list(sql_rows[0].keys()) if sql_rows else []
                for col in columns:
                    tbl.add_column(col, style="cyan" if col == columns[0] else "yellow", max_width=40)
                for row in sql_rows[:5]:
                    tbl.add_row(*(str(row.get(c, ""))[:40] for c in columns))
                console.print(tbl)
                passed += 1
            else:
                rprint(f"  [red]  ✗ No rows from {table_name}[/red]")
                failed += 1
        except Exception as exc:
            rprint(f"  [red]  ✗ SQL query on {table_name} failed: {exc}[/red]")
            failed += 1

    # ── Cleanup SDK providers ────────────────────────────────────────
    trace_provider.shutdown()
    meter_provider.shutdown()
    meter_provider2.shutdown()
    log_provider.shutdown()

    # ── Summary ──────────────────────────────────────────────────────
    console.rule("[bold]Smoke Test Summary[/bold]")
    total = passed + failed
    if failed == 0:
        rprint(f"[bold green]All {total}/{total} checks passed.[/bold green]")
    else:
        rprint(f"[bold red]{failed}/{total} checks failed, {passed}/{total} passed.[/bold red]")
        raise typer.Exit(code=1)


# ── load-test ────────────────────────────────────────────────────────


@app.command("load-test")
def load_test(
    otlp_endpoint: Optional[str] = typer.Option(
        None,
        "--otlp-endpoint",
        "-e",
        help="OTLP HTTP endpoint of the collector (defaults to <otel-run-url>/api/otel/v1/otlp).",
    ),
    service_name: str = typer.Option(
        "datalayer-otel-load",
        "--service",
        "-s",
        help="Service name for test data.",
    ),
    interval: float = typer.Option(
        5.0,
        "--interval",
        "-i",
        help="Seconds between each burst of test data.",
    ),
    count: int = typer.Option(
        0,
        "--count",
        "-n",
        help="Number of iterations to run (0 = unlimited, stop with Ctrl+C).",
    ),
    token: Optional[str] = typer.Option(None, "--api-key", "-t", help="Auth token (or set DATALAYER_API_KEY)."),
) -> None:
    """Continuously send traces, metrics and logs at a configurable interval.

    Exercises the full OTEL ingest pipeline in a loop:
      1. Emit test traces, metrics and logs via the OpenTelemetry SDK
      2. Wait for --interval seconds
      3. Repeat until --count is reached or Ctrl+C is pressed

    Examples:
      # Send data every 5 seconds indefinitely:
      datalayer otel load-test

      # Send 10 bursts every 2 seconds using a specific service name:
      datalayer otel load-test --count 10 --interval 2 --service my-service
    """
    otlp_endpoint = otlp_endpoint or f"{_otel_base_url(None)}/api/otel/v1/otlp"
    try:
        from opentelemetry.exporter.otlp.proto.http._log_exporter import OTLPLogExporter
        from opentelemetry.exporter.otlp.proto.http.metric_exporter import OTLPMetricExporter
        from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
        from opentelemetry.sdk._logs import LoggerProvider, LoggingHandler
        from opentelemetry.sdk._logs.export import BatchLogRecordProcessor
        from opentelemetry.sdk.metrics import MeterProvider
        from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
        from opentelemetry.sdk.resources import Resource
        from opentelemetry.sdk.trace import TracerProvider
        from opentelemetry.sdk.trace.export import BatchSpanProcessor
    except ImportError:
        rprint("[red]opentelemetry SDK packages are required. Install with:[/red]")
        rprint(
            "  pip install opentelemetry-api opentelemetry-sdk "
            "opentelemetry-exporter-otlp-proto-http"
        )
        raise typer.Exit(code=1)

    import base64
    import logging
    import uuid

    # Resolve user_uid from token so the OTLP resource attribute matches query filters.
    resolved_token = _resolve_token(token)
    user_uid: str | None = None
    if resolved_token:
        try:
            payload_b64 = resolved_token.split(".")[1]
            payload_b64 += "=" * (-len(payload_b64) % 4)
            jwt_payload = json.loads(base64.urlsafe_b64decode(payload_b64))
            user_claim = jwt_payload.get("user")
            if isinstance(user_claim, dict):
                user_uid = user_claim.get("uid")
            if not user_uid:
                sub = jwt_payload.get("sub")
                if isinstance(sub, str):
                    user_uid = sub
            if user_uid:
                rprint(f"  [dim]Resolved user_uid from token: {user_uid}[/dim]")
        except Exception as exc:
            rprint(f"  [yellow]Could not decode user_uid from token: {exc}[/yellow]")

    count_label = str(count) if count > 0 else "∞"
    rprint(
        f"[bold cyan]Starting load test[/bold cyan] — "
        f"interval=[yellow]{interval}s[/yellow], "
        f"iterations=[yellow]{count_label}[/yellow], "
        f"service=[yellow]{service_name}[/yellow]"
    )
    rprint("  Press [bold]Ctrl+C[/bold] to stop.\n")

    iteration = 0
    try:
        while count == 0 or iteration < count:
            iteration += 1
            load_id = uuid.uuid4().hex[:8]
            tag = f"load-{load_id}"

            resource_attrs: dict[str, Any] = {
                "service.name": service_name,
                "load.id": load_id,
                "load.iteration": iteration,
            }
            if user_uid:
                resource_attrs["datalayer.user_uid"] = user_uid
            resource = Resource.create(resource_attrs)

            rprint(f"[bold]Iteration {iteration}[/bold]  (id={load_id})", end="  ")

            # ── Send traces ──────────────────────────────────────────
            trace_provider = TracerProvider(resource=resource)
            trace_exporter = OTLPSpanExporter(endpoint=f"{otlp_endpoint}/v1/traces")
            trace_provider.add_span_processor(BatchSpanProcessor(trace_exporter))
            tracer = trace_provider.get_tracer("datalayer-otel-load")

            with tracer.start_as_current_span(f"{tag}-parent") as parent:
                parent.set_attribute("load.id", load_id)
                parent.set_attribute("load.iteration", iteration)
                for i in range(3):
                    with tracer.start_as_current_span(f"{tag}-child-{i}") as child:
                        child.set_attribute("test.iteration", i)

            trace_provider.force_flush()

            # ── Send metrics ─────────────────────────────────────────
            metric_reader = PeriodicExportingMetricReader(
                OTLPMetricExporter(endpoint=f"{otlp_endpoint}/v1/metrics"),
                export_interval_millis=1000,
            )

            from opentelemetry.metrics import Observation as _OtelObs
            from opentelemetry.sdk.metrics.view import (
                ExponentialBucketHistogramAggregation,
                View,
            )

            exp_metric_name = f"load_test.exp_latency.{load_id}"
            exp_view = View(
                instrument_name=exp_metric_name,
                aggregation=ExponentialBucketHistogramAggregation(),
            )
            meter_provider = MeterProvider(
                resource=resource,
                metric_readers=[metric_reader],
                views=[exp_view],
            )
            meter = meter_provider.get_meter("datalayer-otel-load")

            counter = meter.create_counter(
                name=f"load_test.requests.{load_id}",
                description="Load test request counter",
                unit="1",
            )
            latency_hist = meter.create_histogram(
                name=f"load_test.latency.{load_id}",
                description="Load test latency histogram",
                unit="ms",
            )
            # Gauge – observable gauge exported as OTLP "gauge" type
            _cpu_value = [random.uniform(0.0, 100.0)]
            def _cpu_callback(options: Any) -> list[Any]:
                return [_OtelObs(_cpu_value[0], {"load.id": load_id})]
            meter.create_observable_gauge(
                name=f"load_test.cpu_utilization.{load_id}",
                callbacks=[_cpu_callback],
                description="Load test CPU utilization gauge",
                unit="%",
            )
            # Exponential histogram – View above maps it to exponentialHistogram
            exp_hist = meter.create_histogram(
                name=exp_metric_name,
                description="Load test exponential latency",
                unit="ms",
            )
            for i in range(5):
                counter.add(1, {"load.id": load_id, "endpoint": f"/test/{i}"})
                latency_hist.record(50.0 + i * 10, {"load.id": load_id})
                exp_hist.record(random.uniform(0.5, 500.0), {"load.id": load_id})

            meter_provider.force_flush()

            # ── Send logs ────────────────────────────────────────────
            log_provider = LoggerProvider(resource=resource)
            log_exporter = OTLPLogExporter(endpoint=f"{otlp_endpoint}/v1/logs")
            log_provider.add_log_record_processor(BatchLogRecordProcessor(log_exporter))

            handler = LoggingHandler(level=logging.DEBUG, logger_provider=log_provider)
            test_logger = logging.getLogger(f"load-test-{load_id}")
            test_logger.addHandler(handler)
            test_logger.setLevel(logging.DEBUG)

            test_logger.info("Load test INFO log – id=%s iteration=%d", load_id, iteration)
            test_logger.warning("Load test WARNING log – id=%s", load_id)
            test_logger.error("Load test ERROR log – id=%s", load_id)

            log_provider.force_flush()

            # ── Shutdown providers ───────────────────────────────────
            trace_provider.shutdown()
            meter_provider.shutdown()
            log_provider.shutdown()

            rprint(f"[green]✓ traces + metrics + logs sent[/green]")

            # ── Wait before next iteration ───────────────────────────
            if count == 0 or iteration < count:
                remaining_total = interval
                step = min(1.0, interval)
                elapsed = 0.0
                while elapsed < remaining_total:
                    secs_left = remaining_total - elapsed
                    rprint(f"  [dim]Next burst in {secs_left:.0f}s …[/dim]", end="\r")
                    time.sleep(step)
                    elapsed += step
                rprint(f"  {'':40s}", end="\r")  # clear countdown line

    except KeyboardInterrupt:
        rprint(f"\n[bold yellow]Load test stopped after {iteration} iteration(s).[/bold yellow]")
        raise typer.Exit(code=0)

    rprint(f"\n[bold green]Load test complete: {iteration} iteration(s) sent.[/bold green]")


# ── logfire-test ──────────────────────────────────────────────────────


@app.command("logfire-test")
def logfire_test(
    otlp_endpoint: Optional[str] = typer.Option(
        None,
        "--otlp-endpoint",
        "-e",
        help="OTLP HTTP endpoint of the collector (defaults to <otel-run-url>/api/otel/v1/otlp).",
    ),
    service_name: str = typer.Option(
        "datalayer-otel-logfire",
        "--service",
        "-s",
        help="Service name for the test data.",
    ),
    token: Optional[str] = typer.Option(None, "--api-key", "-t", help="Auth token (or set DATALAYER_API_KEY)."),
    verbose: bool = typer.Option(False, "--verbose", "-v", help="Enable verbose logfire console output."),
) -> None:
    """Send test traces, metrics and logs via the Logfire library to the local OTLP endpoint.

    Uses the pydantic logfire library for traces and logs, and the OpenTelemetry SDK
    for metrics.  All data is forwarded to the local OTLP collector (--otlp-endpoint)
    so it is visible in the Datalayer OTEL example UI.

    Logfire is configured with send_to_logfire=False so no cloud token is required.
    """
    import base64
    import logging as _logging
    import uuid

    otlp_endpoint = otlp_endpoint or f"{_otel_base_url(None)}/api/otel/v1/otlp"

    try:
        import logfire
    except ImportError:
        rprint("[red]logfire package is required. Install with:[/red]")
        rprint("  pip install 'logfire>=3.0.0'")
        raise typer.Exit(code=1)

    try:
        from opentelemetry.exporter.otlp.proto.http._log_exporter import OTLPLogExporter
        from opentelemetry.exporter.otlp.proto.http.metric_exporter import OTLPMetricExporter
        from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
        from opentelemetry.sdk._logs import LoggerProvider, LoggingHandler
        from opentelemetry.sdk._logs.export import BatchLogRecordProcessor
        from opentelemetry.sdk.metrics import MeterProvider
        from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
        from opentelemetry.sdk.resources import Resource
        from opentelemetry.sdk.trace import TracerProvider
        from opentelemetry.sdk.trace.export import BatchSpanProcessor
    except ImportError:
        rprint("[red]opentelemetry SDK packages are required. Install with:[/red]")
        rprint("  pip install opentelemetry-api opentelemetry-sdk opentelemetry-exporter-otlp-proto-http")
        raise typer.Exit(code=1)

    test_id = uuid.uuid4().hex[:8]

    # Resolve user_uid from JWT token.
    resolved_token = _resolve_token(token)
    user_uid: str | None = None
    if resolved_token:
        try:
            payload_b64 = resolved_token.split(".")[1]
            payload_b64 += "=" * (-len(payload_b64) % 4)
            jwt_payload = json.loads(base64.urlsafe_b64decode(payload_b64))
            user_claim = jwt_payload.get("user")
            if isinstance(user_claim, dict):
                user_uid = user_claim.get("uid")
            if not user_uid:
                sub = jwt_payload.get("sub")
                if isinstance(sub, str):
                    user_uid = sub
            if user_uid:
                rprint(f"  [dim]Resolved user_uid from token: {user_uid}[/dim]")
        except Exception as exc:
            rprint(f"  [yellow]Could not decode user_uid from token: {exc}[/yellow]")

    resource_attrs: dict[str, Any] = {
        "service.name": service_name,
        "logfire.test.id": test_id,
    }
    if user_uid:
        resource_attrs["datalayer.user_uid"] = user_uid

    # ── 1. Configure logfire (traces + logs) → local OTLP collector ──────────
    console.rule("[bold cyan]1/3  Configuring Logfire (traces + logs)[/bold cyan]")
    rprint(f"  OTLP endpoint : [cyan]{otlp_endpoint}[/cyan]")
    rprint(f"  Service       : [cyan]{service_name}[/cyan]")
    rprint(f"  Test ID       : [cyan]{test_id}[/cyan]")
    rprint(f"  Logfire       : [cyan]{logfire.__version__}[/cyan]")

    otlp_span_processor = BatchSpanProcessor(
        OTLPSpanExporter(endpoint=f"{otlp_endpoint}/v1/traces")
    )
    configure_kwargs: dict[str, Any] = {
        "send_to_logfire": False,
        "service_name": service_name,
        "console": logfire.ConsoleOptions(verbose=verbose),
    }
    logfire.configure(**configure_kwargs)
    rprint("  [green]Logfire configured ✔[/green]")

    # ── 2. Send traces via OTel SDK (with proper resource/user_uid) ───────────
    # We use the OTel SDK directly so the Resource (incl. datalayer.user_uid)
    # is attached to the spans — logfire's internal TracerProvider doesn't carry
    # our custom resource attributes.
    console.rule("[bold cyan]2/3  Sending traces via OTel SDK + logs via Logfire[/bold cyan]")

    resource = Resource.create(resource_attrs)
    trace_provider = TracerProvider(resource=resource)
    trace_provider.add_span_processor(otlp_span_processor)
    tracer = trace_provider.get_tracer("datalayer-otel-logfire-test")

    with tracer.start_as_current_span(f"logfire-test-parent") as parent_span:
        parent_span.set_attribute("logfire.test.id", test_id)
        parent_span.set_attribute("logfire.test.signal", "trace")
        if user_uid:
            parent_span.set_attribute("datalayer.user_uid", user_uid)
        for i in range(3):
            with tracer.start_as_current_span(f"logfire-test-child-{i}") as child_span:
                child_span.set_attribute("test.iteration", i)
                child_span.set_attribute("logfire.test.id", test_id)
                time.sleep(0.05)

    trace_provider.force_flush()
    trace_provider.shutdown()
    rprint("  [green]1 parent + 3 child spans sent via OTel SDK ✔[/green]")

    logfire.info("Logfire test INFO log – id={test_id}", test_id=test_id)
    logfire.warn("Logfire test WARNING log – id={test_id}", test_id=test_id)
    logfire.error("Logfire test ERROR log – id={test_id}", test_id=test_id)

    # Also emit logs via OTel SDK so they appear in the Logs tab.
    resource = Resource.create(resource_attrs)
    log_provider = LoggerProvider(resource=resource)
    log_provider.add_log_record_processor(
        BatchLogRecordProcessor(OTLPLogExporter(endpoint=f"{otlp_endpoint}/v1/logs"))
    )
    handler = LoggingHandler(level=_logging.DEBUG, logger_provider=log_provider)
    sdk_logger = _logging.getLogger(f"logfire-test-sdk-{test_id}")
    sdk_logger.addHandler(handler)
    sdk_logger.setLevel(_logging.DEBUG)
    sdk_logger.info("Logfire-test SDK INFO log – id=%s", test_id)
    sdk_logger.warning("Logfire-test SDK WARNING log – id=%s", test_id)
    sdk_logger.error("Logfire-test SDK ERROR log – id=%s", test_id)
    log_provider.force_flush()
    log_provider.shutdown()
    rprint("  [green]3 logfire messages + 3 SDK log records sent ✔[/green]")

    # ── 3. Send metrics via OTel SDK ──────────────────────────────────────────
    console.rule("[bold cyan]3/3  Sending metrics via OTel SDK[/bold cyan]")
    metric_reader = PeriodicExportingMetricReader(
        OTLPMetricExporter(endpoint=f"{otlp_endpoint}/v1/metrics"),
        export_interval_millis=1000,
    )
    meter_provider = MeterProvider(resource=resource, metric_readers=[metric_reader])
    meter = meter_provider.get_meter("datalayer-otel-logfire-test")

    req_counter = meter.create_counter(
        name=f"logfire_test.requests.{test_id}",
        description="Logfire test request counter",
        unit="1",
    )
    latency_hist = meter.create_histogram(
        name=f"logfire_test.latency.{test_id}",
        description="Logfire test latency histogram",
        unit="ms",
    )
    for i in range(5):
        req_counter.add(1, {"logfire.test.id": test_id, "endpoint": f"/test/{i}"})
        latency_hist.record(40.0 + i * 12, {"logfire.test.id": test_id})

    meter_provider.force_flush()
    meter_provider.shutdown()
    rprint("  [green]5 counter + 5 histogram data points sent ✔[/green]")

    # ── Flush & summary ───────────────────────────────────────────────────────
    logfire.force_flush()

    console.rule("[bold]Logfire Test Summary[/bold]")
    rprint(
        f"[bold green]All data sent to {otlp_endpoint} "
        f"— service=[cyan]{service_name}[/cyan], id=[cyan]{test_id}[/cyan][/bold green]"
    )


# ── system ────────────────────────────────────────────────────────────


@app.command("system")
def system(
    base_url: Optional[str] = typer.Option(None, "--otel-run-url", help="OTEL service run URL."),
    token: Optional[str] = typer.Option(None, "--api-key", "-t", help="Auth token (or set DATALAYER_API_KEY). Must have platform_admin role."),
    json_output: bool = typer.Option(False, "--json", help="Output raw JSON."),
) -> None:
    """Show system statistics (platform_admin only).

    Displays service memory/CPU, disk space, row counts per table,
    and number of distinct users.  Requires a token with the
    ``platform_admin`` role.
    """
    import httpx

    url = _otel_base_url(base_url)
    headers = _auth_headers(token)
    endpoint = f"{url}/api/otel/v1/system/"

    try:
        resp = httpx.get(endpoint, headers=headers, timeout=15)
    except httpx.RequestError as exc:
        rprint(f"[red]Connection error: {exc}[/red]")
        raise typer.Exit(code=1)

    if resp.status_code == 403:
        rprint("[red]Access denied: platform_admin role required.[/red]")
        raise typer.Exit(code=1)
    if resp.status_code != 200:
        rprint(f"[red]HTTP {resp.status_code}: {resp.text}[/red]")
        raise typer.Exit(code=1)

    payload = resp.json()
    data = payload.get("data", payload)

    if json_output:
        rprint(json.dumps(data, indent=2))
        return

    console.rule("[bold cyan]OTEL System Statistics[/bold cyan]")

    # ── Process ──────────────────────────────────────────────────────
    proc = data.get("process", {})
    if "error" not in proc:
        rss_mb = proc.get("memory_rss_bytes", 0) / 1024 / 1024
        vms_mb = proc.get("memory_vms_bytes", 0) / 1024 / 1024
        cpu = proc.get("cpu_percent", 0)
        threads = proc.get("num_threads", "?")
        t = Table(title="Process", box=None, show_header=True)
        t.add_column("Metric", style="bold")
        t.add_column("Value")
        t.add_row("RSS Memory", f"{rss_mb:.1f} MB")
        t.add_row("VMS Memory", f"{vms_mb:.1f} MB")
        t.add_row("CPU", f"{cpu:.1f} %")
        t.add_row("Threads", str(threads))
        console.print(t)
    else:
        rprint(f"  [yellow]Process stats unavailable: {proc['error']}[/yellow]")

    # ── Disk ─────────────────────────────────────────────────────────
    disk = data.get("disk", {})
    if "error" not in disk:
        used_gb = disk.get("used_bytes", 0) / 1024 ** 3
        free_gb = disk.get("free_bytes", 0) / 1024 ** 3
        total_gb = disk.get("total_bytes", 0) / 1024 ** 3
        used_pct = disk.get("used_percent", 0)
        t = Table(title="Disk", box=None, show_header=True)
        t.add_column("Metric", style="bold")
        t.add_column("Value")
        t.add_row("Data Dir", disk.get("data_dir", "?"))
        t.add_row("Total", f"{total_gb:.1f} GB")
        t.add_row("Used", f"{used_gb:.1f} GB  ({used_pct:.1f}%)")
        t.add_row("Free", f"{free_gb:.1f} GB")
        console.print(t)
    else:
        rprint(f"  [yellow]Disk stats unavailable: {disk['error']}[/yellow]")

    # ── Tables ───────────────────────────────────────────────────────
    tables_info = data.get("tables", {})
    if tables_info:
        t = Table(title="Tables", box=None, show_header=True)
        t.add_column("Table", style="bold")
        t.add_column("Rows", justify="right")
        t.add_column("Users", justify="right")
        t.add_column("Disk", justify="right")
        for tbl, tinfo in tables_info.items():
            if "error" in tinfo:
                t.add_row(tbl, "[red]error[/red]", "-", "-")
            else:
                rows = f"{tinfo.get('row_count', 0):,}"
                users = str(tinfo.get("distinct_users", 0))
                disk_mb = tinfo.get("disk_bytes", 0) / 1024 / 1024
                t.add_row(tbl, rows, users, f"{disk_mb:.2f} MB")
        console.print(t)

    # ── Summary ──────────────────────────────────────────────────────
    total_users = data.get("total_distinct_users", "?")
    rprint(f"\n  [bold]Total distinct users (across all tables):[/bold] {total_users}")
