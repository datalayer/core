#!/usr/bin/env python3

"""Create eval/experiment/run and monitor run status with datalayer_core eval APIs."""

from __future__ import annotations

import os
import time
from typing import Any

from datalayer_core import DatalayerClient
from datalayer_core.utils.urls import DatalayerURLs


def main() -> None:
    token = os.environ.get("DATALAYER_API_KEY") or os.environ.get("TEST_DATALAYER_API_KEY")
    if not token:
        raise RuntimeError("Set DATALAYER_API_KEY or TEST_DATALAYER_API_KEY first.")

    account_uid = os.environ.get("DATALAYER_ACCOUNT_UID")
    ai_agents_url = os.environ.get("DATALAYER_AI_AGENTS_URL")

    urls = DatalayerURLs.from_environment(ai_agents_url=ai_agents_url)
    client = DatalayerClient(urls=urls, token=token)

    ds_payload = client.evals_create_eval(
        name="python-cli-demo-eval",
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
    print(f"Created eval: {eval_id}")

    ex_payload = client.evals_create_experiment(
        name="python-cli-demo-experiment",
        eval_id=eval_id,
        description="Experiment created by launch_and_monitor.py",
        status="draft",
        config={"execution_mode": "offline"},
        summary={"launch_source": "python-example"},
        account_uid=account_uid,
    )
    experiment = ex_payload.get("experiment") or {}
    experiment_id = str(experiment.get("id"))
    print(f"Created experiment: {experiment_id}")

    run_payload = client.evals_create_run(
        experiment_id,
        status="completed",
        metrics={"pass_rate": 1.0, "total_cases": 1, "passed": 1, "failed": 0},
        summary={"launch_source": "python-example", "execution_mode": "offline"},
        report={"note": "demo run"},
        account_uid=account_uid,
    )
    run = run_payload.get("run") or {}
    run_id = str(run.get("id"))
    print(f"Launched run: {run_id}")

    timeout_seconds = 60
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
        time.sleep(2)

    print(f"Track in UI: {urls.ai_agents_url}/agents/evals")


if __name__ == "__main__":
    main()
