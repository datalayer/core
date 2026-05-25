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
    help="Launch and monitor SaaS evalsets, experiments, runs, and live monitoring.",
    invoke_without_command=True,
)

evals_app = typer.Typer(name="evals", help="Manage evalsets.")
experiments_app = typer.Typer(name="experiments", help="Manage evalset experiments.")
runs_app = typer.Typer(name="runs", help="Launch and monitor evalset runs.")
live_app = typer.Typer(name="live", help="Inspect live evalset monitoring.")

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


def _run_pass_rate(run: dict[str, Any]) -> float | None:
    metrics = run.get("metrics") or {}
    raw = metrics.get("pass_rate")
    if isinstance(raw, (int, float)):
        value = float(raw)
        if value < 0:
            return 0.0
        if value > 1:
            return 1.0
        return value
    return None


def _fmt_pct(raw: float | None) -> str:
    if raw is None:
        return "n/a"
    return f"{raw * 100:.1f}%"


def _compute_baseline_and_drift(runs: list[dict[str, Any]]) -> tuple[float | None, float | None, float | None]:
    pass_rates = [rate for rate in (_run_pass_rate(run) for run in runs) if rate is not None]
    if not pass_rates:
        return None, None, None
    baseline_size = min(3, max(1, len(pass_rates) // 2))
    baseline_slice = pass_rates[:baseline_size]
    baseline = sum(baseline_slice) / baseline_size
    latest = pass_rates[-1]
    drift = latest - baseline
    return baseline, latest, drift


def _run_detail_record(run: dict[str, Any]) -> dict[str, Any]:
    metrics = run.get("metrics") if isinstance(run.get("metrics"), dict) else {}
    summary = run.get("summary") if isinstance(run.get("summary"), dict) else {}
    report = run.get("report") if isinstance(run.get("report"), dict) else {}
    return {
        "id": str(run.get("id", "")),
        "status": str(run.get("status", "")),
        "created_at": str(run.get("created_at", "")),
        "updated_at": str(run.get("updated_at", "")),
        "pass_rate": _run_pass_rate(run),
        "metrics": metrics,
        "summary": summary,
        "report": report,
    }


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
    run_environment: Optional[str] = typer.Option(None, "--run-environment", help="Filter by run environment (ui/sdk)."),
    kind: Optional[str] = typer.Option(None, "--kind", help="Filter by kind (batch/interactive)."),
    q: Optional[str] = typer.Option(None, "--q", help="Search query."),
    limit: int = typer.Option(50, "--limit", min=1, max=200),
    offset: int = typer.Option(0, "--offset", min=0),
    raw: bool = typer.Option(False, "--raw", help="Print raw JSON output."),
) -> None:
    """List evalsets."""
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

    evalsets = payload.get("evalsets") or []
    table = Table(title=f"Evals ({len(evalsets)})")
    table.add_column("ID", style="cyan")
    table.add_column("Name", style="white")
    table.add_column("Run Environment", style="white")
    table.add_column("Kind", style="white")
    table.add_column("Cases", style="white")
    table.add_column("Updated", style="white")
    for item in evalsets:
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
    name: str = typer.Argument(..., help="Evalset name."),
    description: str = typer.Option("", "--description", help="Evalset description."),
    run_environment: str = typer.Option("sdk", "--run-environment", help="Evalset run environment (ui/sdk)."),
    kind: str = typer.Option("batch", "--kind", help="Evalset kind (batch/interactive)."),
    schema_json: Optional[str] = typer.Option(None, "--schema-json", help="Schema JSON object."),
    metadata_json: Optional[str] = typer.Option(None, "--metadata-json", help="Metadata JSON object."),
    cases_file: Optional[str] = typer.Option(None, "--cases-file", help="Path to JSON array of cases."),
    tags: list[str] = typer.Option([], "--tag", help="Repeatable tag."),
    token: Optional[str] = typer.Option(None, "--token", help="API token."),
    ai_agents_url: Optional[str] = typer.Option(None, "--ai-agents-url", help="AI Agents base URL."),
    account_uid: Optional[str] = typer.Option(None, "--account-uid", help="Organization/account UID context."),
) -> None:
    """Create an evalset."""
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
    eval_record = payload.get("evalset") or {}
    console.print(f"[green]Eval created:[/green] {eval_record.get('id', '')} ({eval_record.get('name', '')})")


