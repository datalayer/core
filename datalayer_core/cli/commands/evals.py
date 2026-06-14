# Copyright (c) 2023-2026 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""Evals commands for Datalayer CLI."""

from __future__ import annotations

from datetime import datetime, timezone
import csv
import json
import math
import re
import time
from pathlib import Path
from typing import Any, Optional

import typer
from rich.console import Console
from rich.table import Table
from rich.tree import Tree

from datalayer_core.client.client import DatalayerClient
from datalayer_core.utils.urls import DatalayerURLs

app = typer.Typer(
    name="evals",
    help="Launch and monitor SaaS evalsets, experiments, runs, and live monitoring.",
    invoke_without_command=True,
)

evals_app = typer.Typer(name="evalsets", help="Manage evalsets.")
experiments_app = typer.Typer(name="experiments", help="Manage evalset experiments.")
runs_app = typer.Typer(name="runs", help="Launch and monitor evalset runs.")
live_app = typer.Typer(name="live", help="Inspect live evalset monitoring.")

console = Console()


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _timestamp_slug(raw_iso: str) -> str:
    cleaned = raw_iso.replace("-", "").replace(":", "").replace(".", "")
    cleaned = cleaned.replace("+0000", "Z").replace("+00:00", "Z")
    cleaned = cleaned.replace("T", "T")
    if cleaned.endswith("Z"):
        return cleaned
    return f"{cleaned}Z"


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
    api_key: Optional[str] = None,
) -> DatalayerClient:
    urls = DatalayerURLs.from_environment()
    return DatalayerClient(urls=urls, token=(token or api_key))


def _resolve_billable_account_uid(
    billable_account_uid: Optional[str],
    account_uid: Optional[str],
) -> Optional[str]:
    """Resolve billable account UID with backwards-compatible fallback."""
    return billable_account_uid or account_uid


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


def _style_text(value: str, style: str | None, colorize: bool) -> str:
    if not colorize or not style:
        return value
    return f"[{style}]{value}[/{style}]"


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


def _classify_legacy_failure(message: str) -> dict[str, Any]:
    """Infer a structured stage/type/url from a free-form legacy error message.

    Older runs (and any path that only persisted a plain error string) lack a
    structured ``failure_cause``. Rather than rendering ``unknown`` /
    ``legacy_error`` with an empty detail excerpt, classify the most common
    error shapes so the report stays actionable.
    """
    text = message.strip()
    lowered = text.lower()

    url_match = re.search(r"https?://[^\s]+", text)
    execution_url = url_match.group(0).rstrip(".,)") if url_match else ""

    stage = "unknown"
    failure_type = "legacy_error"
    if "all connection attempts failed" in lowered or "connection refused" in lowered or "request failed" in lowered:
        stage = "runtime_execution"
        failure_type = "runtime_unreachable"
    elif "returned http" in lowered or re.search(r"\bhttp\s*[45]\d\d\b", lowered):
        stage = "runtime_execution"
        failure_type = "runtime_http_error"
    elif "traceback" in lowered:
        stage = "runtime_execution"
        failure_type = "runtime_traceback"
    elif "no submitted code" in lowered or "missing" in lowered and "code" in lowered:
        stage = "run_preparation"
        failure_type = "missing_submitted_code"
    elif "no interactive runtime url" in lowered or "not configured" in lowered:
        stage = "runtime_resolution"
        failure_type = "no_runtime_url"

    cause: dict[str, Any] = {
        "stage": stage,
        "type": failure_type,
        "message": text,
        "detail_excerpt": text,
    }
    if execution_url:
        cause["execution_url"] = execution_url
    return cause


def _extract_failure_cause(run: dict[str, Any]) -> dict[str, Any] | None:
    """Extract a structured failure cause from a run's report/summary payload."""
    for container_key in ("report", "summary"):
        container = run.get(container_key)
        if isinstance(container, dict):
            cause = container.get("failure_cause")
            if isinstance(cause, dict) and cause:
                return cause
    # Fallback: synthesize a structured cause from legacy error fields.
    summary = run.get("summary") if isinstance(run.get("summary"), dict) else {}
    report = run.get("report") if isinstance(run.get("report"), dict) else {}
    message = (
        summary.get("failure_reason")
        or summary.get("execution_error")
        or report.get("error")
    )
    if isinstance(message, str) and message.strip():
        return _classify_legacy_failure(message)
    return None


def _format_failure_cause(cause: dict[str, Any] | None) -> str:
    """Render a failure cause as a concise single-line string."""
    if not isinstance(cause, dict) or not cause:
        return ""
    failure_type = str(cause.get("type") or "").strip()
    message = str(cause.get("message") or "").strip()
    parts: list[str] = []
    if failure_type:
        parts.append(f"[{failure_type}]")
    if message:
        parts.append(message)
    return " ".join(parts).strip()


def _failure_cause_detail_lines(cause: dict[str, Any]) -> list[str]:
    """Render the full failure cause (message, context, diagnostics, attempts) as markdown lines."""
    lines: list[str] = []
    message = str(cause.get("message") or "").strip()
    if message:
        lines.append(f"- Message: {message}")
    for key, label in (
        ("stage", "Stage"),
        ("type", "Type"),
        ("runtime_pod_name", "Runtime pod"),
        ("environment_name", "Environment"),
        ("execution_url", "Execution URL"),
    ):
        value = str(cause.get(key) or "").strip()
        if value:
            lines.append(f"- {label}: `{value}`")

    detail = str(cause.get("detail_excerpt") or "").strip()
    if detail:
        lines.append("- Detail excerpt:")
        lines.append("")
        lines.append("```text")
        lines.extend(detail.splitlines() or [detail])
        lines.append("```")

    diagnostics = cause.get("diagnostics")
    if isinstance(diagnostics, dict) and diagnostics:
        for key, label in (
            ("agent_runtimes_url", "Agent runtimes URL"),
            ("run_url", "Run URL"),
        ):
            value = diagnostics.get(key)
            if value:
                lines.append(f"- {label}: `{value}`")
        for key, label in (
            ("route_ids", "Route IDs tried"),
            ("discovered_agent_ids", "Discovered agent IDs"),
            ("candidate_urls", "Candidate URLs"),
        ):
            value = diagnostics.get(key)
            if isinstance(value, list) and value:
                rendered = ", ".join(f"`{item}`" for item in value)
                lines.append(f"- {label}: {rendered}")

        attempts = diagnostics.get("attempts")
        if isinstance(attempts, list) and attempts:
            lines.append("- Connection attempts:")
            attempt_rows: list[list[str]] = []
            for attempt in attempts:
                if not isinstance(attempt, dict):
                    continue
                status_code = attempt.get("status_code")
                attempt_rows.append(
                    [
                        str(attempt.get("url") or "-"),
                        "ok" if attempt.get("ok") else "failed",
                        "-" if status_code is None else str(status_code),
                        str(attempt.get("error") or "-"),
                    ]
                )
            if attempt_rows:
                lines.append("")
                lines.extend(
                    _markdown_table(
                        ["URL", "Result", "HTTP", "Error"],
                        attempt_rows,
                        ["left", "left", "right", "left"],
                    )
                )
    return lines


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
        "failure_cause": _extract_failure_cause(run),
    }


def _report_data(
    client: DatalayerClient,
    evalset_id: str,
    run_limit: int,
    account_uid: Optional[str],
) -> dict[str, Any]:
    experiments_payload = client.evals_list_experiments(
        evalset_id=evalset_id,
        limit=200,
        offset=0,
        account_uid=account_uid,
    )
    experiments = experiments_payload.get("experiments") or []

    report: dict[str, Any] = {
        "evalset_id": evalset_id,
        "generated_at": _now_iso(),
        "experiments": [],
    }

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

        pass_rates = [
            _run_pass_rate(run)
            for run in runs
            if isinstance(_run_pass_rate(run), (int, float))
        ]
        numeric_pass_rates = [float(value) for value in pass_rates if isinstance(value, (int, float))]
        mean_pass = sum(numeric_pass_rates) / len(numeric_pass_rates) if numeric_pass_rates else None
        stddev_pass = None
        if numeric_pass_rates:
            variance = sum((value - mean_pass) ** 2 for value in numeric_pass_rates) / len(numeric_pass_rates)
            stddev_pass = math.sqrt(variance)

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
                "mean_pass_rate": mean_pass,
                "stddev_pass_rate": stddev_pass,
                "runs": [_run_detail_record(run) for run in runs],
                "consecutive_comparisons": consecutive_comparisons,
            }
        )
    return report


