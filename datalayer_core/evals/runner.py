# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

# Copyright (c) 2023-2026 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""Reusable evalset execution runner.

This module hosts the end-to-end "execute an evalset spec against one or more
agentspecs" workflow so that examples, the GitHub Action, and any other
integration can launch real eval runs without re-implementing the orchestration
(create evalset -> launch cloud runtime(s) -> run each case through the agent ->
grade outputs -> persist runs -> teardown runtimes).
"""

from __future__ import annotations

import json
import uuid
from typing import Any, Callable, Optional

from datalayer_core.agents import (
    compute_time_reservation_minutes,
    create_cloud_agent_runtime,
    resolve_environment_burning_rate,
    teardown_agent_execution_resources,
)
from datalayer_core.agents.agent_local import (
    run_cloud_agent_chat,
    runtime_route_candidates,
)
from datalayer_core.client.client import DatalayerClient
from datalayer_core.evals.evals import now_iso, timestamp_slug
from datalayer_core.evals.evaluators import evaluate_evalset

DEFAULT_ENVIRONMENT_NAME = "ai-agents-env"
DEFAULT_AGENT_NAME = "default"


def _case_prompt(case: dict[str, Any]) -> str:
    """Extract a prompt string from an evalset case's inputs."""
    inputs = case.get("inputs")
    if isinstance(inputs, dict):
        for key in ("prompt", "text", "query", "message"):
            value = inputs.get(key)
            if isinstance(value, str) and value.strip():
                return value
        return json.dumps(inputs, ensure_ascii=True)
    if isinstance(inputs, str):
        return inputs
    return ""


def _extract_text(payload: Any) -> str:
    """Coerce an agent output payload into a plain text answer."""
    if isinstance(payload, dict):
        text = payload.get("text")
        if isinstance(text, str):
            return text
        message = payload.get("message")
        if isinstance(message, str):
            return message
    if isinstance(payload, str):
        return payload
    return json.dumps(payload, ensure_ascii=True)


