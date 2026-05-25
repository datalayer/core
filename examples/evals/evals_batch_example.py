#!/usr/bin/env python3

"""Batch eval example for Datalayer.

Creates one evalset, five experiments, and three runs per experiment using run_mode=batch.
"""

from __future__ import annotations

import argparse
import atexit
import math
import json
import os
import socket
import subprocess
import time
from datetime import datetime, timezone
from typing import Any
from urllib import error as urlerror
from urllib import request as urlrequest
from urllib.parse import urlparse

from datalayer_core import DatalayerClient
from datalayer_core.utils.urls import DatalayerURLs


DEFAULT_LOCAL_IAM_URL = 'http://localhost:9700/api/iam/'
DEFAULT_LOCAL_RUNTIMES_URL = 'http://localhost:9500/api/runtimes/'
DEFAULT_LOCAL_AI_AGENTS_URL = 'http://localhost:4400/api/ai-agents/'
DEFAULT_AGENT_SPEC_ID = 'eval-experiment-runner'


def _normalize_service_url(raw_url: str | None, service_suffix: str) -> str | None:
    if not raw_url:
        return None
    value = raw_url.strip().rstrip('/')
    suffix = service_suffix.rstrip('/')
    if value.endswith(suffix):
        value = value[: -len(suffix)].rstrip('/')
    return value


def _resolve_environment(args: argparse.Namespace) -> tuple[str, str, str, str]:
    requested = args.run_environment.strip().lower()

    if requested == 'sdk':
        return (
            'sdk',
            args.iam_url,
            args.runtimes_url,
            args.ai_agents_url,
        )

    if requested == 'sdk-proxy':
        return (
            'sdk',
            args.iam_url or DEFAULT_LOCAL_IAM_URL,
            args.runtimes_url or DEFAULT_LOCAL_RUNTIMES_URL,
            args.ai_agents_url or DEFAULT_LOCAL_AI_AGENTS_URL,
        )

    raise ValueError(f'Unsupported run environment: {args.run_environment}')


def _build_batch_cases() -> list[dict[str, Any]]:
    return [
        {
            'name': 'uppercase-basic',
            'inputs': {'text': 'hello world'},
            'expected_output': {'text': 'HELLO WORLD'},
            'metadata': {'category': 'normalization', 'difficulty': 'easy'},
        },
        {
            'name': 'trim-and-uppercase',
            'inputs': {'text': '  Paris  '},
            'expected_output': {'text': 'PARIS'},
            'metadata': {'category': 'normalization', 'difficulty': 'easy'},
        },
        {
            'name': 'punctuation-preserved',
            'inputs': {'text': 'hello, world!'},
            'expected_output': {'text': 'HELLO, WORLD!'},
            'metadata': {'category': 'formatting', 'difficulty': 'medium'},
        },
        {
            'name': 'numeric-token-preserved',
            'inputs': {'text': 'Version 2.1'},
            'expected_output': {'text': 'VERSION 2.1'},
            'metadata': {'category': 'mixed-content', 'difficulty': 'medium'},
        },
        {
            'name': 'unicode-latin',
            'inputs': {'text': 'cafe'},
            'expected_output': {'text': 'CAFE'},
            'metadata': {'category': 'unicode', 'difficulty': 'medium'},
        },
    ]