def _ascii_bar(
    value: float | None,
    width: int = 28,
    *,
    full_blocks: bool = True,
    colorize: bool = False,
) -> str:
    if value is None:
        return "-"
    bounded = max(0.0, min(1.0, float(value)))
    filled = int(round(bounded * width))
    fill_char = "█" if full_blocks else "#"
    empty_char = "░" if full_blocks else "."
    filled_part = fill_char * filled
    empty_part = empty_char * (width - filled)
    if not colorize:
        return filled_part + empty_part
    if bounded >= 0.85:
        style = "green"
    elif bounded >= 0.75:
        style = "yellow"
    else:
        style = "red"
    return _style_text(filled_part, style, True) + _style_text(empty_part, "grey39", True)


def _fmt_pts(value: float) -> str:
    return f"{value * 100:.1f}"


def _ascii_histogram(
    values: list[float],
    *,
    bins: int = 8,
    width: int = 22,
    min_value: float | None = None,
    max_value: float | None = None,
    full_blocks: bool = True,
    colorize: bool = False,
    drift_palette: bool = False,
) -> list[str]:
    if not values:
        return ["n/a"]

    lo = min_value if isinstance(min_value, (int, float)) else min(values)
    hi = max_value if isinstance(max_value, (int, float)) else max(values)
    if hi <= lo:
        hi = lo + 1e-9

    bins = max(2, bins)
    counts = [0 for _ in range(bins)]
    span = hi - lo
    for value in values:
        ratio = (value - lo) / span
        idx = int(ratio * bins)
        idx = max(0, min(bins - 1, idx))
        counts[idx] += 1

    peak = max(counts) if counts else 1
    fill_char = "█" if full_blocks else "#"
    empty_char = "░" if full_blocks else "."
    lines: list[str] = []
    for idx, count in enumerate(counts):
        left = lo + (span * idx / bins)
        right = lo + (span * (idx + 1) / bins)
        filled = int(round((count / peak) * width)) if peak > 0 else 0
        filled_part = fill_char * filled
        empty_part = empty_char * (width - filled)
        if colorize:
            if drift_palette:
                if right <= 0:
                    bar_style = "red"
                elif left >= 0:
                    bar_style = "green"
                else:
                    bar_style = "yellow"
            elif peak > 0 and count / peak >= 0.67:
                bar_style = "cyan"
            elif peak > 0 and count / peak >= 0.34:
                bar_style = "blue"
            else:
                bar_style = "magenta"
            bar = _style_text(filled_part, bar_style, True) + _style_text(empty_part, "grey39", True)
        else:
            bar = filled_part + empty_part
        lines.append(
            f"{_fmt_pts(left):>6} to {_fmt_pts(right):>6} pts |{bar}| {count}"
        )
    return lines


def _fmt_delta(value: float | None, *, colorize: bool = False) -> str:
    if value is None:
        return "n/a"
    rendered = f"{value * 100:+.1f} pts"
    if value > 0:
        return _style_text(rendered, "green", colorize)
    if value < 0:
        return _style_text(rendered, "red", colorize)
    return _style_text(rendered, "yellow", colorize)


def _sparkline(values: list[float], *, colorize: bool = False) -> str:
    if not values:
        return "n/a"
    ticks = "▁▂▃▄▅▆▇█"
    lo = min(values)
    hi = max(values)
    if hi <= lo:
        base = ticks[-2] * len(values)
    else:
        span = hi - lo
        chars = []
        for value in values:
            idx = int(round(((value - lo) / span) * (len(ticks) - 1)))
            idx = max(0, min(len(ticks) - 1, idx))
            chars.append(ticks[idx])
        base = "".join(chars)
    if not colorize:
        return base
    if values[-1] >= 0.85:
        style = "green"
    elif values[-1] >= 0.75:
        style = "yellow"
    else:
        style = "red"
    return _style_text(base, style, True)


def _pairwise_latest_deltas(experiments: list[dict[str, Any]]) -> list[dict[str, Any]]:
    pairs: list[dict[str, Any]] = []
    for idx, left in enumerate(experiments):
        left_latest = left.get("latest_pass_rate")
        if not isinstance(left_latest, (int, float)):
            continue
        for right in experiments[idx + 1 :]:
            right_latest = right.get("latest_pass_rate")
            if not isinstance(right_latest, (int, float)):
                continue
            pairs.append(
                {
                    "left": str(left.get("name", "")),
                    "right": str(right.get("name", "")),
                    "left_latest": float(left_latest),
                    "right_latest": float(right_latest),
                    "delta": float(left_latest) - float(right_latest),
                }
            )
    pairs.sort(key=lambda item: abs(item["delta"]), reverse=True)
    return pairs


def _markdown_table(headers: list[str], rows: list[list[str]], aligns: list[str]) -> list[str]:
    widths = [len(header) for header in headers]
    for row in rows:
        for idx, cell in enumerate(row):
            widths[idx] = max(widths[idx], len(cell))

    def _pad(cell: str, width: int, align: str) -> str:
        if align == "right":
            return cell.rjust(width)
        return cell.ljust(width)

    header_line = "| " + " | ".join(headers[idx].ljust(widths[idx]) for idx in range(len(headers))) + " |"

    sep_parts: list[str] = []
    for idx, align in enumerate(aligns):
        width = max(3, widths[idx])
        if align == "right":
            sep_parts.append("-" * (width - 1) + ":")
        else:
            sep_parts.append(":" + "-" * (width - 1))
    sep_line = "| " + " | ".join(sep_parts) + " |"

    body_lines = [
        "| " + " | ".join(_pad(row[idx], widths[idx], aligns[idx]) for idx in range(len(headers))) + " |"
        for row in rows
    ]
    return [header_line, sep_line, *body_lines]


