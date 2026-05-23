# Copyright (c) 2023-2026 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""Evals commands for Datalayer CLI."""

from __future__ import annotations

from datetime import datetime, timezone
import json
import time
from pathlib import Path
from typing import Any, Optional

import typer
from rich.console import Console
from rich.table import Table

from datalayer_core.client.client import DatalayerClient
from datalayer_core.utils.urls import DatalayerURLs

app = typer.Typer(
    name="evals",
    help="Launch and monitor SaaS eval datasets, experiments, runs, and live monitoring.",
    invoke_without_command=True,
)

evals_app = typer.Typer(name="evals", help="Manage eval datasets.")
experiments_app = typer.Typer(name="experiments", help="Manage eval dataset experiments.")
runs_app = typer.Typer(name="runs", help="Launch and monitor eval dataset runs.")
live_app = typer.Typer(name="live", help="Inspect live eval dataset monitoring.")

console = Console()


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _parse_json_value(raw: Optional[str], flag_name: str) -> dict[str, Any]:
    if not raw:
        return {}
    try:
        parsed = json.loads(raw)
    except Exception as exc:
        raise typer.BadParameter(f"Invalid JSON for {flag_name}: {exc}") from exc
    if not isinstance(parsed, dict):
        raise typer.BadParameter(f"{flag_name} must decode to an object")
    return parsed


def _parse_json_file(path_value: Optional[str], flag_name: str) -> dict[str, Any]:
    if not path_value:
        return {}
    path = Path(path_value)
    if not path.exists():
        raise typer.BadParameter(f"File not found for {flag_name}: {path}")
    text = path.read_text(encoding="utf-8")
    return _parse_json_value(text, flag_name)


def _merge_dicts(*parts: dict[str, Any]) -> dict[str, Any]:
    merged: dict[str, Any] = {}
    for part in parts:
        merged.update(part)
    return merged


def _make_client(
    token: Optional[str] = None,
    ai_agents_url: Optional[str] = None,
) -> DatalayerClient:
    urls = DatalayerURLs.from_environment(ai_agents_url=ai_agents_url)
    return DatalayerClient(urls=urls, token=token)


def _status_style(status: str) -> str:
    normalized = status.lower()
    if normalized in {"completed", "success", "passed"}:
        return "green"
    if normalized in {"running", "queued", "pending"}:
        return "yellow"
    if normalized in {"failed", "error"}:
        return "red"
    return "white"


@app.callback()
def evals_callback(ctx: typer.Context) -> None:
    """Evals command group."""
    if ctx.invoked_subcommand is None:
        typer.echo(ctx.get_help())


@evals_app.command(name="list")
def evals_list(
    token: Optional[str] = typer.Option(None, "--token", help="API token."),
    ai_agents_url: Optional[str] = typer.Option(None, "--ai-agents-url", help="AI Agents base URL."),
    account_uid: Optional[str] = typer.Option(None, "--account-uid", help="Organization/account UID context."),
    run_environment: Optional[str] = typer.Option(None, "--run-environment", help="Filter by run environment (cloud/local)."),
    kind: Optional[str] = typer.Option(None, "--kind", help="Filter by kind (batch/interactive)."),
    q: Optional[str] = typer.Option(None, "--q", help="Search query."),
    limit: int = typer.Option(50, "--limit", min=1, max=200),
    offset: int = typer.Option(0, "--offset", min=0),
    raw: bool = typer.Option(False, "--raw", help="Print raw JSON output."),
) -> None:
    """List eval datasets."""
    client = _make_client(token=token, ai_agents_url=ai_agents_url)
    payload = client.evals_list_evals(
        run_environment=run_environment,
        kind=kind,
        q=q,
        limit=limit,
        offset=offset,
        account_uid=account_uid,
    )
    if raw:
        console.print(payload)
        return

    eval_datasets = payload.get("eval_datasets") or []
    table = Table(title=f"Evals ({len(eval_datasets)})")
    table.add_column("ID", style="cyan")
    table.add_column("Name", style="white")
    table.add_column("Run Environment", style="white")
    table.add_column("Kind", style="white")
    table.add_column("Cases", style="white")
    table.add_column("Updated", style="white")
    for item in eval_datasets:
        table.add_row(
            str(item.get("id", "")),
            str(item.get("name", "")),
            str(item.get("run_environment", "")),
            str(item.get("kind", "")),
            str(len(item.get("cases") or [])),
            str(item.get("updated_at", "")),
        )
    console.print(table)