def _build_eval_schema(kind: str) -> dict[str, Any]:
    return {
        'schema_version': '1.0',
        'kind': kind,
        'title': 'Text Normalization Evalset',
        'description': (
            'Showcases input/output/metadata schemas with constraints, enums, '
            'defaults, formats, and examples for a text-normalization task.'
        ),
        'input_schema': {
            '$schema': 'https://json-schema.org/draft/2020-12/schema',
            'title': 'NormalizationInput',
            'description': 'Payload supplied to the agent for one evaluation case.',
            'type': 'object',
            'required': ['text'],
            'properties': {
                'text': {
                    'type': 'string',
                    'description': 'Raw text to normalize. Leading/trailing whitespace is stripped.',
                    'minLength': 1,
                    'maxLength': 4000,
                    'examples': ['hello world', '  Paris  '],
                },
                'language': {
                    'type': 'string',
                    'description': 'BCP-47 language tag of the input text.',
                    'enum': ['en', 'fr', 'es', 'de', 'it'],
                    'default': 'en',
                },
                'mode': {
                    'type': 'string',
                    'description': 'Normalization variant to apply.',
                    'enum': ['uppercase', 'lowercase', 'titlecase'],
                    'default': 'uppercase',
                },
                'preserve_punctuation': {
                    'type': 'boolean',
                    'description': 'Keep punctuation characters in the output.',
                    'default': True,
                },
            },
            'additionalProperties': False,
        },
        'output_schema': {
            '$schema': 'https://json-schema.org/draft/2020-12/schema',
            'title': 'NormalizationOutput',
            'description': 'Structured response produced by the agent.',
            'type': 'object',
            'required': ['text'],
            'properties': {
                'text': {
                    'type': 'string',
                    'description': 'Normalized text returned by the agent.',
                    'minLength': 1,
                    'examples': ['HELLO WORLD', 'PARIS'],
                },
                'confidence': {
                    'type': 'number',
                    'description': 'Model self-reported confidence between 0 and 1.',
                    'minimum': 0,
                    'maximum': 1,
                },
                'detected_language': {
                    'type': 'string',
                    'description': 'Language inferred from the input text.',
                    'enum': ['en', 'fr', 'es', 'de', 'it', 'unknown'],
                },
                'tokens': {
                    'type': 'array',
                    'description': 'Tokenized form of the normalized text.',
                    'items': {'type': 'string'},
                    'minItems': 0,
                },
            },
            'additionalProperties': True,
        },
        'metadata_schema': {
            '$schema': 'https://json-schema.org/draft/2020-12/schema',
            'title': 'CaseMetadata',
            'description': 'Authoring metadata attached to each case.',
            'type': 'object',
            'properties': {
                'category': {
                    'type': 'string',
                    'description': 'Functional grouping for analytics.',
                    'enum': ['normalization', 'formatting', 'unicode', 'mixed-content'],
                },
                'difficulty': {
                    'type': 'string',
                    'description': 'Authoring difficulty estimate.',
                    'enum': ['easy', 'medium', 'hard'],
                },
                'owner': {
                    'type': 'string',
                    'description': 'Email of the case author.',
                    'format': 'email',
                },
                'tags': {
                    'type': 'array',
                    'description': 'Free-form labels for filtering.',
                    'items': {'type': 'string'},
                    'uniqueItems': True,
                },
                'created_at': {
                    'type': 'string',
                    'description': 'ISO 8601 timestamp when the case was authored.',
                    'format': 'date-time',
                },
            },
            'additionalProperties': True,
        },
    }


def _generated_evalset_name(source: str, mode: str) -> str:
    stamp = datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S')
    return f'evalset-{source}-{mode}-{stamp}'


def _run_status_for_index(index: int) -> str:
    return 'completed' if index < 2 else 'failed'


def _normalize_no_agent_first_run_status(requested_status: str) -> str:
    normalized = str(requested_status or '').strip().lower()
    if normalized in {'running', 'queued', 'pending'}:
        return 'completed'
    if normalized in {'completed', 'failed', 'cancelled'}:
        return normalized
    return 'completed'


def _is_intentional_failure(index: int, run_status: str) -> bool:
    return index >= 2 and run_status == 'failed'


def _pass_rate_for_index(base_pass_rate: float, index: int) -> float:
    if index == 0:
        return max(0.0, min(1.0, base_pass_rate - 0.08))
    if index == 1:
        return max(0.0, min(1.0, base_pass_rate))
    return max(0.0, min(1.0, base_pass_rate - 0.15))


def _build_submitted_code(total_cases: int, run_pass_rate: float, run_mode: str) -> str:
    passed = max(0, min(total_cases, int(round(run_pass_rate * total_cases))))
    failed = max(0, total_cases - passed)
    avg_score = round(run_pass_rate * 0.9 + 0.08, 4)
    return (
        'import json\n\n'
        f'total_cases = {total_cases}\n'
        f'passed = {passed}\n'
        f'failed = {failed}\n'
        f'pass_rate = {run_pass_rate}\n'
        f'avg_score = {avg_score}\n\n'
        'print(json.dumps({\n'
        '    "status": "completed" if failed == 0 else "failed",\n'
        '    "run_mode": ' + repr(run_mode) + ',\n'
        '    "total_cases": total_cases,\n'
        '    "passed": passed,\n'
        '    "failed": failed,\n'
        '    "pass_rate": pass_rate,\n'
        '    "avg_score": avg_score,\n'
        '    "summary": "generated by evals_batch_example cloud executor",\n'
        '}))\n'
    )


def _launch_cloud_runtime(
    client: DatalayerClient,
    environment_name: str,
    evalset_name: str,
    cloud_credits_limit: float,
) -> str:
    burning_rate = _resolve_environment_burning_rate(client, environment_name)

    # create_runtime computes credits as burning_rate * 60 * time_reservation
    time_reservation_minutes = max(
        1,
        int(math.ceil(float(cloud_credits_limit) / (burning_rate * 60.0))),
    )
    requested_credits = burning_rate * 60.0 * time_reservation_minutes
    print(
        'Launching cloud runtime with credits target: '
        f'requested>={cloud_credits_limit}, '
        f'burning_rate={burning_rate}, '
        f'time_reservation={time_reservation_minutes} min, '
        f'effective_credits={requested_credits:.2f}'
    )

    runtime = client.create_runtime(
        name=f'evals-batch-{evalset_name[:24]}',
        environment=environment_name,
        time_reservation=time_reservation_minutes,
    )
    pod_name = str(getattr(runtime, 'pod_name', '') or '').strip()
    if not pod_name:
        raise RuntimeError('Runtime creation succeeded but pod_name is missing.')
    return pod_name