def _report_markdown(report: dict[str, Any], run_limit: int, *, colorize: bool = False) -> str:
    evalset_id = str(report.get("evalset_id", ""))
    generated_at = str(report.get("generated_at", ""))
    experiments = [item for item in (report.get("experiments") or []) if isinstance(item, dict)]

    lines: list[str] = []
    lines.append(f"# Evals Report: {evalset_id}")
    lines.append("")
    lines.append(f"- Generated at: {generated_at}")
    lines.append(f"- Experiments: {len(experiments)}")
    lines.append(f"- Run window per experiment: {run_limit}")
    lines.append("")

    lines.append("## Experiment Overview")
    lines.append("")
    overview_rows: list[list[str]] = []
    for experiment in experiments:
        runs_fetched = int(experiment.get("runs_fetched") or 0)
        runs_total = int(experiment.get("runs_total") or 0)
        overview_rows.append(
            [
                f"{experiment.get('name', '')}",
                f"{runs_fetched}/{runs_total}",
                _fmt_pct(experiment.get('latest_pass_rate') if isinstance(experiment.get('latest_pass_rate'), (int, float)) else None),
                _fmt_pct(experiment.get('baseline_pass_rate') if isinstance(experiment.get('baseline_pass_rate'), (int, float)) else None),
                _fmt_delta(experiment.get('drift_delta') if isinstance(experiment.get('drift_delta'), (int, float)) else None, colorize=colorize),
                _fmt_delta(experiment.get('latest_two_delta') if isinstance(experiment.get('latest_two_delta'), (int, float)) else None, colorize=colorize),
            ]
        )
    lines.extend(
        _markdown_table(
            ["Experiment", "Runs (fetched/total)", "Latest", "Baseline", "Drift", "Latest-2 Delta"],
            overview_rows,
            ["left", "right", "right", "right", "right", "right"],
        )
    )
    lines.append("")

    lines.append("## Comparison Combinations")
    lines.append("")

    ranked_latest = sorted(
        [item for item in experiments if isinstance(item.get("latest_pass_rate"), (int, float))],
        key=lambda item: float(item.get("latest_pass_rate") or 0.0),
        reverse=True,
    )
    lines.append("### By Latest Pass Rate")
    lines.append("")
    latest_rows: list[list[str]] = []
    for idx, item in enumerate(ranked_latest, start=1):
        latest_rows.append([str(idx), f"{item.get('name', '')}", _fmt_pct(float(item.get('latest_pass_rate') or 0.0))])
    lines.extend(_markdown_table(["Rank", "Experiment", "Latest"], latest_rows, ["right", "left", "right"]))
    latest_values = [
        float(item.get("latest_pass_rate"))
        for item in ranked_latest
        if isinstance(item.get("latest_pass_rate"), (int, float))
    ]
    lines.append("")
    lines.append("Latest pass-rate histogram (pts):")
    for hist_line in _ascii_histogram(
        latest_values,
        bins=8,
        width=20,
        min_value=0.0,
        max_value=1.0,
        full_blocks=True,
        colorize=colorize,
    ):
        lines.append(f"`{hist_line}`")
    lines.append("")

    ranked_drift = sorted(
        [item for item in experiments if isinstance(item.get("drift_delta"), (int, float))],
        key=lambda item: float(item.get("drift_delta") or 0.0),
    )
    lines.append("### By Drift (Most Negative To Most Positive)")
    lines.append("")
    drift_rows: list[list[str]] = []
    for idx, item in enumerate(ranked_drift, start=1):
        drift_rows.append([str(idx), f"{item.get('name', '')}", _fmt_delta(float(item.get('drift_delta') or 0.0), colorize=colorize)])
    lines.extend(_markdown_table(["Rank", "Experiment", "Drift"], drift_rows, ["right", "left", "right"]))
    drift_values = [
        float(item.get("drift_delta"))
        for item in ranked_drift
        if isinstance(item.get("drift_delta"), (int, float))
    ]
    lines.append("")
    lines.append("Drift histogram (delta pts):")
    for hist_line in _ascii_histogram(
        drift_values,
        bins=8,
        width=20,
        full_blocks=True,
        colorize=colorize,
        drift_palette=True,
    ):
        lines.append(f"`{hist_line}`")
    lines.append("")

    ranked_stability = sorted(
        [item for item in experiments if isinstance(item.get("stddev_pass_rate"), (int, float))],
        key=lambda item: float(item.get("stddev_pass_rate") or 0.0),
    )
    lines.append("### By Stability (Lowest Pass-Rate StdDev)")
    lines.append("")
    stability_rows: list[list[str]] = []
    for idx, item in enumerate(ranked_stability, start=1):
        stddev = item.get("stddev_pass_rate")
        mean = item.get("mean_pass_rate")
        stability_rows.append(
            [
                str(idx),
                f"{item.get('name', '')}",
                (f"{float(stddev) * 100:.2f} pts" if isinstance(stddev, (int, float)) else "n/a"),
                (_fmt_pct(float(mean)) if isinstance(mean, (int, float)) else "n/a"),
            ]
        )
    lines.extend(_markdown_table(["Rank", "Experiment", "StdDev", "Mean"], stability_rows, ["right", "left", "right", "right"]))
    lines.append("")

    pairwise = _pairwise_latest_deltas(experiments)
    lines.append("### Pairwise Latest-Pass Deltas")
    lines.append("")
    pair_rows: list[list[str]] = []
    for pair in pairwise:
        pair_rows.append(
            [
                f"{pair['left']} vs {pair['right']}",
                _fmt_pct(pair['left_latest']),
                _fmt_pct(pair['right_latest']),
                _fmt_delta(pair['delta'], colorize=colorize),
            ]
        )
    if not pairwise:
        pair_rows.append(["n/a", "n/a", "n/a", "n/a"])
    lines.extend(
        _markdown_table(
            ["Pair", "Left Latest", "Right Latest", "Delta (Left-Right)"],
            pair_rows,
            ["left", "right", "right", "right"],
        )
    )
    pair_deltas = [float(pair["delta"]) for pair in pairwise if isinstance(pair.get("delta"), (int, float))]
    lines.append("")
    lines.append("Pairwise latest-delta histogram (pts):")
    for hist_line in _ascii_histogram(
        pair_deltas,
        bins=8,
        width=20,
        full_blocks=True,
        colorize=colorize,
        drift_palette=True,
    ):
        lines.append(f"`{hist_line}`")
    lines.append("")

    lines.append("### Insight Highlights")
    lines.append("")
    best_latest = ranked_latest[0] if ranked_latest else None
    worst_latest = ranked_latest[-1] if ranked_latest else None
    most_negative = ranked_drift[0] if ranked_drift else None
    most_positive = ranked_drift[-1] if ranked_drift else None
    most_stable = ranked_stability[0] if ranked_stability else None
    if best_latest:
        lines.append(
            "- Top latest pass-rate: "
            + f"{best_latest.get('name', '')} ({_fmt_pct(float(best_latest.get('latest_pass_rate') or 0.0))})."
        )
    if worst_latest:
        lines.append(
            "- Lowest latest pass-rate: "
            + f"{worst_latest.get('name', '')} ({_fmt_pct(float(worst_latest.get('latest_pass_rate') or 0.0))})."
        )
    if most_positive:
        drift_pos = float(most_positive.get("drift_delta") or 0.0)
        lines.append(
            "- Strongest positive drift: "
            + f"{most_positive.get('name', '')} ({_fmt_delta(drift_pos, colorize=colorize)})."
        )
    if most_negative:
        drift_neg = float(most_negative.get("drift_delta") or 0.0)
        lines.append(
            "- Strongest negative drift: "
            + f"{most_negative.get('name', '')} ({_fmt_delta(drift_neg, colorize=colorize)})."
        )
    if most_stable:
        std = most_stable.get("stddev_pass_rate")
        mean = most_stable.get("mean_pass_rate")
        lines.append(
            "- Stability leader: "
            + f"{most_stable.get('name', '')} "
            + f"(stddev={(float(std) * 100):.2f} pts, mean={_fmt_pct(float(mean)) if isinstance(mean, (int, float)) else 'n/a'})."
        )

    drift_neg_count = len([value for value in drift_values if value < 0])
    drift_flat_count = len([value for value in drift_values if value == 0])
    drift_pos_count = len([value for value in drift_values if value > 0])
    total = max(1, drift_neg_count + drift_flat_count + drift_pos_count)
    neg_meter = "█" * int(round((drift_neg_count / total) * 14))
    flat_meter = "█" * int(round((drift_flat_count / total) * 14))
    pos_meter = "█" * int(round((drift_pos_count / total) * 14))
    neg_meter = neg_meter or "·"
    flat_meter = flat_meter or "·"
    pos_meter = pos_meter or "·"
    lines.append("")
    lines.append("Drift balance meter:")
    lines.append(
        "`NEG "
        + _style_text(neg_meter, "red", colorize)
        + f" ({drift_neg_count}) | FLAT "
        + _style_text(flat_meter, "yellow", colorize)
        + f" ({drift_flat_count}) | POS "
        + _style_text(pos_meter, "green", colorize)
        + f" ({drift_pos_count})`"
    )
    lines.append("")

    lines.append("## Per-Experiment Details")
    lines.append("")
    for experiment in experiments:
        lines.append(f"### {experiment.get('name', '')}")
        lines.append("")
        lines.append("#### Run Timeline")
        lines.append("")
        run_rows: list[list[str]] = []
        runs = [run for run in (experiment.get("runs") or []) if isinstance(run, dict)]
        for idx, run in enumerate(runs, start=1):
            pass_rate = run.get("pass_rate") if isinstance(run.get("pass_rate"), (int, float)) else None
            cause_text = _format_failure_cause(run.get("failure_cause"))
            run_rows.append(
                [
                    str(idx),
                    str(run.get('id', '')),
                    str(run.get('status', '')),
                    _fmt_pct(float(pass_rate)) if isinstance(pass_rate, (int, float)) else 'n/a',
                    f"`{_ascii_bar(float(pass_rate), full_blocks=True, colorize=colorize) if isinstance(pass_rate, (int, float)) else '-'}`",
                    cause_text or "-",
                ]
            )
        if not runs:
            run_rows.append(["1", "n/a", "n/a", "n/a", "`-`", "-"])
        lines.extend(_markdown_table(["#", "Run ID", "Status", "Pass Rate", "ASCII Trend", "Failure Cause"], run_rows, ["right", "left", "left", "right", "left", "left"]))
        lines.append("")
        failure_rows: list[list[str]] = []
        for idx, run in enumerate(runs, start=1):
            cause = run.get("failure_cause")
            if not isinstance(cause, dict) or not cause:
                continue
            detail = str(cause.get("detail_excerpt") or "").strip()
            detail_single = " ".join(detail.split())
            if len(detail_single) > 240:
                detail_single = detail_single[:237] + "..."
            failure_rows.append(
                [
                    str(idx),
                    str(run.get("id", "")),
                    str(cause.get("stage") or "-"),
                    str(cause.get("type") or "-"),
                    str(cause.get("message") or "-"),
                    detail_single or "-",
                ]
            )
        if failure_rows:
            lines.append("#### Failure Causes")
            lines.append("")
            lines.extend(
                _markdown_table(
                    ["#", "Run ID", "Stage", "Type", "Message", "Detail Excerpt"],
                    failure_rows,
                    ["right", "left", "left", "left", "left", "left"],
                )
            )
            lines.append("")
            for idx, run in enumerate(runs, start=1):
                cause = run.get("failure_cause")
                if not isinstance(cause, dict) or not cause:
                    continue
                detail_lines = _failure_cause_detail_lines(cause)
                if not detail_lines:
                    continue
                lines.append(f"<details><summary>Run {idx} failure detail ({run.get('id', '')})</summary>")
                lines.append("")
                lines.extend(detail_lines)
                lines.append("")
                lines.append("</details>")
                lines.append("")
        timeline_values = [
            float(run.get("pass_rate"))
            for run in runs
            if isinstance(run.get("pass_rate"), (int, float))
        ]
        lines.append(
            "Pass-rate sparkline: "
            + f"`{_sparkline(timeline_values, colorize=colorize) if timeline_values else 'n/a'}`"
        )
        lines.append("")

        comparisons = [
            item for item in (experiment.get("consecutive_comparisons") or [])
            if isinstance(item, dict)
        ]
        lines.append("#### Consecutive Run Deltas (A-B)")
        lines.append("")
        comparison_rows: list[list[str]] = []
        for item in comparisons:
            run_a = item.get("run_a_pass_rate") if isinstance(item.get("run_a_pass_rate"), (int, float)) else None
            run_b = item.get("run_b_pass_rate") if isinstance(item.get("run_b_pass_rate"), (int, float)) else None
            delta = item.get("delta_pass_rate") if isinstance(item.get("delta_pass_rate"), (int, float)) else None
            comparison_rows.append(
                [
                    str(item.get('run_a_id', '')),
                    str(item.get('run_b_id', '')),
                    _fmt_pct(float(run_a)) if isinstance(run_a, (int, float)) else 'n/a',
                    _fmt_pct(float(run_b)) if isinstance(run_b, (int, float)) else 'n/a',
                    _fmt_delta(float(delta), colorize=colorize) if isinstance(delta, (int, float)) else 'n/a',
                ]
            )
        if not comparisons:
            comparison_rows.append(["n/a", "n/a", "n/a", "n/a", "n/a"])
        lines.extend(_markdown_table(["Run A", "Run B", "A Pass", "B Pass", "Delta"], comparison_rows, ["left", "left", "right", "right", "right"]))
        lines.append("")

    lines.append("## Notes")
    lines.append("")
    lines.append("- Drift is computed as latest - baseline.")
    lines.append("- Baseline uses the first half of fetched runs (minimum 1, maximum 3).")
    lines.append("- Latest-2 delta uses the latest two runs returned in the fetched window.")
    lines.append("")

    return "\n".join(lines)