@evals_app.command(name="delete")
def evals_delete(
    evalset_id: str = typer.Argument(..., help="Evalset ID."),
    token: Optional[str] = typer.Option(None, "--token", help="API token."),
    ai_agents_url: Optional[str] = typer.Option(None, "--ai-agents-url", help="AI Agents base URL."),
    account_uid: Optional[str] = typer.Option(None, "--account-uid", help="Organization/account UID context."),
) -> None:
    """Delete an evalset (cascade delete runs/experiments)."""
    client = _make_client(token=token, ai_agents_url=ai_agents_url)
    payload = client.evals_delete_eval(evalset_id, account_uid=account_uid)
    cascade = payload.get("cascade") or {}
    console.print(
        "[green]Eval deleted.[/green] "
        f"experiments={cascade.get('experiments_deleted', 0)} "
        f"runs={cascade.get('runs_deleted', 0)} "
        f"cases={cascade.get('cases_deleted', 0)}"
    )


@evals_app.command(name="compare-report")
def evals_compare_report(
    evalset_id: str = typer.Argument(..., help="Evalset ID to compare."),
    run_limit: int = typer.Option(50, "--run-limit", min=2, max=200, help="Runs fetched per experiment."),
    token: Optional[str] = typer.Option(None, "--token", help="API token."),
    ai_agents_url: Optional[str] = typer.Option(None, "--ai-agents-url", help="AI Agents base URL."),
    account_uid: Optional[str] = typer.Option(None, "--account-uid", help="Organization/account UID context."),
    raw: bool = typer.Option(False, "--raw", help="Print raw JSON report output."),
) -> None:
    """Generate a full comparison report for a specific evalset.

    The report includes:
    - Experiment-level summary (run count, latest pass rate, baseline, drift)
    - Full fetched run details per experiment
    - Per-experiment run comparisons (latest-two and consecutive run deltas)
    """
    client = _make_client(token=token, ai_agents_url=ai_agents_url)
    experiments_payload = client.evals_list_experiments(
        evalset_id=evalset_id,
        limit=200,
        offset=0,
        account_uid=account_uid,
    )
    experiments = experiments_payload.get("experiments") or []
    if not experiments:
        console.print(f"[yellow]No experiments found for evalset[/yellow] {evalset_id}")
        raise typer.Exit(0)

    report: dict[str, Any] = {
        "evalset_id": evalset_id,
        "generated_at": _now_iso(),
        "experiments": [],
    }

    summary_table = Table(title=f"Evalset Comparison Report ({evalset_id})")
    summary_table.add_column("Experiment", style="cyan")
    summary_table.add_column("Runs", style="white")
    summary_table.add_column("Latest", style="white")
    summary_table.add_column("Baseline", style="white")
    summary_table.add_column("Drift", style="white")
    summary_table.add_column("Latest 2 Delta (A-B)", style="white")

    for experiment in experiments:
        experiment_id = str(experiment.get("id", ""))
        experiment_name = str(experiment.get("name", experiment_id))

        runs_payload = client.evals_list_runs(
            experiment_id,
            limit=run_limit,
            offset=0,
            account_uid=account_uid,
        )
        runs = runs_payload.get("runs") or []
        total_runs = int(runs_payload.get("total") or len(runs))
        baseline, latest, drift = _compute_baseline_and_drift(runs)

        latest_two_delta: float | None = None
        latest_two_run_ids: list[str] = []
        latest_two_compare: dict[str, Any] | None = None
        if len(runs) >= 2:
            latest_two_run_ids = [str(runs[0].get("id", "")), str(runs[1].get("id", ""))]
            compare_payload = client.evals_compare_runs(
                latest_two_run_ids,
                account_uid=account_uid,
            )
            compared_runs = compare_payload.get("runs") or []
            compared_by_id = {
                str(run.get("id", "")): run
                for run in compared_runs
                if isinstance(run, dict)
            }
            run_a = compared_by_id.get(latest_two_run_ids[0], runs[0])
            run_b = compared_by_id.get(latest_two_run_ids[1], runs[1])
            pass_a = _run_pass_rate(run_a)
            pass_b = _run_pass_rate(run_b)
            if pass_a is not None and pass_b is not None:
                latest_two_delta = pass_a - pass_b
            latest_two_compare = {
                "run_ids": latest_two_run_ids,
                "run_a": _run_detail_record(run_a),
                "run_b": _run_detail_record(run_b),
                "delta_pass_rate": latest_two_delta,
            }

        consecutive_comparisons: list[dict[str, Any]] = []
        for idx in range(max(0, len(runs) - 1)):
            run_a = runs[idx]
            run_b = runs[idx + 1]
            pass_a = _run_pass_rate(run_a)
            pass_b = _run_pass_rate(run_b)
            delta = None
            if pass_a is not None and pass_b is not None:
                delta = pass_a - pass_b
            consecutive_comparisons.append(
                {
                    "run_a_id": str(run_a.get("id", "")),
                    "run_b_id": str(run_b.get("id", "")),
                    "run_a_status": str(run_a.get("status", "")),
                    "run_b_status": str(run_b.get("status", "")),
                    "run_a_pass_rate": pass_a,
                    "run_b_pass_rate": pass_b,
                    "delta_pass_rate": delta,
                }
            )

        drift_text = "n/a" if drift is None else f"{drift * 100:+.1f} pts"
        latest_two_text = "n/a" if latest_two_delta is None else f"{latest_two_delta * 100:+.1f} pts"

        summary_table.add_row(
            experiment_name,
            str(total_runs),
            _fmt_pct(latest),
            _fmt_pct(baseline),
            drift_text,
            latest_two_text,
        )

        report["experiments"].append(
            {
                "id": experiment_id,
                "name": experiment_name,
                "runs_total": total_runs,
                "runs_fetched": len(runs),
                "latest_pass_rate": latest,
                "baseline_pass_rate": baseline,
                "drift_delta": drift,
                "latest_two_run_ids": latest_two_run_ids,
                "latest_two_delta": latest_two_delta,
                "latest_two_comparison": latest_two_compare,
                "runs": [_run_detail_record(run) for run in runs],
                "consecutive_comparisons": consecutive_comparisons,
            }
        )

    if raw:
        console.print(report)
        return

    console.print(summary_table)
    for experiment_report in report.get("experiments", []):
        experiment_name = str(experiment_report.get("name", ""))
        runs_fetched = int(experiment_report.get("runs_fetched") or 0)
        runs_total = int(experiment_report.get("runs_total") or 0)

        run_details_table = Table(
            title=(
                f"Run Details - {experiment_name} "
                f"(fetched {runs_fetched} of {runs_total})"
            )
        )
        run_details_table.add_column("Run", style="cyan")
        run_details_table.add_column("Status", style="white")
        run_details_table.add_column("Pass Rate", style="white")
        run_details_table.add_column("Launch Source", style="white")
        run_details_table.add_column("Execution Target", style="white")
        run_details_table.add_column("Created", style="white")

        for run in experiment_report.get("runs") or []:
            summary = run.get("summary") or {}
            status_value = str(run.get("status", ""))
            run_details_table.add_row(
                str(run.get("id", "")),
                f"[{_status_style(status_value)}]{status_value}[/{_status_style(status_value)}]",
                _fmt_pct(run.get("pass_rate") if isinstance(run.get("pass_rate"), (int, float)) else None),
                str(summary.get("launch_source") or ""),
                str(summary.get("execution_target") or ""),
                str(run.get("created_at") or ""),
            )
        console.print(run_details_table)

        comparisons = experiment_report.get("consecutive_comparisons") or []
        if comparisons:
            compare_table = Table(title=f"Run Comparisons - {experiment_name} (A-B, consecutive)")
            compare_table.add_column("Run A", style="cyan")
            compare_table.add_column("Run B", style="cyan")
            compare_table.add_column("A Status", style="white")
            compare_table.add_column("B Status", style="white")
            compare_table.add_column("A Pass", style="white")
            compare_table.add_column("B Pass", style="white")
            compare_table.add_column("Delta", style="white")
            for item in comparisons:
                delta = item.get("delta_pass_rate")
                compare_table.add_row(
                    str(item.get("run_a_id", "")),
                    str(item.get("run_b_id", "")),
                    str(item.get("run_a_status", "")),
                    str(item.get("run_b_status", "")),
                    _fmt_pct(item.get("run_a_pass_rate") if isinstance(item.get("run_a_pass_rate"), (int, float)) else None),
                    _fmt_pct(item.get("run_b_pass_rate") if isinstance(item.get("run_b_pass_rate"), (int, float)) else None),
                    "n/a" if not isinstance(delta, (int, float)) else f"{float(delta) * 100:+.1f} pts",
                )
            console.print(compare_table)

    console.print("[dim]Notes: drift = latest - baseline (baseline is avg of first runs in fetched window); latest-2 delta = A - B.[/dim]")