def _resolve_environment_burning_rate(
    client: DatalayerClient,
    environment_name: str,
) -> float:
    def _to_float(value: Any) -> float | None:
        try:
            if value is None:
                return None
            parsed = float(value)
            if parsed > 0:
                return parsed
        except (TypeError, ValueError):
            return None
        return None

    response = client._list_environments()  # type: ignore[attr-defined]
    if not response.get('success', True):
        raise RuntimeError(
            f"Failed to list environments: {response.get('message', 'Unknown error')}"
        )
    environments = response.get('environments')
    if not isinstance(environments, list):
        raise RuntimeError('Failed to list environments: invalid environments payload.')

    matched_environment: dict[str, Any] | None = None
    for raw_env in environments:
        if isinstance(raw_env, dict) and str(raw_env.get('name') or '') == environment_name:
            matched_environment = raw_env
            break

    if matched_environment is None:
        available = [str(env.get('name') or '') for env in environments if isinstance(env, dict)]
        raise RuntimeError(
            f"Environment '{environment_name}' not found for cloud runtime launch. "
            f'Available environments: {available}'
        )

    parsed = _to_float(matched_environment.get('burning_rate'))
    if parsed is not None:
        return parsed

    available_keys = sorted(matched_environment.keys())
    raise RuntimeError(
        f"Environment '{environment_name}' is missing a positive burning rate in backend payload. "
        f'Checked key: burning_rate. '
        f'Environment keys: {available_keys}'
    )


def _build_local_eval_spec(cases: list[dict[str, Any]], run_mode: str) -> list[dict[str, Any]]:
    spec: list[dict[str, Any]] = []
    for item in cases:
        spec.append(
            {
                'name': item.get('name'),
                'inputs': item.get('inputs') or {},
                'expected_output': item.get('expected_output'),
                'metadata': {
                    **(item.get('metadata') or {}),
                    'run_mode': run_mode,
                },
            }
        )
    return spec


def _extract_case_prompt(case: dict[str, Any]) -> str:
    inputs = case.get('inputs')
    if isinstance(inputs, dict):
        for key in ('prompt', 'text', 'query', 'message'):
            value = inputs.get(key)
            if isinstance(value, str) and value.strip():
                return value
        try:
            return json.dumps(inputs, ensure_ascii=True)
        except TypeError:
            return str(inputs)
    return ''


def _extract_local_agent_output(payload: dict[str, Any]) -> Any:
    for key in ('output', 'response', 'result', 'actual_output'):
        if key in payload:
            return payload.get(key)

    results = payload.get('results')
    if isinstance(results, list) and results:
        first = results[0]
        if isinstance(first, dict):
            for key in ('output', 'response', 'result', 'actual_output'):
                if key in first:
                    return first.get(key)
            return first
    return payload


def _extract_local_agent_metrics(
    payload: dict[str, Any],
    *,
    total_cases: int,
    default_pass_rate: float,
) -> dict[str, Any]:
    metrics = payload.get('metrics')
    if isinstance(metrics, dict) and metrics:
        return dict(metrics)

    total = int(payload.get('total_cases') or total_cases)
    passed = int(payload.get('passed') or round(default_pass_rate * total))
    failed = int(payload.get('failed') or max(0, total - passed))
    pass_rate_raw = payload.get('pass_rate')
    if isinstance(pass_rate_raw, (int, float)):
        pass_rate = float(pass_rate_raw)
    else:
        pass_rate = (passed / total) if total > 0 else default_pass_rate
    avg_score_raw = payload.get('avg_score')
    avg_score = float(avg_score_raw) if isinstance(avg_score_raw, (int, float)) else round(pass_rate * 0.9 + 0.08, 4)
    return {
        'pass_rate': pass_rate,
        'total_cases': total,
        'passed': passed,
        'failed': failed,
        'avg_score': avg_score,
    }


def _run_local_agent_eval(
    *,
    base_url: str,
    local_agent_id: str,
    token: str,
    eval_spec: list[dict[str, Any]],
) -> dict[str, Any]:
    endpoint = f"{base_url.rstrip('/')}/api/v1/agents/{local_agent_id}/evals/run"
    payload = {
        'eval_spec': eval_spec,
        'agent_system_prompt': None,
        'tool_schemas': None,
    }
    req = urlrequest.Request(
        endpoint,
        data=json.dumps(payload).encode('utf-8'),
        headers={
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {token}',
        },
        method='POST',
    )
    try:
        with urlrequest.urlopen(req, timeout=300) as response:
            raw = response.read().decode('utf-8')
    except urlerror.HTTPError as exc:
        body = exc.read().decode('utf-8', errors='replace')
        raise RuntimeError(f'Local agent eval failed ({exc.code}): {body or "unknown error"}') from exc
    except urlerror.URLError as exc:
        raise RuntimeError(f'Local agent eval request failed: {exc.reason}') from exc

    try:
        parsed = json.loads(raw) if raw else {}
    except json.JSONDecodeError as exc:
        raise RuntimeError(f'Local agent eval returned invalid JSON: {raw[:400]}') from exc

    if not isinstance(parsed, dict):
        raise RuntimeError('Local agent eval response must be a JSON object.')
    return parsed