def _write_report_csv(report: dict[str, Any], output_path: Path) -> None:
    experiments = [item for item in (report.get("experiments") or []) if isinstance(item, dict)]
    fieldnames = [
        "row_type",
        "evalset_id",
        "experiment_id",
        "experiment_name",
        "run_index",
        "run_id",
        "run_status",
        "run_pass_rate",
        "runs_fetched",
        "runs_total",
        "baseline_pass_rate",
        "latest_pass_rate",
        "drift_delta",
        "latest_two_delta",
        "mean_pass_rate",
        "stddev_pass_rate",
        "failure_stage",
        "failure_type",
        "failure_message",
        "generated_at",
    ]
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8", newline="") as stream:
        writer = csv.DictWriter(stream, fieldnames=fieldnames)
        writer.writeheader()
        for experiment in experiments:
            writer.writerow(
                {
                    "row_type": "experiment",
                    "evalset_id": str(report.get("evalset_id", "")),
                    "experiment_id": str(experiment.get("id", "")),
                    "experiment_name": str(experiment.get("name", "")),
                    "run_index": "",
                    "run_id": "",
                    "run_status": "",
                    "run_pass_rate": "",
                    "runs_fetched": int(experiment.get("runs_fetched") or 0),
                    "runs_total": int(experiment.get("runs_total") or 0),
                    "baseline_pass_rate": experiment.get("baseline_pass_rate"),
                    "latest_pass_rate": experiment.get("latest_pass_rate"),
                    "drift_delta": experiment.get("drift_delta"),
                    "latest_two_delta": experiment.get("latest_two_delta"),
                    "mean_pass_rate": experiment.get("mean_pass_rate"),
                    "stddev_pass_rate": experiment.get("stddev_pass_rate"),
                    "failure_stage": "",
                    "failure_type": "",
                    "failure_message": "",
                    "generated_at": str(report.get("generated_at", "")),
                }
            )
            runs = [run for run in (experiment.get("runs") or []) if isinstance(run, dict)]
            for idx, run in enumerate(runs, start=1):
                cause = run.get("failure_cause") if isinstance(run.get("failure_cause"), dict) else {}
                writer.writerow(
                    {
                        "row_type": "run",
                        "evalset_id": str(report.get("evalset_id", "")),
                        "experiment_id": str(experiment.get("id", "")),
                        "experiment_name": str(experiment.get("name", "")),
                        "run_index": idx,
                        "run_id": str(run.get("id", "")),
                        "run_status": str(run.get("status", "")),
                        "run_pass_rate": run.get("pass_rate"),
                        "runs_fetched": int(experiment.get("runs_fetched") or 0),
                        "runs_total": int(experiment.get("runs_total") or 0),
                        "baseline_pass_rate": experiment.get("baseline_pass_rate"),
                        "latest_pass_rate": experiment.get("latest_pass_rate"),
                        "drift_delta": experiment.get("drift_delta"),
                        "latest_two_delta": experiment.get("latest_two_delta"),
                        "mean_pass_rate": experiment.get("mean_pass_rate"),
                        "stddev_pass_rate": experiment.get("stddev_pass_rate"),
                        "failure_stage": str(cause.get("stage", "")),
                        "failure_type": str(cause.get("type", "")),
                        "failure_message": str(cause.get("message", "")),
                        "generated_at": str(report.get("generated_at", "")),
                    }
                )