@evals_app.command(name="create")
def evals_create(
    name: str = typer.Argument(..., help="Eval dataset name."),
    description: str = typer.Option("", "--description", help="Eval dataset description."),
    run_environment: str = typer.Option("cloud", "--run-environment", help="Eval dataset run environment."),
    kind: str = typer.Option("batch", "--kind", help="Eval dataset kind (batch/interactive)."),
    schema_json: Optional[str] = typer.Option(None, "--schema-json", help="Schema JSON object."),
    metadata_json: Optional[str] = typer.Option(None, "--metadata-json", help="Metadata JSON object."),
    cases_file: Optional[str] = typer.Option(None, "--cases-file", help="Path to JSON array of cases."),
    tags: list[str] = typer.Option([], "--tag", help="Repeatable tag."),
    token: Optional[str] = typer.Option(None, "--token", help="API token."),
    ai_agents_url: Optional[str] = typer.Option(None, "--ai-agents-url", help="AI Agents base URL."),
    account_uid: Optional[str] = typer.Option(None, "--account-uid", help="Organization/account UID context."),
) -> None:
    """Create an eval dataset."""
    schema = _parse_json_value(schema_json, "--schema-json")
    metadata = _parse_json_value(metadata_json, "--metadata-json")
    cases: list[dict[str, Any]] = []
    if cases_file:
        text = Path(cases_file).read_text(encoding="utf-8")
        decoded = json.loads(text)
        if not isinstance(decoded, list):
            raise typer.BadParameter("--cases-file must contain a JSON array")
        cases = [case for case in decoded if isinstance(case, dict)]

    client = _make_client(token=token, ai_agents_url=ai_agents_url)
    payload = client.evals_create_eval(
        name=name,
        description=description,
        run_environment=run_environment,
        kind=kind,
        schema=schema,
        metadata=metadata,
        tags=tags,
        cases=cases,
        account_uid=account_uid,
    )
    eval_record = payload.get("eval_dataset") or {}
    console.print(f"[green]Eval created:[/green] {eval_record.get('id', '')} ({eval_record.get('name', '')})")


@evals_app.command(name="delete")
def evals_delete(
    eval_dataset_id: str = typer.Argument(..., help="Eval dataset ID."),
    token: Optional[str] = typer.Option(None, "--token", help="API token."),
    ai_agents_url: Optional[str] = typer.Option(None, "--ai-agents-url", help="AI Agents base URL."),
    account_uid: Optional[str] = typer.Option(None, "--account-uid", help="Organization/account UID context."),
) -> None:
    """Delete an eval dataset (cascade delete runs/experiments)."""
    client = _make_client(token=token, ai_agents_url=ai_agents_url)
    payload = client.evals_delete_eval(eval_dataset_id, account_uid=account_uid)
    cascade = payload.get("cascade") or {}
    console.print(
        "[green]Eval deleted.[/green] "
        f"experiments={cascade.get('experiments_deleted', 0)} "
        f"runs={cascade.get('runs_deleted', 0)} "
        f"cases={cascade.get('cases_deleted', 0)}"
    )