def _find_random_free_port(host: str = '127.0.0.1') -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.bind((host, 0))
        return int(sock.getsockname()[1])


def _wait_for_local_runtime(base_url: str, timeout_seconds: int = 25) -> None:
    endpoint = f"{base_url.rstrip('/')}/health"
    deadline = time.time() + timeout_seconds
    while time.time() < deadline:
        req = urlrequest.Request(endpoint, method='GET')
        try:
            with urlrequest.urlopen(req, timeout=2):
                return
        except Exception:
            time.sleep(0.5)
    raise RuntimeError(
        f'Local agent-runtimes server did not become ready at {endpoint} within {timeout_seconds}s.'
    )


def _build_agent_runtime_env() -> tuple[dict[str, str], list[str]]:
    runtime_env = os.environ.copy()
    mapped_targets: list[str] = []
    mappings = {
        'DATALAYER_BEDROCK_AWS_ACCESS_KEY_ID': 'AWS_ACCESS_KEY_ID',
        'DATALAYER_BEDROCK_AWS_SECRET_ACCESS_KEY': 'AWS_SECRET_ACCESS_KEY',
        'DATALAYER_BEDROCK_AWS_DEFAULT_REGION': 'AWS_DEFAULT_REGION',
    }
    for source, target in mappings.items():
        value = (runtime_env.get(source) or '').strip()
        if value:
            runtime_env[target] = value
            mapped_targets.append(target)
    return runtime_env, mapped_targets


def _start_local_agent_runtime(
    *,
    base_url: str,
    local_agent_id: str,
    agent_spec_id: str,
    local_agent_log_level: str,
) -> tuple[str, subprocess.Popen[Any]]:
    parsed = urlparse(base_url)
    scheme = parsed.scheme or 'http'
    host = parsed.hostname or '127.0.0.1'
    port = _find_random_free_port(host)
    runtime_base_url = f'{scheme}://{host}:{port}'

    command = [
        'agent-runtimes',
        'serve',
        '--host',
        host,
        '--port',
        str(port),
        '--agent-id',
        agent_spec_id,
        '--agent-name',
        local_agent_id,
        '--log-level',
        local_agent_log_level,
    ]
    runtime_env, mapped_targets = _build_agent_runtime_env()
    if mapped_targets:
        print(
            'Launching local agent-runtimes with Bedrock env mapping: '
            f"DATALAYER_BEDROCK_* -> {', '.join(mapped_targets)}"
        )
    else:
        print(
            'Launching local agent-runtimes without DATALAYER_BEDROCK_* mapping '
            '(no DATALAYER_BEDROCK_AWS_* variables detected).'
        )
    process = subprocess.Popen(command, env=runtime_env)

    def _cleanup() -> None:
        _terminate_local_runtime_process(process)

    atexit.register(_cleanup)
    _wait_for_local_runtime(runtime_base_url)
    return runtime_base_url, process


def _terminate_local_runtime_process(process: subprocess.Popen[Any]) -> None:
    if process.poll() is not None:
        return
    process.terminate()
    try:
        process.wait(timeout=5)
    except subprocess.TimeoutExpired:
        process.kill()


def _delete_local_agents(*, base_url: str, token: str) -> tuple[int, int]:
    list_req = urlrequest.Request(
        f"{base_url.rstrip('/')}/api/v1/agents",
        headers={'Authorization': f'Bearer {token}'},
        method='GET',
    )
    try:
        with urlrequest.urlopen(list_req, timeout=30) as response:
            raw = response.read().decode('utf-8')
    except Exception as exc:
        print(f'Warning: unable to list local agents for cleanup ({exc})')
        return (0, 0)

    try:
        payload = json.loads(raw) if raw else {}
    except json.JSONDecodeError:
        payload = {}

    agents = payload.get('agents') if isinstance(payload, dict) else []
    if not isinstance(agents, list):
        agents = []

    deleted = 0
    for agent in agents:
        if not isinstance(agent, dict):
            continue
        agent_id = str(agent.get('id') or '').strip()
        if not agent_id:
            continue
        delete_req = urlrequest.Request(
            f"{base_url.rstrip('/')}/api/v1/agents/{agent_id}",
            headers={'Authorization': f'Bearer {token}'},
            method='DELETE',
        )
        try:
            with urlrequest.urlopen(delete_req, timeout=30):
                deleted += 1
        except Exception as exc:
            print(f'Warning: unable to delete local agent {agent_id} ({exc})')

    return (len(agents), deleted)