def _print_report_console(report: dict[str, Any], run_limit: int) -> None:
    evalset_id = str(report.get("evalset_id", ""))
    generated_at = str(report.get("generated_at", ""))
    experiments = [item for item in (report.get("experiments") or []) if isinstance(item, dict)]

    console.rule(f"[bold cyan]Evals Report[/bold cyan] {evalset_id}")
    console.print(f"Generated at: {generated_at}")
    console.print(f"Experiments: {len(experiments)} | Run window per experiment: {run_limit}")
    console.print("")

    overview = Table(title="Experiment Overview")
    overview.add_column("Experiment", style="white")
    overview.add_column("Runs", justify="right")
    overview.add_column("Latest", justify="right")
    overview.add_column("Baseline", justify="right")
    overview.add_column("Drift", justify="right")
    overview.add_column("Latest-2", justify="right")
    for experiment in experiments:
        overview.add_row(
            str(experiment.get("name", "")),
            f"{int(experiment.get('runs_fetched') or 0)}/{int(experiment.get('runs_total') or 0)}",
            _fmt_pct(experiment.get("latest_pass_rate") if isinstance(experiment.get("latest_pass_rate"), (int, float)) else None),
            _fmt_pct(experiment.get("baseline_pass_rate") if isinstance(experiment.get("baseline_pass_rate"), (int, float)) else None),
            _fmt_delta(experiment.get("drift_delta") if isinstance(experiment.get("drift_delta"), (int, float)) else None, colorize=True),
            _fmt_delta(experiment.get("latest_two_delta") if isinstance(experiment.get("latest_two_delta"), (int, float)) else None, colorize=True),
        )
    console.print(overview)

    ranked_latest = sorted(
        [item for item in experiments if isinstance(item.get("latest_pass_rate"), (int, float))],
        key=lambda item: float(item.get("latest_pass_rate") or 0.0),
        reverse=True,
    )
    latest_table = Table(title="By Latest Pass Rate")
    latest_table.add_column("Rank", justify="right", no_wrap=True)
    latest_table.add_column("Experiment", style="white")
    latest_table.add_column("Latest", justify="right", no_wrap=True)
    for idx, item in enumerate(ranked_latest, start=1):
        latest_table.add_row(str(idx), str(item.get("name", "")), _fmt_pct(float(item.get("latest_pass_rate") or 0.0)))
    console.print(latest_table)
    latest_values = [
        float(item.get("latest_pass_rate"))
        for item in ranked_latest
        if isinstance(item.get("latest_pass_rate"), (int, float))
    ]
    console.print("Latest histogram:")
    for hist_line in _ascii_histogram(
        latest_values,
        bins=8,
        width=20,
        min_value=0.0,
        max_value=1.0,
        full_blocks=True,
        colorize=True,
    ):
        console.print(hist_line)

    ranked_drift = sorted(
        [item for item in experiments if isinstance(item.get("drift_delta"), (int, float))],
        key=lambda item: float(item.get("drift_delta") or 0.0),
    )
    drift_table = Table(title="By Drift (Negative To Positive)")
    drift_table.add_column("Rank", justify="right", no_wrap=True)
    drift_table.add_column("Experiment", style="white")
    drift_table.add_column("Drift", justify="right", no_wrap=True)
    for idx, item in enumerate(ranked_drift, start=1):
        drift_table.add_row(
            str(idx),
            str(item.get("name", "")),
            _fmt_delta(float(item.get("drift_delta") or 0.0), colorize=True),
        )
    console.print(drift_table)
    drift_values = [
        float(item.get("drift_delta"))
        for item in ranked_drift
        if isinstance(item.get("drift_delta"), (int, float))
    ]
    console.print("Drift histogram:")
    for hist_line in _ascii_histogram(
        drift_values,
        bins=8,
        width=20,
        full_blocks=True,
        colorize=True,
        drift_palette=True,
    ):
        console.print(hist_line)

    pairwise = _pairwise_latest_deltas(experiments)
    pairwise_table = Table(title="Pairwise Latest-Pass Deltas")
    pairwise_table.add_column("Pair", style="white")
    pairwise_table.add_column("Left", justify="right", no_wrap=True)
    pairwise_table.add_column("Right", justify="right", no_wrap=True)
    pairwise_table.add_column("Delta", justify="right", no_wrap=True)
    for pair in pairwise:
        pairwise_table.add_row(
            f"{pair['left']} vs {pair['right']}",
            _fmt_pct(pair["left_latest"]),
            _fmt_pct(pair["right_latest"]),
            _fmt_delta(pair["delta"], colorize=True),
        )
    if not pairwise:
        pairwise_table.add_row("n/a", "n/a", "n/a", "n/a")
    console.print(pairwise_table)

    if ranked_latest:
        console.print(
            "[bold]Insight:[/bold] top latest "
            f"[green]{ranked_latest[0].get('name', '')}[/green] "
            f"({_fmt_pct(float(ranked_latest[0].get('latest_pass_rate') or 0.0))})"
        )
    if ranked_drift:
        console.print(
            "[bold]Insight:[/bold] strongest drift "
            f"{ranked_drift[-1].get('name', '')} "
            f"({_fmt_delta(float(ranked_drift[-1].get('drift_delta') or 0.0), colorize=True)})"
        )
    console.print("")

    for experiment in experiments:
        console.print("")
        console.print(f"[bold]Run Timeline:[/bold] {experiment.get('name', '')}")
        run_table = Table()
        run_table.add_column("#", justify="right", style="cyan", no_wrap=True)
        run_table.add_column("Run ID", style="white", no_wrap=True)
        run_table.add_column("Status", no_wrap=True)
        run_table.add_column("Pass Rate", justify="right", no_wrap=True)
        run_table.add_column("Trend", style="white", no_wrap=True)
        run_table.add_column("Failure Cause", style="red", overflow="fold")

        runs = [run for run in (experiment.get("runs") or []) if isinstance(run, dict)]
        for idx, run in enumerate(runs, start=1):
            status_value = str(run.get("status", ""))
            pass_rate = float(run.get("pass_rate")) if isinstance(run.get("pass_rate"), (int, float)) else None
            cause_text = _format_failure_cause(run.get("failure_cause"))
            run_table.add_row(
                str(idx),
                str(run.get("id", "")),
                f"[{_status_style(status_value)}]{status_value}[/{_status_style(status_value)}]",
                _fmt_pct(pass_rate),
                _ascii_bar(pass_rate, width=28, full_blocks=True, colorize=True) if pass_rate is not None else "-",
                cause_text or "-",
            )
        if not runs:
            run_table.add_row("1", "n/a", "n/a", "n/a", "-", "-")
        console.print(run_table)

        for idx, run in enumerate(runs, start=1):
            cause = run.get("failure_cause")
            if not isinstance(cause, dict) or not cause:
                continue
            console.print(
                f"[red bold]Run {idx} failure:[/red bold] "
                f"[red]{str(cause.get('message') or 'Unknown failure.')}[/red]"
            )
            for key, label in (
                ("stage", "stage"),
                ("type", "type"),
                ("execution_url", "execution url"),
            ):
                value = str(cause.get(key) or "").strip()
                if value:
                    console.print(f"    {label}: {value}")
            diagnostics = cause.get("diagnostics")
            if isinstance(diagnostics, dict):
                for key, label in (
                    ("agent_runtimes_url", "agent runtimes url"),
                    ("run_url", "run url"),
                ):
                    value = diagnostics.get(key)
                    if value:
                        console.print(f"    {label}: {value}")
                candidate_urls = diagnostics.get("candidate_urls")
                if isinstance(candidate_urls, list) and candidate_urls:
                    console.print(f"    candidate urls: {', '.join(str(u) for u in candidate_urls)}")
                attempts = diagnostics.get("attempts")
                if isinstance(attempts, list) and attempts:
                    for attempt in attempts:
                        if not isinstance(attempt, dict):
                            continue
                        outcome = "ok" if attempt.get("ok") else "failed"
                        console.print(
                            f"    attempt: {attempt.get('url', '')} -> {outcome} "
                            f"{attempt.get('error') or ''}".rstrip()
                        )
            detail = str(cause.get("detail_excerpt") or "").strip()
            if detail:
                console.print(f"    detail: {detail}")

        deltas_table = Table(title="Consecutive Run Deltas")
        deltas_table.add_column("Run A", style="white", no_wrap=True)
        deltas_table.add_column("Run B", style="white", no_wrap=True)
        deltas_table.add_column("A Pass", justify="right", no_wrap=True)
        deltas_table.add_column("B Pass", justify="right", no_wrap=True)
        deltas_table.add_column("Delta", justify="right", no_wrap=True)
        comparisons = [
            item for item in (experiment.get("consecutive_comparisons") or [])
            if isinstance(item, dict)
        ]
        for item in comparisons:
            run_a = item.get("run_a_pass_rate") if isinstance(item.get("run_a_pass_rate"), (int, float)) else None
            run_b = item.get("run_b_pass_rate") if isinstance(item.get("run_b_pass_rate"), (int, float)) else None
            delta = item.get("delta_pass_rate") if isinstance(item.get("delta_pass_rate"), (int, float)) else None
            deltas_table.add_row(
                str(item.get("run_a_id", "")),
                str(item.get("run_b_id", "")),
                _fmt_pct(float(run_a)) if isinstance(run_a, (int, float)) else "n/a",
                _fmt_pct(float(run_b)) if isinstance(run_b, (int, float)) else "n/a",
                _fmt_delta(float(delta), colorize=True) if isinstance(delta, (int, float)) else "n/a",
            )
        if not comparisons:
            deltas_table.add_row("n/a", "n/a", "n/a", "n/a", "n/a")
        console.print(deltas_table)