@experiments_app.command(name="list")
def experiments_list(
    evalset_id: Optional[str] = typer.Option(None, "--evalset-id", help="Filter by evalset ID."),
    status: Optional[str] = typer.Option(None, "--status", help="Filter by status."),
    limit: int = typer.Option(50, "--limit", min=1, max=200),
    offset: int = typer.Option(0, "--offset", min=0),
    token: Optional[str] = typer.Option(None, "--token", help="API token."),
    ai_agents_url: Optional[str] = typer.Option(None, "--ai-agents-url", help="AI Agents base URL."),
    account_uid: Optional[str] = typer.Option(None, "--account-uid", help="Organization/account UID context."),
    raw: bool = typer.Option(False, "--raw", help="Print raw JSON output."),
) -> None:
    """List evalset experiments."""
    client = _make_client(token=token, ai_agents_url=ai_agents_url)
    payload = client.evals_list_experiments(
        evalset_id=evalset_id,
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
            str(item.get("evalset_id", "")),
            f"[{_status_style(status_value)}]{status_value}[/{_status_style(status_value)}]",
            str(item.get("updated_at", "")),
        )
    console.print(table)


@experiments_app.command(name="create")
def experiments_create(
    name: str = typer.Argument(..., help="Experiment name."),
    evalset_id: Optional[str] = typer.Option(None, "--evalset-id", help="Evalset ID."),
    description: str = typer.Option("", "--description", help="Description."),
    status: str = typer.Option("draft", "--status", help="Initial status."),
    config_json: Optional[str] = typer.Option(None, "--config-json", help="Config JSON object."),
    summary_json: Optional[str] = typer.Option(None, "--summary-json", help="Summary JSON object."),
    tags: list[str] = typer.Option([], "--tag", help="Repeatable tag."),
    token: Optional[str] = typer.Option(None, "--token", help="API token."),
    ai_agents_url: Optional[str] = typer.Option(None, "--ai-agents-url", help="AI Agents base URL."),
    account_uid: Optional[str] = typer.Option(None, "--account-uid", help="Organization/account UID context."),
) -> None:
    """Create an evalset experiment."""
    client = _make_client(token=token, ai_agents_url=ai_agents_url)
    payload = client.evals_create_experiment(
        name=name,
        evalset_id=evalset_id,
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
    """Launch an evalset run on SaaS and tag it as CLI-launched."""
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
