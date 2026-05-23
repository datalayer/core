#!/usr/bin/env python3

"""Batch eval example for Datalayer.

Creates one evalset, five experiments, and three runs per experiment using run_mode=batch.
"""

from __future__ import annotations

import argparse
import os
import time
from datetime import datetime, timezone
from typing import Any

from datalayer_core import DatalayerClient
from datalayer_core.utils.urls import DatalayerURLs


DEFAULT_LOCAL_IAM_URL = 'http://localhost:9700/api/iam/'
DEFAULT_LOCAL_RUNTIMES_URL = 'http://localhost:9500/api/runtimes/'
DEFAULT_LOCAL_AI_AGENTS_URL = 'http://localhost:4400/api/ai-agents/'


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


def _is_intentional_failure(index: int, run_status: str) -> bool:
    return index >= 2 and run_status == 'failed'


def _pass_rate_for_index(base_pass_rate: float, index: int) -> float:
    if index == 0:
        return max(0.0, min(1.0, base_pass_rate - 0.08))
    if index == 1:
        return max(0.0, min(1.0, base_pass_rate))
    return max(0.0, min(1.0, base_pass_rate - 0.15))


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
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    token = os.environ.get('DATALAYER_API_KEY') or os.environ.get('TEST_DATALAYER_API_KEY')
    if not token:
        raise RuntimeError('Set DATALAYER_API_KEY or TEST_DATALAYER_API_KEY first.')

    account_uid = os.environ.get('DATALAYER_ACCOUNT_UID')
    backend_run_environment, iam_url, runtimes_url, ai_agents_url = _resolve_environment(args)
    pass_rate = min(1.0, max(0.0, float(args.pass_rate)))
    run_count = 3
    total_cases = max(1, int(args.total_cases))

    urls = DatalayerURLs.from_environment(
        iam_url=_normalize_service_url(iam_url, '/api/iam'),
        runtimes_url=_normalize_service_url(runtimes_url, '/api/runtimes'),
        ai_agents_url=_normalize_service_url(ai_agents_url, '/api/ai-agents'),
    )
    ui_url = (
        args.ui_url
        or os.environ.get('DATALAYER_UI_URL')
        or ('http://localhost:3063' if 'localhost' in urls.ai_agents_url or '127.0.0.1' in urls.ai_agents_url else urls.ai_agents_url)
    ).rstrip('/')

    client = DatalayerClient(urls=urls, token=token)
    evalset_name = args.eval_name.strip() or _generated_evalset_name('sdk', 'batch')

    print('[1/4] Creating evalset...')
    evalset_payload = client.evals_create_eval(
        name=evalset_name,
        description='Eval created by evals_batch_example.py',
        run_environment=backend_run_environment,
        kind='batch',
        schema=_build_eval_schema('batch'),
        cases=_build_batch_cases(),
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
    if run_count >= 3:
        print('Note: run 3+ are intentionally marked as failed in this demo to show status distribution and regression signals.')
    run_ids: list[str] = []
    last_run_expected_failure = False
    for experiment_name, experiment_id, experiment_index in experiment_ids:
        print(f'Creating runs for {experiment_name}...')
        for index in range(run_count):
            run_status = args.run_status if index == 0 else _run_status_for_index(index)
            intentional_failure = _is_intentional_failure(index, run_status)
            run_pass_rate = _pass_rate_for_index(pass_rate, index)
            run_passed_cases = int(round(run_pass_rate * total_cases))
            run_failed_cases = max(0, total_cases - run_passed_cases)

            run_payload = client.evals_create_run(
                experiment_id,
                status=run_status,
                metrics={
                    'pass_rate': run_pass_rate,
                    'total_cases': total_cases,
                    'passed': run_passed_cases,
                    'failed': run_failed_cases,
                    'avg_score': round(run_pass_rate * 0.9 + 0.08, 4),
                },
                summary={
                    'launch_source': 'python-batch-example',
                    'run_mode': 'batch',
                    'run_environment': args.run_environment,
                    'backend_run_environment': backend_run_environment,
                    'model': args.model_name,
                    'prompt_version': args.prompt_version,
                    'experiment_name': experiment_name,
                    'experiment_index': experiment_index,
                    'run_index': index + 1,
                    'scenario': 'regression-suite',
                },
                report={'note': f'batch example run {index + 1} ({experiment_name})'},
                account_uid=account_uid,
            )
            run_id = str((run_payload.get('run') or {}).get('id') or '')
            if not run_id:
                raise RuntimeError(f'Unexpected run response: {run_payload}')
            run_ids.append(run_id)
            run_log_suffix = ' [expected demo failure]' if intentional_failure else ''
            print(
                f'Launched run {index + 1}/{run_count} for {experiment_name}: '
                f'{run_id} ({run_status}){run_log_suffix}'
            )
            last_run_expected_failure = intentional_failure

    print('[4/4] Watching run status...')
    timeout_seconds = max(1, args.timeout)
    started = time.time()
    run_id = run_ids[-1]
    while True:
        snapshot: dict[str, Any] = client.evals_get_run(run_id, account_uid=account_uid)
        status = str((snapshot.get('run') or {}).get('status') or '')
        if status.lower() == 'failed' and last_run_expected_failure:
            print('Run status: failed (expected demo failure)')
        else:
            print(f'Run status: {status}')
        if status.lower() in {'completed', 'failed', 'error', 'cancelled'}:
            break
        if time.time() - started > timeout_seconds:
            raise TimeoutError('Timed out waiting for run status')
        time.sleep(max(1, args.interval))

    print('Done.')
    print(f'Track in UI: {ui_url}/evals')


if __name__ == '__main__':
    main()