@experiments_app.command(name="list")
def experiments_list(
    eval_dataset_id: Optional[str] = typer.Option(None, "--eval-dataset-id", help="Filter by eval dataset ID."),
    status: Optional[str] = typer.Option(None, "--status", help="Filter by status."),
    limit: int = typer.Option(50, "--limit", min=1, max=200),
    offset: int = typer.Option(0, "--offset", min=0),
    token: Optional[str] = typer.Option(None, "--token", help="API token."),
    ai_agents_url: Optional[str] = typer.Option(None, "--ai-agents-url", help="AI Agents base URL."),
    account_uid: Optional[str] = typer.Option(None, "--account-uid", help="Organization/account UID context."),
    raw: bool = typer.Option(False, "--raw", help="Print raw JSON output."),
) -> None:
    """List eval dataset experiments."""
    client = _make_client(token=token, ai_agents_url=ai_agents_url)
    payload = client.evals_list_experiments(
        eval_dataset_id=eval_dataset_id,
        status=status,
        limit=limit,
        offset=offset,
        account_uid=account_uid,
    )
    if raw:
        console.print(payload)
        return
    experiments = payload.get("experiments") or []
    table = Table(title=f"Eval Experiments ({len(experiments)})")
    table.add_column("ID", style="cyan")
    table.add_column("Name", style="white")
    table.add_column("Eval", style="white")
    table.add_column("Status", style="white")
    table.add_column("Updated", style="white")
    for item in experiments:
        status_value = str(item.get("status", ""))
        table.add_row(
            str(item.get("id", "")),
            str(item.get("name", "")),
            str(item.get("eval_dataset_id", "")),
            f"[{_status_style(status_value)}]{status_value}[/{_status_style(status_value)}]",
            str(item.get("updated_at", "")),
        )
    console.print(table)


@experiments_app.command(name="create")
def experiments_create(
    name: str = typer.Argument(..., help="Experiment name."),
    eval_dataset_id: Optional[str] = typer.Option(None, "--eval-dataset-id", help="Eval dataset ID."),
    description: str = typer.Option("", "--description", help="Description."),
    status: str = typer.Option("draft", "--status", help="Initial status."),
    config_json: Optional[str] = typer.Option(None, "--config-json", help="Config JSON object."),
    summary_json: Optional[str] = typer.Option(None, "--summary-json", help="Summary JSON object."),
    tags: list[str] = typer.Option([], "--tag", help="Repeatable tag."),
    token: Optional[str] = typer.Option(None, "--token", help="API token."),
    ai_agents_url: Optional[str] = typer.Option(None, "--ai-agents-url", help="AI Agents base URL."),
    account_uid: Optional[str] = typer.Option(None, "--account-uid", help="Organization/account UID context."),
) -> None:
    """Create an eval dataset experiment."""
    client = _make_client(token=token, ai_agents_url=ai_agents_url)
    payload = client.evals_create_experiment(
        name=name,
        eval_dataset_id=eval_dataset_id,
        description=description,
        status=status,
        config=_parse_json_value(config_json, "--config-json"),
        summary=_parse_json_value(summary_json, "--summary-json"),
        tags=tags,
        account_uid=account_uid,
    )
    experiment = payload.get("experiment") or {}
    console.print(f"[green]Experiment created:[/green] {experiment.get('id', '')} ({experiment.get('name', '')})")


@runs_app.command(name="list")
def runs_list(
    experiment_id: str = typer.Option(..., "--experiment-id", help="Experiment ID."),
    limit: int = typer.Option(50, "--limit", min=1, max=200),
    offset: int = typer.Option(0, "--offset", min=0),
    token: Optional[str] = typer.Option(None, "--token", help="API token."),
    ai_agents_url: Optional[str] = typer.Option(None, "--ai-agents-url", help="AI Agents base URL."),
    account_uid: Optional[str] = typer.Option(None, "--account-uid", help="Organization/account UID context."),
    raw: bool = typer.Option(False, "--raw", help="Print raw JSON output."),
) -> None:
    """List runs for an experiment."""
    client = _make_client(token=token, ai_agents_url=ai_agents_url)
    payload = client.evals_list_runs(
        experiment_id,
        limit=limit,
        offset=offset,
        account_uid=account_uid,
    )
    if raw:
        console.print(payload)
        return
    runs = payload.get("runs") or []
    table = Table(title=f"Eval Runs ({len(runs)})")
    table.add_column("Run", style="cyan")
    table.add_column("Status", style="white")
    table.add_column("Pass Rate", style="white")
    table.add_column("Run Environment", style="white")
    table.add_column("Created", style="white")
    for run in runs:
        status_value = str(run.get("status", ""))
        metrics = run.get("metrics") or {}
        summary = run.get("summary") or {}
        pass_rate = metrics.get("pass_rate")
        if isinstance(pass_rate, (float, int)):
            pass_rate_text = f"{float(pass_rate) * 100:.1f}%"
        else:
            pass_rate_text = "n/a"
        run_environment = str(summary.get("run_environment") or summary.get("launch_source") or "")
        table.add_row(
            str(run.get("id", "")),
            f"[{_status_style(status_value)}]{status_value}[/{_status_style(status_value)}]",
            pass_rate_text,
            run_environment,
            str(run.get("created_at", "")),
        )
    console.print(table)