def _assert_http_service_reachable(service_name: str, base_url: str) -> None:
    parsed = urlparse(base_url)
    host = parsed.hostname or 'localhost'
    if parsed.port:
        port = parsed.port
    elif parsed.scheme == 'https':
        port = 443
    else:
        port = 80
    try:
        with socket.create_connection((host, port), timeout=2):
            return
    except OSError as exc:
        raise RuntimeError(
            f"{service_name} service is not reachable at {base_url}. "
            "Start local proxies/services first (for example: p pf-local)."
        ) from exc


def _ensure_local_agent(
    *,
    base_url: str,
    local_agent_id: str,
    token: str,
    agent_spec_id: str,
) -> None:
    endpoint = f"{base_url.rstrip('/')}/api/v1/agents"
    payload = {
        'name': local_agent_id,
        'description': 'Local eval runner agent created by evals_batch_example.py',
        'agent_library': 'pydantic-ai',
        'transport': 'vercel-ai',
        'agent_spec_id': agent_spec_id,
        'enable_skills': True,
        'tools': [],
    }
    req = urlrequest.Request(
        endpoint,
        data=json.dumps(payload).encode('utf-8'),
        headers={
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {token}',
        },
        method='POST',
    )
    try:
        with urlrequest.urlopen(req, timeout=120):
            return
    except urlerror.HTTPError as exc:
        body = exc.read().decode('utf-8', errors='replace')
        if exc.code == 409 and 'already exists' in body.lower():
            return
        raise RuntimeError(
            f'Local agent bootstrap failed ({exc.code}): {body or "unknown error"}'
        ) from exc
    except urlerror.URLError as exc:
        parsed = urlparse(base_url)
        host = parsed.hostname or '127.0.0.1'
        port = parsed.port or 8000
        scheme = parsed.scheme or 'http'
        raise RuntimeError(
            'Local agent bootstrap request failed: '
            f'{exc.reason}. Start agent-runtimes first, for example: '
            f'agent-runtimes serve --host {host} --port {port} '
            f'--agent-id {agent_spec_id} --agent-name {local_agent_id} '
            f'(base URL: {scheme}://{host}:{port}).'
        ) from exc