def execute_evalset_spec(
    client: DatalayerClient,
    *,
    spec: dict[str, Any],
    agentspec_ids: list[str],
    run_limit: int = 1,
    run_environment: str = "sdk",
    environment_name: str = DEFAULT_ENVIRONMENT_NAME,
    account_uid: Optional[str] = None,
    credits_limit: float = 100.0,
    evalset_name: Optional[str] = None,
    backend_run_environment: str = "sdk",
    launch_source: str = "datalayer-core",
    agent_name: str = DEFAULT_AGENT_NAME,
    log: Optional[Callable[[str], None]] = print,
) -> dict[str, Any]:
    """Execute an evalset spec against one or more agentspecs and persist runs.

    Creates an evalset from ``spec``, launches one cloud runtime per agentspec,
    runs every case through the agent ``run_limit`` times, grades the outputs
    with the evals API, and stores one run record per execution. Cloud runtimes
    are always torn down before returning (including on error).

    Parameters
    ----------
    client : DatalayerClient
        An authenticated client.
    spec : dict[str, Any]
        Evalset spec (as loaded by :func:`load_evalset_spec`).
    agentspec_ids : list[str]
        Agentspec ids to execute. One experiment + runtime is created per id.
    run_limit : int
        Number of runs to create per experiment (minimum 1).
    run_environment : str
        Run-environment label stored on run summaries (for example ``sdk``).
    environment_name : str
        Runtime environment to launch agents in.
    account_uid : Optional[str]
        Optional billable account UID context.
    credits_limit : float
        Target credits budget used to size each runtime reservation.
    evalset_name : Optional[str]
        Optional explicit evalset name. Defaults to a timestamped name derived
        from the spec name.
    backend_run_environment : str
        ``run_environment`` value persisted on the created evalset.
    launch_source : str
        ``launch_source`` recorded on experiments and runs.
    agent_name : str
        Agent route name used when contacting the runtime.
    log : Optional[Callable[[str], None]]
        Optional logging callback (defaults to ``print``; pass ``None`` to
        silence progress output).

    Returns
    -------
    dict[str, Any]
        ``{"evalset_id", "evalset_name", "experiment_ids", "run_ids"}``.

    Raises
    ------
    ValueError
        If ``agentspec_ids`` is empty or the spec has no cases.
    RuntimeError
        If the platform returns an unexpected create response or a runtime is
        missing its ingress/pod.
    """

    def _emit(message: str) -> None:
        if log is not None:
            log(message)

    normalized_specs: list[str] = []
    for value in agentspec_ids:
        spec_id = str(value or "").strip()
        if spec_id and spec_id not in normalized_specs:
            normalized_specs.append(spec_id)
    if not normalized_specs:
        raise ValueError("agentspec_ids must contain at least one agentspec id.")

    cases = [item for item in (spec.get("cases") or []) if isinstance(item, dict)]
    if not cases:
        raise ValueError("Evalset spec has no cases; cannot execute real runs.")

    run_limit = max(1, int(run_limit))

    resolved_name = str(
        evalset_name
        or f"{str(spec.get('name') or 'evalset')}-{run_environment}-{timestamp_slug(now_iso())}"
    )
    evalset_payload = client.evals_create_eval_from_spec(
        spec=spec,
        name=resolved_name,
        run_environment=backend_run_environment,
        kind="batch",
        account_uid=account_uid,
    )
    evalset_id = str((evalset_payload.get("evalset") or {}).get("id") or "")
    if not evalset_id:
        raise RuntimeError(f"Unable to create evalset from spec: {evalset_payload}")
    _emit(f"Created evalset: {evalset_id} ({resolved_name})")

    experiment_ids: list[str] = []
    run_ids: list[str] = []
    runtimes_by_spec: dict[str, Any] = {}
    try:
        for spec_id in normalized_specs:
            burning_rate = resolve_environment_burning_rate(client, environment_name)
            reservation_minutes = compute_time_reservation_minutes(
                credits_limit=credits_limit,
                burning_rate=burning_rate,
            )
            runtime = create_cloud_agent_runtime(
                client,
                environment_name=environment_name,
                name=f"evals-{spec_id}-{uuid.uuid4().hex[:8]}",
                agent_spec_id=spec_id,
                time_reservation=reservation_minutes,
                billable_account_uid=account_uid,
            )
            runtimes_by_spec[spec_id] = runtime
            _emit(
                f"Launched runtime for agentspec {spec_id}: "
                f"{getattr(runtime, 'pod_name', '')}"
            )

        for spec_id in normalized_specs:
            experiment_payload = client.evals_create_experiment(
                name=f"evals-{spec_id}-{timestamp_slug(now_iso())}",
                evalset_id=evalset_id,
                description="Eval execution via datalayer-core runner.",
                status="running",
                config={
                    "run_mode": "batch",
                    "execution_target": "cloud",
                    "agent_spec_id": spec_id,
                    "environment_name": environment_name,
                },
                summary={
                    "launch_source": launch_source,
                    "run_environment": run_environment,
                    "agent_spec_id": spec_id,
                },
                account_uid=account_uid,
            )
            experiment_id = str(
                (experiment_payload.get("experiment") or {}).get("id") or ""
            )
            if not experiment_id:
                raise RuntimeError(
                    f"Unable to create experiment: {experiment_payload}"
                )
            experiment_ids.append(experiment_id)

            runtime = runtimes_by_spec[spec_id]
            ingress = str(getattr(runtime, "ingress", "") or "").strip()
            pod_name = str(getattr(runtime, "pod_name", "") or "").strip()
            if not ingress or not pod_name:
                raise RuntimeError(
                    f"Runtime missing ingress/pod for agentspec {spec_id}"
                )

            for run_index in range(run_limit):
                outputs: list[dict[str, Any]] = []
                failed_cases = 0
                failure_causes: list[dict[str, Any]] = []

                for case in cases:
                    prompt = _case_prompt(case)
                    result = run_cloud_agent_chat(
                        ingress=ingress,
                        token=str(client._get_token() or ""),
                        prompt=prompt,
                        route_candidates=runtime_route_candidates(
                            agent_name=agent_name,
                            agent_spec_id=spec_id,
                            pod_name=pod_name,
                        ),
                    )
                    status = str(result.get("status") or "completed").strip().lower()
                    outputs.append({"text": _extract_text(result.get("output") or {})})
                    if status in {"failed", "error"}:
                        failed_cases += 1
                        failure = result.get("failure_cause")
                        if isinstance(failure, dict):
                            failure_causes.append(failure)

                metrics = evaluate_evalset(spec, outputs)
                run_status = "failed" if failed_cases > 0 else "completed"
                summary: dict[str, Any] = {
                    "launch_source": launch_source,
                    "run_mode": "batch",
                    "run_environment": run_environment,
                    "execution_target": "cloud",
                    "agent_spec_id": spec_id,
                    "runtime_pod_name": pod_name,
                    "case_failures": failed_cases,
                    "run_index": run_index + 1,
                }
                if failure_causes:
                    summary["failure_cause"] = failure_causes[0]
                report = {
                    "note": "real agent execution via datalayer-core runner",
                    "failure_causes": failure_causes,
                }

                run_payload = client.evals_create_run(
                    experiment_id,
                    status=run_status,
                    metrics=metrics,
                    summary=summary,
                    report=report,
                    account_uid=account_uid,
                )
                run_id = str((run_payload.get("run") or {}).get("id") or "")
                if not run_id:
                    raise RuntimeError(f"Unable to create run: {run_payload}")
                run_ids.append(run_id)
                _emit(
                    f"Created run {run_index + 1}/{run_limit} for agentspec="
                    f"{spec_id} experiment={experiment_id}: {run_id}"
                )

        _emit(f"Executed evalset: {evalset_id}")
        return {
            "evalset_id": evalset_id,
            "evalset_name": resolved_name,
            "experiment_ids": experiment_ids,
            "run_ids": run_ids,
        }
    finally:
        for spec_id, runtime in runtimes_by_spec.items():
            pod_name = str(getattr(runtime, "pod_name", "") or "").strip()
            cleanup = teardown_agent_execution_resources(
                client,
                execution_target="cloud",
                cloud_runtime_or_pod_name=pod_name,
                token=str(client._get_token() or ""),
            )
            if cleanup.get("cloud_runtime_terminated"):
                _emit(f"Terminated runtime for agentspec {spec_id}: {pod_name}")
            else:
                _emit(
                    "Warning: runtime termination unconfirmed for agentspec "
                    f"{spec_id}: {pod_name}"
                )