@runs_app.command(name="launch")
def runs_launch(
    experiment_id: str = typer.Option(..., "--experiment-id", help="Experiment ID."),
    status: str = typer.Option("queued", "--status", help="Initial run status."),
    run_mode: Optional[str] = typer.Option(None, "--run-mode", help="Run mode hint (batch/interactive)."),
    runtime_pod_name: Optional[str] = typer.Option(None, "--runtime-pod-name", help="Runtime pod for interactive execution."),
    submitted_code_file: Optional[str] = typer.Option(None, "--submitted-code-file", help="Python file to execute in interactive mode."),
    metrics_json: Optional[str] = typer.Option(None, "--metrics-json", help="Inline metrics JSON object."),
    summary_json: Optional[str] = typer.Option(None, "--summary-json", help="Inline summary JSON object."),
    report_json: Optional[str] = typer.Option(None, "--report-json", help="Inline report JSON object."),
    metrics_file: Optional[str] = typer.Option(None, "--metrics-file", help="Path to metrics JSON object."),
    summary_file: Optional[str] = typer.Option(None, "--summary-file", help="Path to summary JSON object."),
    report_file: Optional[str] = typer.Option(None, "--report-file", help="Path to report JSON object."),
    started_at: Optional[str] = typer.Option(None, "--started-at", help="ISO timestamp override."),
    ended_at: Optional[str] = typer.Option(None, "--ended-at", help="ISO timestamp override."),
    token: Optional[str] = typer.Option(None, "--token", help="API token."),
    ai_agents_url: Optional[str] = typer.Option(None, "--ai-agents-url", help="AI Agents base URL."),
    account_uid: Optional[str] = typer.Option(None, "--account-uid", help="Organization/account UID context."),
) -> None:
    """Launch an eval dataset run on SaaS and tag it as CLI-launched."""
    cli_summary: dict[str, Any] = {
        "launch_source": "datalayer-cli",
        "launched_at": _now_iso(),
    }
    if run_mode:
        cli_summary["run_mode"] = run_mode
    if runtime_pod_name:
        cli_summary["runtime_pod_name"] = runtime_pod_name
    if submitted_code_file:
        path = Path(submitted_code_file)
        if not path.exists():
            raise typer.BadParameter(f"submitted code file not found: {submitted_code_file}")
        cli_summary["submitted_code"] = path.read_text(encoding="utf-8")

    metrics = _merge_dicts(
        _parse_json_file(metrics_file, "--metrics-file"),
        _parse_json_value(metrics_json, "--metrics-json"),
    )
    summary = _merge_dicts(
        _parse_json_file(summary_file, "--summary-file"),
        _parse_json_value(summary_json, "--summary-json"),
        cli_summary,
    )
    report = _merge_dicts(
        _parse_json_file(report_file, "--report-file"),
        _parse_json_value(report_json, "--report-json"),
    )

    client = _make_client(token=token, ai_agents_url=ai_agents_url)
    payload = client.evals_create_run(
        experiment_id,
        status=status,
        started_at=started_at,
        ended_at=ended_at,
        metrics=metrics,
        summary=summary,
        report=report,
        account_uid=account_uid,
    )
    run = payload.get("run") or {}
    run_id = str(run.get("id", ""))
    ui_url = f"{client.urls.ai_agents_url}/agents/evals"
    console.print(f"[green]Run launched:[/green] {run_id}")
    console.print(f"Track in UI: {ui_url}")


