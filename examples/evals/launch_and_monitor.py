#!/usr/bin/env python3

"""Beginner quickstart for Datalayer evals.

This script walks through a minimal end-to-end path:

1) Create eval
2) Create experiment
3) Create run
4) Poll run status

Use feature_tour.py if you want multi-experiment comparison and drift data.
"""

from __future__ import annotations

import argparse
import os
import time
from typing import Any

from datalayer_core import DatalayerClient
from datalayer_core.utils.urls import DatalayerURLs


def _normalize_service_url(raw_url: str | None, service_suffix: str) -> str | None:
    """Normalize service endpoints to base URL expected by DatalayerURLs.

    Examples:
    - http://localhost:4400/api/ai-agents/ -> http://localhost:4400
    - http://localhost:9500/api/runtimes -> http://localhost:9500
    """
    if not raw_url:
        return None
    value = raw_url.strip().rstrip('/')
    suffix = service_suffix.rstrip('/')
    if value.endswith(suffix):
        value = value[: -len(suffix)].rstrip('/')
    return value


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description='Create one eval, one experiment, one run, then monitor status.'
    )
    parser.add_argument('--eval-name', default='python-cli-demo-eval')
    parser.add_argument('--experiment-name', default='python-cli-demo-experiment')
    parser.add_argument('--run-status', default='completed', choices=['queued', 'running', 'completed', 'failed', 'cancelled'])
    parser.add_argument('--execution-mode', default='offline', choices=['offline', 'online', 'sdk'])
    parser.add_argument('--timeout', type=int, default=60)
    parser.add_argument('--interval', type=int, default=2)
    parser.add_argument('--pass-rate', type=float, default=1.0, help='Run metric pass_rate (0.0-1.0).')
    parser.add_argument('--total-cases', type=int, default=1, help='Run metric total_cases (default: 1).')
    parser.add_argument(
        '--trace-backend',
        default='trace-hub',
        choices=['none', 'trace-hub', 'otel'],
        help='Tracing backend label written into run summary metadata.',
    )
    parser.add_argument('--model-name', default='openai:gpt-5-mini')
    parser.add_argument('--prompt-version', default='v1')
    parser.add_argument(
        '--iam-url',
        default=None,
        help='IAM base URL override (falls back to DATALAYER_IAM_URL/env defaults).',
    )
    parser.add_argument(
        '--runtimes-url',
        default=None,
        help='Runtimes base URL override (falls back to DATALAYER_RUNTIMES_URL/env defaults).',
    )
    parser.add_argument(
        '--ai-agents-url',
        default=None,
        help='AI Agents base URL override (falls back to DATALAYER_AI_AGENTS_URL/env defaults).',
    )
    parser.add_argument(
        '--ui-url',
        default=None,
        help='UI base URL for printed navigation links (defaults to DATALAYER_UI_URL or localhost for local runs).',
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    token = os.environ.get("DATALAYER_API_KEY") or os.environ.get("TEST_DATALAYER_API_KEY")
    if not token:
        raise RuntimeError("Set DATALAYER_API_KEY or TEST_DATALAYER_API_KEY first.")

    account_uid = os.environ.get("DATALAYER_ACCOUNT_UID")

    pass_rate = min(1.0, max(0.0, float(args.pass_rate)))
    total_cases = max(1, int(args.total_cases))
    passed_cases = int(round(pass_rate * total_cases))
    failed_cases = max(0, total_cases - passed_cases)

    urls = DatalayerURLs.from_environment(
        iam_url=_normalize_service_url(args.iam_url, '/api/iam'),
        runtimes_url=_normalize_service_url(args.runtimes_url, '/api/runtimes'),
        ai_agents_url=_normalize_service_url(args.ai_agents_url, '/api/ai-agents'),
    )
    ui_url = (
        args.ui_url
        or os.environ.get('DATALAYER_UI_URL')
        or ('http://localhost:3063' if 'localhost' in urls.ai_agents_url or '127.0.0.1' in urls.ai_agents_url else urls.ai_agents_url)
    ).rstrip('/')
    client = DatalayerClient(urls=urls, token=token)

    print('[1/4] Creating eval...')
    ds_payload = client.evals_create_eval(
        name=args.eval_name,
        description="Eval created from examples/evals/launch_and_monitor.py",
        source="hosted",
        kind="offline",
        cases=[
            {
                "name": "hello-case",
                "inputs": {"text": "hello"},
                "expected_output": {"text": "HELLO"},
                "metadata": {"difficulty": "easy"},
            }
        ],
        account_uid=account_uid,
    )
    eval_record = ds_payload.get("eval") or {}
    eval_id = str(eval_record.get("id"))
    if not eval_id:
        raise RuntimeError(f"Unexpected eval response: {ds_payload}")
    print(f"Created eval: {eval_id}")

    print('[2/4] Creating experiment...')
    ex_payload = client.evals_create_experiment(
        name=args.experiment_name,
        eval_id=eval_id,
        description="Experiment created by launch_and_monitor.py",
        status="draft",
        config={
            "execution_mode": args.execution_mode,
            "model": args.model_name,
            "prompt_version": args.prompt_version,
        },
        summary={"launch_source": "python-example"},
        account_uid=account_uid,
    )
    experiment = ex_payload.get("experiment") or {}
    experiment_id = str(experiment.get("id"))
    if not experiment_id:
        raise RuntimeError(f"Unexpected experiment response: {ex_payload}")
    print(f"Created experiment: {experiment_id}")

    print('[3/4] Creating run...')
    run_payload = client.evals_create_run(
        experiment_id,
        status=args.run_status,
        metrics={
            "pass_rate": pass_rate,
            "total_cases": total_cases,
            "passed": passed_cases,
            "failed": failed_cases,
            "avg_score": round(pass_rate * 0.9 + 0.08, 4),
        },
        summary={
            "launch_source": "python-example",
            "execution_mode": args.execution_mode,
            "trace_backend": args.trace_backend,
            "model": args.model_name,
            "prompt_version": args.prompt_version,
            "trace_id": f"trace-{args.experiment_name}" if args.trace_backend != 'none' else None,
            "session_id": f"session-{args.experiment_name}" if args.trace_backend != 'none' else None,
            "otel_service": 'agent-evals' if args.trace_backend in {'trace-hub', 'otel'} else None,
        },
        report={"note": "demo run"},
        account_uid=account_uid,
    )
    run = run_payload.get("run") or {}
    run_id = str(run.get("id"))
    if not run_id:
        raise RuntimeError(f"Unexpected run response: {run_payload}")
    print(f"Launched run: {run_id}")

    print('[4/4] Watching run status...')
    timeout_seconds = max(1, args.timeout)
    started = time.time()
    while True:
        snapshot: dict[str, Any] = client.evals_get_run(run_id, account_uid=account_uid)
        run_state = snapshot.get("run") or {}
        status = str(run_state.get("status"))
        print(f"Run status: {status}")
        if status.lower() in {"completed", "failed", "error", "cancelled"}:
            break
        if time.time() - started > timeout_seconds:
            raise TimeoutError("Timed out waiting for run status")
        time.sleep(max(1, args.interval))

    print('Done.')
    print(f"Track in UI: {ui_url}/evals")


if __name__ == "__main__":
    main()