def _watch_run_statuses(
    *,
    client: DatalayerClient,
    run_ids: list[str],
    account_uid: str | None,
    timeout_seconds: int,
    interval_seconds: int,
    last_run_expected_failure: bool,
    local_agent_id: str,
) -> None:
    terminal_states = {
        'completed',
        'failed',
        'error',
        'cancelled',
        'success',
        'succeeded',
        'passed',
        'done',
    }
    started = time.time()
    snapshots_by_run: dict[str, dict[str, Any]] = {}
    previous_status_by_run: dict[str, str] = {}

    print(
        'Watching eval runs: '
        f'agent_id={local_agent_id}, total_runs={len(run_ids)}, '
        f'timeout={timeout_seconds}s, interval={interval_seconds}s'
    )
    print('Note: identifiers in delta lines are run_id values, not agent UID.')

    while True:
        status_counts: dict[str, int] = {}
        pending_ids: list[str] = []
        for run_id in run_ids:
            snapshot: dict[str, Any] = client.evals_get_run(run_id, account_uid=account_uid)
            snapshots_by_run[run_id] = snapshot
            status = str((snapshot.get('run') or {}).get('status') or '').lower() or 'unknown'
            status_counts[status] = status_counts.get(status, 0) + 1
            if status not in terminal_states:
                pending_ids.append(run_id)

        elapsed = int(time.time() - started)
        summary = ', '.join(
            f'{status}={count}' for status, count in sorted(status_counts.items())
        ) or 'unknown=0'
        print(f'Run status summary at t+{elapsed}s: {summary}')

        changed_rows: list[str] = []
        for run_id in run_ids:
            current_status = str(
                ((snapshots_by_run.get(run_id) or {}).get('run') or {}).get('status') or ''
            ).lower() or 'unknown'
            previous_status = previous_status_by_run.get(run_id)
            if previous_status is None:
                changed_rows.append(f'  {run_id}: init->{current_status}')
            elif previous_status != current_status:
                changed_rows.append(f'  {run_id}: {previous_status}->{current_status}')
            previous_status_by_run[run_id] = current_status

        if changed_rows:
            print('Run status deltas since previous poll:')
            for row in changed_rows:
                print(row)
        else:
            print('Run status deltas since previous poll: no changes')

        if not pending_ids:
            final_run_id = run_ids[-1]
            final_state = str(
                ((snapshots_by_run.get(final_run_id) or {}).get('run') or {}).get('status') or ''
            ).lower()
            if final_state == 'failed' and last_run_expected_failure:
                print('Final run status: failed (expected demo failure)')
            else:
                print(f'Final run status: {final_state or "unknown"}')
            return

        if time.time() - started > timeout_seconds:
            preview_ids = ', '.join(pending_ids[:5])
            suffix = ' ...' if len(pending_ids) > 5 else ''
            print(
                'Run status watch timed out before terminal state. '
                f'Pending run_ids ({len(pending_ids)}): {preview_ids}{suffix}'
            )
            sample_run_id = pending_ids[0] if pending_ids else ''
            sample_run = ((snapshots_by_run.get(sample_run_id) or {}).get('run') or {})
            sample_summary = sample_run.get('summary') if isinstance(sample_run, dict) else {}
            if not isinstance(sample_summary, dict):
                sample_summary = {}
            print('Timeout diagnostic sample run snapshot:')
            print(
                f'  run_id={sample_run_id}, '
                f'status={str(sample_run.get("status") or "unknown")}, '
                f'updated_at={str(sample_run.get("updated_at") or "n/a")}'
            )
            print(
                '  summary: '
                f'execution_target={str(sample_summary.get("execution_target") or "n/a")}, '
                f'local_agent_base_url={str(sample_summary.get("local_agent_base_url") or "n/a")}, '
                f'local_agent_id={str(sample_summary.get("local_agent_id") or "n/a")}'
            )
            return

        time.sleep(max(1, interval_seconds))


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description='Create one evalset, five experiments, and three runs per experiment in batch mode.'
    )
    parser.add_argument('--eval-name', default='')
    parser.add_argument('--run-status', default='completed', choices=['queued', 'running', 'completed', 'failed', 'cancelled'])
    parser.add_argument(
        '--run-environment',
        default='sdk',
        choices=['sdk', 'sdk-proxy'],
        help=(
            'sdk uses direct endpoints with backend run_environment=sdk; '
            'sdk-proxy uses local proxy endpoints while keeping backend run_environment=sdk.'
        ),
    )
    parser.add_argument('--timeout', type=int, default=60)
    parser.add_argument('--interval', type=int, default=2)
    parser.add_argument('--pass-rate', type=float, default=0.9)
    parser.add_argument('--total-cases', type=int, default=10)
    parser.add_argument('--model-name', default='openai:gpt-5-mini')
    parser.add_argument('--prompt-version', default='v1')
    parser.add_argument('--iam-url', default=None)
    parser.add_argument('--runtimes-url', default=None)
    parser.add_argument('--ai-agents-url', default=None)
    parser.add_argument('--ui-url', default=None)
    parser.add_argument('--execution-target', default='cloud', choices=['cloud', 'local'])
    parser.add_argument(
        '--agent-spec-id',
        '--agentspec-id',
        dest='agent_spec_id',
        default=None,
        help=(
            'Agent specification id. Defaults to eval-experiment-runner when omitted. '
            'Accepts both --agent-spec-id and --agentspec-id.'
        ),
    )
    parser.add_argument('--environment-name', default='ai-agents-env')
    parser.add_argument(
        '--cloud-credits-limit',
        type=float,
        default=100.0,
        help='Target credits reservation for cloud runtime creation.',
    )
    parser.add_argument('--local-agent-base-url', default='http://localhost:8765')
    parser.add_argument('--local-agent-id', default='default')
    parser.add_argument(
        '--local-agent-log-level',
        default='info',
        choices=['debug', 'info', 'warning', 'error', 'critical'],
        help='Log level for auto-started local agent-runtimes process.',
    )
    parser.add_argument(
        '--auto-start-local-agent-runtime',
        action='store_true',
        help='Start a local agent-runtimes server on a random free port for local execution.',
    )
    parser.add_argument(
        '--no-agent',
        action='store_true',
        help='Keep legacy synthetic eval behavior without invoking an agent.',
    )
    parser.add_argument('--dry-run', dest='no_agent', action='store_true', help=argparse.SUPPRESS)
    parser.add_argument('--clean', action='store_true', help='Accepted for compatibility; currently no-op.')
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    token = os.environ.get('DATALAYER_API_KEY') or os.environ.get('TEST_DATALAYER_API_KEY')
    if not token:
        raise RuntimeError('Set DATALAYER_API_KEY or TEST_DATALAYER_API_KEY first.')

    account_uid = os.environ.get('DATALAYER_ACCOUNT_UID')
    agent_spec_id = (args.agent_spec_id or '').strip() or DEFAULT_AGENT_SPEC_ID
    backend_run_environment, iam_url, runtimes_url, ai_agents_url = _resolve_environment(args)
    pass_rate = min(1.0, max(0.0, float(args.pass_rate)))
    run_count = 3
    total_cases = max(1, int(args.total_cases))

    urls = DatalayerURLs.from_environment(
        iam_url=_normalize_service_url(iam_url, '/api/iam'),
        runtimes_url=_normalize_service_url(runtimes_url, '/api/runtimes'),
        ai_agents_url=_normalize_service_url(ai_agents_url, '/api/ai-agents'),
    )

    if args.run_environment == 'sdk-proxy':
        _assert_http_service_reachable('ai-agents', urls.ai_agents_url)
        if args.execution_target == 'cloud':
            _assert_http_service_reachable('runtimes', urls.runtimes_url)
    ui_url = (
        args.ui_url
        or os.environ.get('DATALAYER_UI_URL')
        or ('http://localhost:3063' if 'localhost' in urls.ai_agents_url or '127.0.0.1' in urls.ai_agents_url else urls.ai_agents_url)
    ).rstrip('/')

    client = DatalayerClient(urls=urls, token=token)
    evalset_name = args.eval_name.strip() or _generated_evalset_name('sdk', 'batch')

    cases = _build_batch_cases()

    print('[1/4] Creating evalset...')
    evalset_payload = client.evals_create_eval(
        name=evalset_name,
        description='Eval created by evals_batch_example.py',
        run_environment=backend_run_environment,
        kind='batch',
        schema=_build_eval_schema('batch'),
        cases=cases,
        account_uid=account_uid,
    )
    evalset_id = str((evalset_payload.get('evalset') or {}).get('id') or '')
    if not evalset_id:
        raise RuntimeError(f'Unexpected evalset response: {evalset_payload}')
    print(f'Created evalset: {evalset_id} ({evalset_name})')

    print('[2/4] Creating experiments...')
    experiment_specs = [
        {'name': 'batch-experiment-1', 'index': 1},
        {'name': 'batch-experiment-2', 'index': 2},
        {'name': 'batch-experiment-3', 'index': 3},
        {'name': 'batch-experiment-4', 'index': 4},
        {'name': 'batch-experiment-5', 'index': 5},
    ]
    experiment_ids: list[tuple[str, str, int]] = []
    for spec in experiment_specs:
        experiment_payload = client.evals_create_experiment(
            name=spec['name'],
            evalset_id=evalset_id,
            description='Experiment created by evals_batch_example.py',
            status='draft',
            config={
                'run_mode': 'batch',
                'execution_target': args.execution_target,
                'no_agent': bool(args.no_agent),
                'dry_run': bool(args.no_agent),
                'agent_spec_id': agent_spec_id,
                'environment_name': args.environment_name,
                'local_agent_base_url': args.local_agent_base_url,
                'local_agent_id': args.local_agent_id,
                'model': args.model_name,
                'prompt_version': args.prompt_version,
            },
            summary={
                'launch_source': 'python-batch-example',
                'experiment_index': spec['index'],
            },
            account_uid=account_uid,
        )
        experiment_id = str((experiment_payload.get('experiment') or {}).get('id') or '')
        if not experiment_id:
            raise RuntimeError(f'Unexpected experiment response: {experiment_payload}')
        experiment_ids.append((spec['name'], experiment_id, spec['index']))
        print(f"Created experiment {spec['index']}/5: {experiment_id} ({spec['name']})")

    print(f'[3/4] Creating {run_count} run(s) per experiment...')
    if args.no_agent and run_count >= 3:
        print('Note: run 3+ are intentionally marked as failed in this demo to show status distribution and regression signals.')
    no_agent_first_run_status = _normalize_no_agent_first_run_status(args.run_status)
    if args.no_agent and no_agent_first_run_status != str(args.run_status).strip().lower():
        print(
            'No-agent mode uses terminal statuses only; '
            f"coercing first run status from '{args.run_status}' to '{no_agent_first_run_status}' "
            'to avoid watch timeout.'
        )
    runtime_pod_name = ''
    local_agent_base_url = args.local_agent_base_url
    auto_started_runtime_process: subprocess.Popen[Any] | None = None
    if not args.no_agent and args.execution_target == 'cloud':
        print('Launching cloud runtime for batch execution...')
        runtime_pod_name = _launch_cloud_runtime(
            client,
            args.environment_name,
            evalset_name,
            float(args.cloud_credits_limit),
        )
        print(f'Using runtime pod: {runtime_pod_name}')
        print('Note: cloud runtime termination is user-managed; stop it explicitly when finished.')
    if not args.no_agent and args.execution_target == 'local':
        if args.auto_start_local_agent_runtime:
            local_agent_base_url, auto_started_runtime_process = _start_local_agent_runtime(
                base_url=local_agent_base_url,
                local_agent_id=args.local_agent_id,
                agent_spec_id=agent_spec_id,
                local_agent_log_level=args.local_agent_log_level,
            )
            print(f'Started local agent-runtimes server at {local_agent_base_url}')
        _ensure_local_agent(
            base_url=local_agent_base_url,
            local_agent_id=args.local_agent_id,
            token=token,
            agent_spec_id=agent_spec_id,
        )
        print(
            f'Using local agent execution at {local_agent_base_url.rstrip("/")} '
            f'(agent: {args.local_agent_id}).'
        )
    local_eval_spec = _build_local_eval_spec(cases, 'batch')
    run_ids: list[str] = []
    last_run_expected_failure = False
    for experiment_name, experiment_id, experiment_index in experiment_ids:
        print(f'Creating runs for {experiment_name}...')
        for index in range(run_count):
            run_pass_rate = _pass_rate_for_index(pass_rate, index)
            interaction_prompt = _extract_case_prompt(cases[index % len(cases)])
            interaction_output: Any = None
            interaction_mode = 'no-agent-synthetic' if args.no_agent else 'ai-agents-run-api'
            if args.no_agent:
                run_status = no_agent_first_run_status if index == 0 else _run_status_for_index(index)
                intentional_failure = _is_intentional_failure(index, run_status)
                run_passed_cases = int(round(run_pass_rate * total_cases))
                run_failed_cases = max(0, total_cases - run_passed_cases)
                metrics: dict[str, Any] = {
                    'pass_rate': run_pass_rate,
                    'total_cases': total_cases,
                    'passed': run_passed_cases,
                    'failed': run_failed_cases,
                    'avg_score': round(run_pass_rate * 0.9 + 0.08, 4),
                }
                interaction_output = {
                    'text': str((cases[index % len(cases)].get('expected_output') or {}).get('text') or ''),
                    'mode': 'synthetic-no-agent',
                }
                run_report: dict[str, Any] = {
                    'interaction_mode': 'no-agent-synthetic',
                    'synthetic': True,
                }
            else:
                if args.execution_target == 'local':
                    local_eval_result = _run_local_agent_eval(
                        base_url=local_agent_base_url,
                        local_agent_id=args.local_agent_id,
                        token=token,
                        eval_spec=local_eval_spec,
                    )
                    local_status = str(local_eval_result.get('status') or 'completed').strip().lower()
                    run_status = 'failed' if local_status in {'failed', 'error'} else 'completed'
                    metrics = _extract_local_agent_metrics(
                        local_eval_result,
                        total_cases=total_cases,
                        default_pass_rate=run_pass_rate,
                    )
                    interaction_output = _extract_local_agent_output(local_eval_result)
                    run_report = {
                        'interaction_mode': 'sdk-direct-local-agent-api',
                        'agent_eval': local_eval_result,
                    }
                    intentional_failure = False
                    interaction_mode = 'sdk-direct-local-agent-api'
                elif args.execution_target == 'cloud':
                    run_status = 'running'
                    metrics = {}
                    run_report = {}
                    intentional_failure = False
                else:
                    raise RuntimeError(
                        f"Unsupported execution target '{args.execution_target}'"
                    )

            submitted_code = None
            if not args.no_agent and args.execution_target == 'cloud':
                submitted_code = _build_submitted_code(total_cases, run_pass_rate, 'batch')

            run_payload = client.evals_create_run(
                experiment_id,
                status=run_status,
                metrics=metrics,
                summary={
                    'launch_source': 'python-batch-example',
                    'run_mode': 'batch',
                    'run_environment': args.run_environment,
                    'backend_run_environment': backend_run_environment,
                    'execution_target': args.execution_target,
                    'no_agent': bool(args.no_agent),
                    'dry_run': bool(args.no_agent),
                    'agent_spec_id': agent_spec_id,
                    'environment_name': args.environment_name,
                    'local_agent_base_url': local_agent_base_url,
                    'local_agent_id': args.local_agent_id,
                    'model': args.model_name,
                    'prompt_version': args.prompt_version,
                    'experiment_name': experiment_name,
                    'experiment_index': experiment_index,
                    'run_index': index + 1,
                    'scenario': 'regression-suite',
                    'runtime_pod_name': runtime_pod_name or None,
                    'runtime_termination_policy': 'user_managed' if args.execution_target == 'cloud' else None,
                    'submitted_code': submitted_code,
                    'interaction_mode': interaction_mode,
                    'agent_prompt': interaction_prompt or None,
                    'agent_output': interaction_output,
                },
                report={
                    'note': f'batch example run {index + 1} ({experiment_name})',
                    'agent_prompt': interaction_prompt or None,
                    'agent_output': interaction_output,
                    **run_report,
                },
                account_uid=account_uid,
            )
            run_id = str((run_payload.get('run') or {}).get('id') or '')
            if not run_id:
                raise RuntimeError(f'Unexpected run response: {run_payload}')
            run_ids.append(run_id)
            run_log_suffix = ' [expected demo failure]' if intentional_failure else ''
            print(
                f'Launched run {index + 1}/{run_count} for {experiment_name}: '
                f'run_id={run_id}, status={run_status}, agent_id={args.local_agent_id}'
                f'{run_log_suffix}'
            )
            last_run_expected_failure = intentional_failure

    print('[4/4] Watching run status...')
    _watch_run_statuses(
        client=client,
        run_ids=run_ids,
        account_uid=account_uid,
        timeout_seconds=max(1, args.timeout),
        interval_seconds=max(1, args.interval),
        last_run_expected_failure=last_run_expected_failure,
        local_agent_id=args.local_agent_id,
    )

    if auto_started_runtime_process is not None:
        total_agents, deleted_agents = _delete_local_agents(
            base_url=local_agent_base_url,
            token=token,
        )
        print(
            'Local runtime cleanup: '
            f'deleted {deleted_agents}/{total_agents} agent(s).'
        )
        _terminate_local_runtime_process(auto_started_runtime_process)
        print('Stopped auto-started local agent-runtimes server.')

    print('Done.')
    print(f'Track in UI: {ui_url}/evals')


if __name__ == '__main__':
    main()