@app.callback()
def evals_callback(ctx: typer.Context) -> None:
    """Evals command group."""
    if ctx.invoked_subcommand is None:
        typer.echo(ctx.get_help())


@app.command(name="ls")
def evals_ls(
    token: Optional[str] = typer.Option(None, "--token", help="API token."),
    api_key: Optional[str] = typer.Option(None, "--api-key", help="Authentication API key (alias for --token)."),
    billable_account_uid: Optional[str] = typer.Option(None, "--billable-account-uid", help="Billable account UID context (organization/team/user)."),
    account_uid: Optional[str] = typer.Option(None, "--account-uid", help="Deprecated alias for --billable-account-uid."),
    run_environment: Optional[str] = typer.Option(None, "--run-environment", help="Filter by run environment (ui/sdk)."),
    kind: Optional[str] = typer.Option(None, "--kind", help="Filter by kind (batch/interactive)."),
    q: Optional[str] = typer.Option(None, "--q", help="Search query."),
    limit: int = typer.Option(50, "--limit", min=1, max=200),
    offset: int = typer.Option(0, "--offset", min=0),
    raw: bool = typer.Option(False, "--raw", help="Print raw JSON output."),
) -> None:
    """List all evalsets and their experiments."""
    resolved_account_uid = _resolve_billable_account_uid(billable_account_uid, account_uid)
    client = _make_client(token=token, api_key=api_key)
    evalsets_payload = client.evals_list_evals(
        run_environment=run_environment,
        kind=kind,
        q=q,
        limit=limit,
        offset=offset,
        account_uid=resolved_account_uid,
    )
    evalsets = [item for item in (evalsets_payload.get("evalsets") or []) if isinstance(item, dict)]

    experiments_by_evalset: dict[str, list[dict[str, Any]]] = {}
    for evalset in evalsets:
        evalset_id = str(evalset.get("id", ""))
        if not evalset_id:
            continue
        experiments_payload = client.evals_list_experiments(
            evalset_id=evalset_id,
            limit=200,
            offset=0,
            account_uid=resolved_account_uid,
        )
        experiments_by_evalset[evalset_id] = [
            item
            for item in (experiments_payload.get("experiments") or [])
            if isinstance(item, dict)
        ]

    if raw:
        console.print(
            {
                "evalsets": evalsets,
                "experiments": experiments_by_evalset,
            }
        )
        return

    total_experiments = sum(len(items) for items in experiments_by_evalset.values())
    tree = Tree(
        f"[bold]Evals[/bold] ([cyan]{len(evalsets)}[/cyan] evalsets, "
        f"[cyan]{total_experiments}[/cyan] experiments)"
    )
    for evalset in evalsets:
        evalset_id = str(evalset.get("id", ""))
        evalset_node = tree.add(
            f"[cyan]{evalset_id}[/cyan] [white]{evalset.get('name', '')}[/white] "
            f"(env={evalset.get('run_environment', '')}, "
            f"kind={evalset.get('kind', '')}, "
            f"cases={len(evalset.get('cases') or [])})"
        )
        experiments = experiments_by_evalset.get(evalset_id, [])
        if not experiments:
            evalset_node.add("[dim]no experiments[/dim]")
            continue
        for experiment in experiments:
            status_value = str(experiment.get("status", ""))
            evalset_node.add(
                f"[cyan]{experiment.get('id', '')}[/cyan] "
                f"[white]{experiment.get('name', '')}[/white] "
                f"[{_status_style(status_value)}]{status_value}[/{_status_style(status_value)}]"
            )
    console.print(tree)


@app.command(name="delete")
def evals_delete_top(
    evalset_id: str = typer.Argument(..., help="Evalset UID to delete."),
    yes: bool = typer.Option(False, "--yes", "-y", help="Skip the confirmation prompt."),
    token: Optional[str] = typer.Option(None, "--token", help="API token."),
    api_key: Optional[str] = typer.Option(None, "--api-key", help="Authentication API key (alias for --token)."),
    billable_account_uid: Optional[str] = typer.Option(None, "--billable-account-uid", help="Billable account UID context (organization/team/user)."),
    account_uid: Optional[str] = typer.Option(None, "--account-uid", help="Deprecated alias for --billable-account-uid."),
) -> None:
    """Delete an evalset and its associated experiments, runs, and cases."""
    if not yes:
        typer.confirm(
            f"Delete evalset {evalset_id} and all associated experiments, runs, and cases?",
            abort=True,
        )
    resolved_account_uid = _resolve_billable_account_uid(billable_account_uid, account_uid)
    client = _make_client(token=token, api_key=api_key)
    payload = client.evals_delete_eval(evalset_id, account_uid=resolved_account_uid)
    cascade = payload.get("cascade") or {}
    console.print(
        f"[green]Eval deleted:[/green] {evalset_id} "
        f"(experiments={cascade.get('experiments_deleted', 0)}, "
        f"runs={cascade.get('runs_deleted', 0)}, "
        f"cases={cascade.get('cases_deleted', 0)})"
    )


@evals_app.command(name="ls")
def evals_list(
    token: Optional[str] = typer.Option(None, "--token", help="API token."),
    api_key: Optional[str] = typer.Option(None, "--api-key", help="Authentication API key (alias for --token)."),
    billable_account_uid: Optional[str] = typer.Option(None, "--billable-account-uid", help="Billable account UID context (organization/team/user)."),
    account_uid: Optional[str] = typer.Option(None, "--account-uid", help="Deprecated alias for --billable-account-uid."),
    run_environment: Optional[str] = typer.Option(None, "--run-environment", help="Filter by run environment (ui/sdk)."),
    kind: Optional[str] = typer.Option(None, "--kind", help="Filter by kind (batch/interactive)."),
    q: Optional[str] = typer.Option(None, "--q", help="Search query."),
    limit: int = typer.Option(50, "--limit", min=1, max=200),
    offset: int = typer.Option(0, "--offset", min=0),
    raw: bool = typer.Option(False, "--raw", help="Print raw JSON output."),
) -> None:
    """List evalsets."""
    resolved_account_uid = _resolve_billable_account_uid(billable_account_uid, account_uid)
    client = _make_client(token=token, api_key=api_key)
    payload = client.evals_list_evals(
        run_environment=run_environment,
        kind=kind,
        q=q,
        limit=limit,
        offset=offset,
        account_uid=resolved_account_uid,
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
    name: Optional[str] = typer.Argument(None, help="Evalset name."),
    description: Optional[str] = typer.Option(None, "--description", help="Evalset description."),
    run_environment: Optional[str] = typer.Option(None, "--run-environment", help="Evalset run environment (ui/sdk)."),
    kind: Optional[str] = typer.Option(None, "--kind", help="Evalset kind (batch/interactive)."),
    spec_file: Optional[str] = typer.Option(None, "--spec-file", help="Path to evalset spec JSON file."),
    schema_json: Optional[str] = typer.Option(None, "--schema-json", help="Schema JSON object."),
    metadata_json: Optional[str] = typer.Option(None, "--metadata-json", help="Metadata JSON object."),
    cases_file: Optional[str] = typer.Option(None, "--cases-file", help="Path to JSON array of cases."),
    tags: list[str] = typer.Option([], "--tag", help="Repeatable tag."),
    token: Optional[str] = typer.Option(None, "--token", help="API token."),
    api_key: Optional[str] = typer.Option(None, "--api-key", help="Authentication API key (alias for --token)."),
    billable_account_uid: Optional[str] = typer.Option(None, "--billable-account-uid", help="Billable account UID context (organization/team/user)."),
    account_uid: Optional[str] = typer.Option(None, "--account-uid", help="Deprecated alias for --billable-account-uid."),
    raw: bool = typer.Option(False, "--raw", help="Print raw JSON output."),
) -> None:
    """Create an evalset."""
    spec = _parse_json_file(spec_file, "--spec-file")
    schema = _merge_dicts(
        spec.get("schema") if isinstance(spec.get("schema"), dict) else {},
        _parse_json_value(schema_json, "--schema-json"),
    )
    metadata = _merge_dicts(
        spec.get("metadata") if isinstance(spec.get("metadata"), dict) else {},
        _parse_json_value(metadata_json, "--metadata-json"),
    )

    cases: list[dict[str, Any]] = []
    if isinstance(spec.get("cases"), list):
        cases = [case for case in spec.get("cases") if isinstance(case, dict)]
    if cases_file:
        text = Path(cases_file).read_text(encoding="utf-8")
        decoded = json.loads(text)
        if not isinstance(decoded, list):
            raise typer.BadParameter("--cases-file must contain a JSON array")
        cases = [case for case in decoded if isinstance(case, dict)]

    resolved_name = str(name or spec.get("name") or "").strip()
    if not resolved_name:
        raise typer.BadParameter("name argument is required unless provided in --spec-file")
    resolved_description = str(description if description is not None else spec.get("description") or "")
    resolved_run_environment = str(run_environment if run_environment is not None else spec.get("run_environment") or "sdk")
    resolved_kind = str(kind if kind is not None else spec.get("kind") or "batch")

    spec_tags = spec.get("tags") if isinstance(spec.get("tags"), list) else []
    resolved_tags = tags if tags else [str(tag) for tag in spec_tags if str(tag).strip()]

    resolved_account_uid = _resolve_billable_account_uid(billable_account_uid, account_uid)
    client = _make_client(token=token, api_key=api_key)
    payload = client.evals_create_eval(
        name=resolved_name,
        description=resolved_description,
        run_environment=resolved_run_environment,
        kind=resolved_kind,
        schema=schema,
        metadata=metadata,
        tags=resolved_tags,
        cases=cases,
        account_uid=resolved_account_uid,
    )
    if raw:
        typer.echo(json.dumps(payload))
        return
    eval_record = payload.get("evalset") or {}
    console.print(f"[green]Eval created:[/green] {eval_record.get('id', '')} ({eval_record.get('name', '')})")