@runs_app.command(name="watch")
def runs_watch(
    run_id: str = typer.Argument(..., help="Run ID."),
    interval_seconds: float = typer.Option(3.0, "--interval", min=0.5, help="Polling interval."),
    timeout_seconds: int = typer.Option(600, "--timeout", min=5, help="Timeout in seconds."),
    token: Optional[str] = typer.Option(None, "--token", help="API token."),
    ai_agents_url: Optional[str] = typer.Option(None, "--ai-agents-url", help="AI Agents base URL."),
    account_uid: Optional[str] = typer.Option(None, "--account-uid", help="Organization/account UID context."),
) -> None:
    """Watch a run until completion/failure."""
    client = _make_client(token=token, ai_agents_url=ai_agents_url)
    started = time.time()
    last_status = ""

    while True:
        payload = client.evals_get_run(run_id, account_uid=account_uid)
        run = payload.get("run") or {}
        status = str(run.get("status", "unknown"))
        if status != last_status:
            metrics = run.get("metrics") or {}
            pass_rate = metrics.get("pass_rate")
            pass_rate_text = (
                f"{float(pass_rate) * 100:.1f}%"
                if isinstance(pass_rate, (int, float))
                else "n/a"
            )
            console.print(
                f"[{_status_style(status)}]{status}[/{_status_style(status)}] "
                f"pass_rate={pass_rate_text} updated={run.get('updated_at', '')}"
            )
            last_status = status

        if status.lower() in {"completed", "failed", "cancelled", "error"}:
            return

        if time.time() - started >= timeout_seconds:
            raise typer.Exit(1)

        time.sleep(interval_seconds)


@live_app.command(name="targets")
def live_targets(
    window: str = typer.Option("24h", "--window", help="Window: 1h, 6h, 24h, 7d, 30d."),
    limit: int = typer.Option(50, "--limit", min=1, max=200),
    token: Optional[str] = typer.Option(None, "--token", help="API token."),
    ai_agents_url: Optional[str] = typer.Option(None, "--ai-agents-url", help="AI Agents base URL."),
    account_uid: Optional[str] = typer.Option(None, "--account-uid", help="Organization/account UID context."),
    raw: bool = typer.Option(False, "--raw", help="Print raw JSON output."),
) -> None:
    """List live monitoring targets."""
    client = _make_client(token=token, ai_agents_url=ai_agents_url)
    payload = client.evals_list_live_targets(
        window=window,
        limit=limit,
        account_uid=account_uid,
    )
    if raw:
        console.print(payload)
        return
    targets = payload.get("targets") or []
    table = Table(title=f"Live Eval Targets ({len(targets)})")
    table.add_column("Target", style="cyan")
    table.add_column("Type", style="white")
    table.add_column("Events", style="white")
    table.add_column("Pass Rate", style="white")
    table.add_column("Avg Value", style="white")
    table.add_column("Last Event", style="white")
    for item in targets:
        pass_rate = item.get("pass_rate")
        pass_rate_text = (
            f"{float(pass_rate) * 100:.1f}%"
            if isinstance(pass_rate, (int, float))
            else "n/a"
        )
        table.add_row(
            str(item.get("target_id", "")),
            str(item.get("target_type", "")),
            str(item.get("event_count", 0)),
            pass_rate_text,
            str(item.get("avg_value", "n/a")),
            str(item.get("last_event_at", "")),
        )
    console.print(table)


app.add_typer(evals_app)
app.add_typer(experiments_app)
app.add_typer(runs_app)
app.add_typer(live_app)