@evals_app.command(name="delete")
def evals_delete(
    evalset_id: str = typer.Argument(..., help="Evalset ID."),
    token: Optional[str] = typer.Option(None, "--token", help="API token."),
    api_key: Optional[str] = typer.Option(None, "--api-key", help="Authentication API key (alias for --token)."),
    billable_account_uid: Optional[str] = typer.Option(None, "--billable-account-uid", help="Billable account UID context (organization/team/user)."),
    account_uid: Optional[str] = typer.Option(None, "--account-uid", help="Deprecated alias for --billable-account-uid."),
) -> None:
    """Delete an evalset (cascade delete runs/experiments)."""
    resolved_account_uid = _resolve_billable_account_uid(billable_account_uid, account_uid)
    client = _make_client(token=token, api_key=api_key)
    payload = client.evals_delete_eval(evalset_id, account_uid=resolved_account_uid)
    cascade = payload.get("cascade") or {}
    console.print(
        "[green]Eval deleted.[/green] "
        f"experiments={cascade.get('experiments_deleted', 0)} "
        f"runs={cascade.get('runs_deleted', 0)} "
        f"cases={cascade.get('cases_deleted', 0)}"
    )


def _render_report(
    evalset_id: Optional[str],
    run_limit: int = typer.Option(50, "--run-limit", min=2, max=200, help="Runs fetched per experiment."),
    token: Optional[str] = typer.Option(None, "--token", help="API token."),
    api_key: Optional[str] = typer.Option(None, "--api-key", help="Authentication API key (alias for --token)."),
    billable_account_uid: Optional[str] = typer.Option(None, "--billable-account-uid", help="Billable account UID context (organization/team/user)."),
    account_uid: Optional[str] = typer.Option(None, "--account-uid", help="Deprecated alias for --billable-account-uid."),
    output_file: Optional[str] = typer.Option(None, "--output", help="Write markdown report to file."),
    export: bool = typer.Option(False, "--export", help="Export timestamped report files report-<timestamp>.md and report-<timestamp>.csv."),
    raw: bool = typer.Option(False, "--raw", help="Print raw JSON report output."),
) -> None:
    """Generate a full evalset report with cross-experiment comparisons."""
    resolved_account_uid = _resolve_billable_account_uid(billable_account_uid, account_uid)
    client = _make_client(token=token, api_key=api_key)
    resolved_evalset_id = (evalset_id or "").strip()
    if not resolved_evalset_id:
        payload = client.evals_list_evals(
            limit=200,
            offset=0,
            account_uid=resolved_account_uid,
        )
        evalsets = [item for item in (payload.get("evalsets") or []) if isinstance(item, dict)]
        if not evalsets:
            raise typer.BadParameter("No evalsets found. Provide <evalset_id> explicitly.")

        def _updated_key(item: dict[str, Any]) -> str:
            return str(item.get("updated_at") or item.get("created_at") or "")

        latest_evalset = max(evalsets, key=_updated_key)
        resolved_evalset_id = str(latest_evalset.get("id") or "").strip()
        if not resolved_evalset_id:
            raise typer.BadParameter("Latest evalset does not contain an id.")
        console.print(
            f"[yellow]No evalset id provided.[/yellow] Using latest evalset: "
            f"[cyan]{resolved_evalset_id}[/cyan]"
        )

    report = _report_data(
        client=client,
        evalset_id=resolved_evalset_id,
        run_limit=run_limit,
        account_uid=resolved_account_uid,
    )
    experiments = report.get("experiments") or []
    if not experiments:
        console.print(f"[yellow]No experiments found for evalset[/yellow] {resolved_evalset_id}")
        raise typer.Exit(0)

    if raw:
        console.print(report)
        return

    markdown_report = _report_markdown(report, run_limit=run_limit, colorize=False)
    if export:
        timestamp = _timestamp_slug(str(report.get("generated_at", _now_iso())))
        export_markdown_path = Path(f"report-{timestamp}.md")
        export_csv_path = Path(f"report-{timestamp}.csv")
        export_markdown_path.write_text(markdown_report + "\n", encoding="utf-8")
        _write_report_csv(report, export_csv_path)
        console.print(f"[green]Markdown export written:[/green] {export_markdown_path}")
        console.print(f"[green]CSV export written:[/green] {export_csv_path}")
    if output_file:
        output_path = Path(output_file)
        output_path.write_text(markdown_report + "\n", encoding="utf-8")
        console.print(f"[green]Report written:[/green] {output_path}")
    _print_report_console(report, run_limit=run_limit)


@app.command(name="report")
def evals_report(
    evalset_id: Optional[str] = typer.Argument(None, help="Evalset ID to report. Defaults to latest updated evalset."),
    run_limit: int = typer.Option(50, "--run-limit", min=2, max=200, help="Runs fetched per experiment."),
    token: Optional[str] = typer.Option(None, "--token", help="API token."),
    api_key: Optional[str] = typer.Option(None, "--api-key", help="Authentication API key (alias for --token)."),
    billable_account_uid: Optional[str] = typer.Option(None, "--billable-account-uid", help="Billable account UID context (organization/team/user)."),
    account_uid: Optional[str] = typer.Option(None, "--account-uid", help="Deprecated alias for --billable-account-uid."),
    output_file: Optional[str] = typer.Option(None, "--output", help="Write markdown report to file."),
    export: bool = typer.Option(False, "--export", help="Export timestamped report files report-<timestamp>.md and report-<timestamp>.csv."),
    raw: bool = typer.Option(False, "--raw", help="Print raw JSON report output."),
) -> None:
    """Generate an evalset report in markdown with comparison combinations and ASCII plots."""
    _render_report(
        evalset_id=evalset_id,
        run_limit=run_limit,
        token=token,
        api_key=api_key,
        billable_account_uid=billable_account_uid,
        account_uid=account_uid,
        output_file=output_file,
        export=export,
        raw=raw,
    )


@evals_app.command(name="compare-report")
def evals_compare_report_compat(
    evalset_id: Optional[str] = typer.Argument(None, help="Evalset ID to report. Defaults to latest updated evalset."),
    run_limit: int = typer.Option(50, "--run-limit", min=2, max=200, help="Runs fetched per experiment."),
    token: Optional[str] = typer.Option(None, "--token", help="API token."),
    api_key: Optional[str] = typer.Option(None, "--api-key", help="Authentication API key (alias for --token)."),
    billable_account_uid: Optional[str] = typer.Option(None, "--billable-account-uid", help="Billable account UID context (organization/team/user)."),
    account_uid: Optional[str] = typer.Option(None, "--account-uid", help="Deprecated alias for --billable-account-uid."),
    output_file: Optional[str] = typer.Option(None, "--output", help="Write markdown report to file."),
    export: bool = typer.Option(False, "--export", help="Export timestamped report files report-<timestamp>.md and report-<timestamp>.csv."),
    raw: bool = typer.Option(False, "--raw", help="Print raw JSON report output."),
) -> None:
    """Compatibility alias for report. Prefer: datalayer evals report <evalset-id>."""
    console.print("[yellow]Deprecated:[/yellow] use [bold]datalayer evals report <evalset-id>[/bold].")
    _render_report(
        evalset_id=evalset_id,
        run_limit=run_limit,
        token=token,
        api_key=api_key,
        billable_account_uid=billable_account_uid,
        account_uid=account_uid,
        output_file=output_file,
        export=export,
        raw=raw,
    )


@experiments_app.command(name="ls")
def experiments_list(
    evalset_id: Optional[str] = typer.Option(None, "--evalset-id", help="Filter by evalset ID."),
    status: Optional[str] = typer.Option(None, "--status", help="Filter by status."),
    limit: int = typer.Option(50, "--limit", min=1, max=200),
    offset: int = typer.Option(0, "--offset", min=0),
    token: Optional[str] = typer.Option(None, "--token", help="API token."),
    api_key: Optional[str] = typer.Option(None, "--api-key", help="Authentication API key (alias for --token)."),
    billable_account_uid: Optional[str] = typer.Option(None, "--billable-account-uid", help="Billable account UID context (organization/team/user)."),
    account_uid: Optional[str] = typer.Option(None, "--account-uid", help="Deprecated alias for --billable-account-uid."),
    raw: bool = typer.Option(False, "--raw", help="Print raw JSON output."),
) -> None:
    """List evalset experiments."""
    resolved_account_uid = _resolve_billable_account_uid(billable_account_uid, account_uid)
    client = _make_client(token=token, api_key=api_key)
    payload = client.evals_list_experiments(
        evalset_id=evalset_id,
        status=status,
        limit=limit,
        offset=offset,
        account_uid=resolved_account_uid,
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
    name: Optional[str] = typer.Argument(None, help="Experiment name."),
    evalset_id: Optional[str] = typer.Option(None, "--evalset-id", help="Evalset ID."),
    description: Optional[str] = typer.Option(None, "--description", help="Description."),
    status: Optional[str] = typer.Option(None, "--status", help="Initial status."),
    spec_file: Optional[str] = typer.Option(None, "--spec-file", help="Path to experiment spec JSON file."),
    config_json: Optional[str] = typer.Option(None, "--config-json", help="Config JSON object."),
    summary_json: Optional[str] = typer.Option(None, "--summary-json", help="Summary JSON object."),
    tags: list[str] = typer.Option([], "--tag", help="Repeatable tag."),
    token: Optional[str] = typer.Option(None, "--token", help="API token."),
    api_key: Optional[str] = typer.Option(None, "--api-key", help="Authentication API key (alias for --token)."),
    billable_account_uid: Optional[str] = typer.Option(None, "--billable-account-uid", help="Billable account UID context (organization/team/user)."),
    account_uid: Optional[str] = typer.Option(None, "--account-uid", help="Deprecated alias for --billable-account-uid."),
    raw: bool = typer.Option(False, "--raw", help="Print raw JSON output."),
) -> None:
    """Create an evalset experiment."""
    spec = _parse_json_file(spec_file, "--spec-file")

    resolved_name = str(name or spec.get("name") or "").strip()
    if not resolved_name:
        raise typer.BadParameter("name argument is required unless provided in --spec-file")
    resolved_evalset_id = str(evalset_id or spec.get("evalset_id") or "").strip() or None
    resolved_description = str(description if description is not None else spec.get("description") or "")
    resolved_status = str(status if status is not None else spec.get("status") or "draft")
    resolved_config = _merge_dicts(
        spec.get("config") if isinstance(spec.get("config"), dict) else {},
        _parse_json_value(config_json, "--config-json"),
    )
    resolved_summary = _merge_dicts(
        spec.get("summary") if isinstance(spec.get("summary"), dict) else {},
        _parse_json_value(summary_json, "--summary-json"),
    )
    spec_tags = spec.get("tags") if isinstance(spec.get("tags"), list) else []
    resolved_tags = tags if tags else [str(tag) for tag in spec_tags if str(tag).strip()]

    resolved_account_uid = _resolve_billable_account_uid(billable_account_uid, account_uid)
    client = _make_client(token=token, api_key=api_key)
    payload = client.evals_create_experiment(
        name=resolved_name,
        evalset_id=resolved_evalset_id,
        description=resolved_description,
        status=resolved_status,
        config=resolved_config,
        summary=resolved_summary,
        tags=resolved_tags,
        account_uid=resolved_account_uid,
    )
    if raw:
        typer.echo(json.dumps(payload))
        return
    experiment = payload.get("experiment") or {}
    console.print(f"[green]Experiment created:[/green] {experiment.get('id', '')} ({experiment.get('name', '')})")


@runs_app.command(name="ls")
def runs_list(
    experiment_id: str = typer.Option(..., "--experiment-id", help="Experiment ID."),
    limit: int = typer.Option(50, "--limit", min=1, max=200),
    offset: int = typer.Option(0, "--offset", min=0),
    token: Optional[str] = typer.Option(None, "--token", help="API token."),
    api_key: Optional[str] = typer.Option(None, "--api-key", help="Authentication API key (alias for --token)."),
    billable_account_uid: Optional[str] = typer.Option(None, "--billable-account-uid", help="Billable account UID context (organization/team/user)."),
    account_uid: Optional[str] = typer.Option(None, "--account-uid", help="Deprecated alias for --billable-account-uid."),
    raw: bool = typer.Option(False, "--raw", help="Print raw JSON output."),
) -> None:
    """List runs for an experiment."""
    resolved_account_uid = _resolve_billable_account_uid(billable_account_uid, account_uid)
    client = _make_client(token=token, api_key=api_key)
    payload = client.evals_list_runs(
        experiment_id,
        limit=limit,
        offset=offset,
        account_uid=resolved_account_uid,
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
    api_key: Optional[str] = typer.Option(None, "--api-key", help="Authentication API key (alias for --token)."),
    billable_account_uid: Optional[str] = typer.Option(None, "--billable-account-uid", help="Billable account UID context (organization/team/user)."),
    account_uid: Optional[str] = typer.Option(None, "--account-uid", help="Deprecated alias for --billable-account-uid."),
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

    resolved_account_uid = _resolve_billable_account_uid(billable_account_uid, account_uid)
    client = _make_client(token=token, api_key=api_key)
    payload = client.evals_create_run(
        experiment_id,
        status=status,
        started_at=started_at,
        ended_at=ended_at,
        metrics=metrics,
        summary=summary,
        report=report,
        account_uid=resolved_account_uid,
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
    api_key: Optional[str] = typer.Option(None, "--api-key", help="Authentication API key (alias for --token)."),
    billable_account_uid: Optional[str] = typer.Option(None, "--billable-account-uid", help="Billable account UID context (organization/team/user)."),
    account_uid: Optional[str] = typer.Option(None, "--account-uid", help="Deprecated alias for --billable-account-uid."),
) -> None:
    """Watch a run until completion/failure."""
    resolved_account_uid = _resolve_billable_account_uid(billable_account_uid, account_uid)
    client = _make_client(token=token, api_key=api_key)
    started = time.time()
    last_status = ""

    while True:
        payload = client.evals_get_run(run_id, account_uid=resolved_account_uid)
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
    api_key: Optional[str] = typer.Option(None, "--api-key", help="Authentication API key (alias for --token)."),
    billable_account_uid: Optional[str] = typer.Option(None, "--billable-account-uid", help="Billable account UID context (organization/team/user)."),
    account_uid: Optional[str] = typer.Option(None, "--account-uid", help="Deprecated alias for --billable-account-uid."),
    raw: bool = typer.Option(False, "--raw", help="Print raw JSON output."),
) -> None:
    """List live monitoring targets."""
    resolved_account_uid = _resolve_billable_account_uid(billable_account_uid, account_uid)
    client = _make_client(token=token, api_key=api_key)
    payload = client.evals_list_live_targets(
        window=window,
        limit=limit,
        account_uid=resolved_account_uid,
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
