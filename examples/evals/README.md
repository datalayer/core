[![Datalayer](https://assets.datalayer.tech/datalayer-25.svg)](https://datalayer.io)

[![Become a Sponsor](https://img.shields.io/static/v1?label=Become%20a%20Sponsor&message=%E2%9D%A4&logo=GitHub&style=flat&color=1ABC9C)](https://github.com/sponsors/datalayer)

# Datalayer Evals Examples

> Beginner Guide

This folder gives you two ways to learn Evals from scratch:

1. Quickstart path: one eval, one experiment, one run.
2. Feature tour path: multiple experiments and runs so UI charts (drift + comparison) are meaningful.

If you are new, do both in order.

## What You Will Learn

After running the examples, you will understand how to:

- Create cloud evals.
- Create experiments inside the same eval.
- Launch runs with metrics.
- Compare runs and experiments.
- Interpret drift in pass-rate trends.
- Validate everything in the `/evals` UI.

## Evals Concepts In Docs

Conceptual Evals documentation lives in the docs site:

- [Evals](/docs/evals)
- [Evals SDK](/docs/evals-sdk)
- [Evals Run Modes](/docs/evals-run-modes)
- [Evals AgentSpecs](/docs/evals-agentspecs)

This README stays focused on the practical workflow in this folder: Make targets,
script commands, and how to inspect results in the UI.

## Ready-To-Run Target Families

- Local tab defaults: `python-quickstart-local`, `python-feature-tour-local`
- Cloud tab defaults: `python-quickstart-cloud`, `python-feature-tour-cloud`
- Local services URLs: `python-quickstart-local-services`, `python-feature-tour-local-services`
- Local run modes: `python-quickstart-local-offline`, `python-quickstart-local-online`
- Feature tour run modes: `python-feature-tour-local-offline`, `python-feature-tour-local-online`

## Files In This Folder

- `Makefile`: CLI + Python helper targets.
- `launch_and_monitor.py`: beginner quickstart script.
- `feature_tour.py`: richer eval data for comparison and drift charts.

## Prerequisites

- Python 3.10+
- `datalayer_core` installed
- Environment token set:
  - `DATALAYER_API_KEY` (or `TEST_DATALAYER_API_KEY`)
- Optional:
  - `DATALAYER_AI_AGENTS_URL` for non-default environments
  - `DATALAYER_ACCOUNT_UID` for organization scoping

Sanity checks:

```bash
datalayer evals --help
make help
```

## Quickstart (Newbies Start Here)

This path gives you a minimal success first.

### Option A: one command

```bash
make python-quickstart-local
```

This default quickstart writes `run_environment=local`, so results appear in the **Local** tab.

Equivalent legacy target: `make python-quickstart-sdk`.

### Option B: run against local services (explicit URL flags)

```bash
make python-quickstart-local-services
```

Equivalent legacy target: `make python-quickstart-sdk-local`.

This target passes these flags directly to the script:

- `--iam-url http://localhost:9700/api/iam/`
- `--runtimes-url http://localhost:9500/api/runtimes/`
- `--ai-agents-url http://localhost:4400/api/ai-agents/`

### Option C: choose where the eval appears (Cloud vs Local)

```bash
make python-quickstart-cloud
make python-quickstart-local
```

Use this when you want to be explicit about UI placement:

- `python-quickstart-cloud` -> `run_environment=cloud` (Cloud tab)
- `python-quickstart-local` -> `run_environment=local` (Local tab)

### Option D: explicit script call

```bash
python launch_and_monitor.py \
  --eval-name newbie-eval \
  --experiment-name newbie-experiment \
  --run-environment local \
  --run-mode sdk \
  --run-status completed \
  --pass-rate 0.92 \
  --total-cases 10 \
  --trace-backend trace-hub \
  --model-name openai:gpt-5-mini \
  --prompt-version v1
```

What this script does:

1. Creates eval.
2. Creates experiment.
3. Creates run with your pass-rate metrics.
4. Polls until terminal status.

Then open `/evals` and confirm your run appears.

If you still do not see it, check the active account context in the UI
(user vs organization). The run is listed under the account that created it.

## Feature Tour (Comparison + Drift)

This path creates enough runs to populate charts and comparison views.

### Option A: one command

```bash
make python-feature-tour-local
```

This default feature tour writes `run_environment=local`, so results appear in the **Local** tab.

Equivalent legacy target: `make python-feature-tour-sdk`.

### Option B: choose where the eval appears (Cloud vs Local)

```bash
make python-feature-tour-cloud
make python-feature-tour-local
```

Use this when you want to be explicit about UI placement:

- `python-feature-tour-cloud` -> `run_environment=cloud` (Cloud tab)
- `python-feature-tour-local` -> `run_environment=local` (Local tab)

### Option C: run against local services (explicit URL flags)

```bash
make python-feature-tour-local-services
```

Equivalent legacy target: `make python-feature-tour-sdk-local`.

This target passes these flags directly to the script:

- `--iam-url http://localhost:9700/api/iam/`
- `--runtimes-url http://localhost:9500/api/runtimes/`
- `--ai-agents-url http://localhost:4400/api/ai-agents/`

### Option D: explicit script call

```bash
python feature_tour.py \
  --eval-name feature-tour-eval \
  --experiment-names baseline,candidate \
  --run-environment local \
  --runs-per-experiment 5 \
  --status completed \
  --run-mode sdk \
  --trace-backend trace-hub \
  --model-name openai:gpt-5-mini \
  --prompt-version v2
```

What this script does:

1. Creates one eval.
2. Creates multiple experiments inside that eval.
3. Creates multiple runs per experiment with different pass-rate curves.
4. Computes and prints drift per experiment.
5. Calls run comparison API for latest runs.

This is the easiest way to verify the new charts in the UI.

## CLI Path (Step-by-Step)

If you want to learn raw CLI first:

```bash
make list-evals
make create-eval
make create-experiment
make launch-run
make watch-run
make list-runs
make live-targets
```

Notes:

- IDs are persisted in `.evals.env`.
- `make clean` removes local `.evals.env` state only.

## Local Services Setup (Separate Section)

If you run services locally, use these endpoints:

- IAM: `http://localhost:9700/api/iam/`
- Runtimes: `http://localhost:9500/api/runtimes/`
- AI Agents: `http://localhost:4400/api/ai-agents/`

Use the dedicated Make targets:

```bash
make list-evals-local
make create-eval-local
make create-experiment-local
make launch-run-local
make watch-run-local
make list-runs-local
make live-targets-local
make python-quickstart-cloud-local
make python-quickstart-local-services
make python-feature-tour-cloud-local
make python-feature-tour-local-services
```

Note on URL format:

- You can pass either service URLs (for example `http://localhost:4400/api/ai-agents/`) or plain base URLs (`http://localhost:4400`).
- The Python examples normalize `--iam-url`, `--runtimes-url`, and `--ai-agents-url` to avoid duplicated path segments such as `/api/ai-agents/api/ai-agents/...`.
- CLI local targets normalize `LOCAL_AI_AGENTS_URL` to a base URL before calling `datalayer evals ...`.

You can override defaults per run:

```bash
make python-quickstart-local-services \
  LOCAL_IAM_URL=http://localhost:9700/api/iam/ \
  LOCAL_RUNTIMES_URL=http://localhost:9500/api/runtimes/ \
  LOCAL_AI_AGENTS_URL=http://localhost:4400/api/ai-agents/
```

## Verify Features In UI

Open `/evals`, choose your eval, then confirm:

### Experiment Insights (single experiment)

- Pass-rate trend chart
- Status distribution chart
- Performance chart (Avg Score / Duration)
- Drift card (latest vs baseline)
- Launch-origin filtering (All / CLI / UI)

### Compare Experiments In This Eval

- Latest pass rate chart across experiments
- Drift delta chart across experiments
- Trend overlay chart for selected experiments
- Summary list (runs, latest pass-rate, drift points)

### Run Comparison

- Select run A and B
- Compare pass-rate and status deltas

### Live Monitoring (What You Can Do)

- Track online evaluator activity by target (`target_id`, `target_type`).
- Filter by time window (`1h`, `6h`, `24h`, `7d`, `30d`).
- Inspect per-target metrics:
  - total events
  - passed events
  - pass-rate
  - average value
  - last event timestamp
- Drill into recent events and filter by evaluator name.
- Use paging to inspect older events.

Practical uses:

- Verify your online evaluators are receiving traffic.
- Spot sudden pass-rate drops after deployment.
- Check which evaluator is failing most often.
- Validate that your target emits events in expected volume.

## Feature Coverage Matrix

| Feature | launch_and_monitor.py | feature_tour.py | CLI Make targets |
| --- | --- | --- | --- |
| Create eval | Yes | Yes | `create-eval` |
| Create experiment | Yes | Yes (multiple) | `create-experiment` |
| Create run | Yes | Yes (multiple) | `launch-run` |
| Watch run | Yes | No (runs are created terminal) | `watch-run` |
| Drift data generation | Limited | Yes | Manual |
| Experiment-to-experiment comparison data | Limited | Yes | Manual |
| Live targets query | No | No | `live-targets` |

## Second-Pass Coverage: Advanced Agent + Tracing Features

This section maps key advanced evaluation and observability capabilities to
assets in this folder.

### Evaluation and agent coverage

- Eval lifecycle mental model (`Eval` -> `Experiment` -> `Run`): covered in
  `launch_and_monitor.py` and `feature_tour.py`.
- Drift and multi-run behavior: covered in `feature_tour.py`
  (`--runs-per-experiment`).
- Experiment comparison in the same eval: covered by `feature_tour.py`
  + `/evals` UI charts.
- Experiment metadata discipline (`model`, `prompt_version`): covered by
  CLI flags in both Python scripts.
- Online telemetry semantics (`trace_backend`, `otel_service` markers):
  covered by both scripts for beginner observability.

### Tracing and scoring coverage

- Trace/session identity markers (`trace_id`, `session_id`): generated in run summaries.
- Trace backend labeling (`trace_backend=trace-hub`): supported by both scripts.
- Eval/experiment workflow patterns:
  quickstart + feature tour scripts.
- Beginner-ready recipes for:
  - offline eval runs
  - online evaluation hooks
  - tracing and scoring patterns

### Quick confidence checklist

1. Run `make python-quickstart` and confirm one run appears in `/evals`.
2. Run `make python-feature-tour` and confirm compare+drift charts populate.
3. Open run details and verify summary includes `model`, `prompt_version`, and `trace_backend`.
4. Reuse the script metadata fields to wire your real agent app.

## Troubleshooting

- `401 Unauthorized`: token missing/invalid.
- Empty UI page for your data: check `DATALAYER_ACCOUNT_UID` matches current account context.
- Run stuck in `queued`: for true online execution, runtime/environment wiring is required.
- `Could not extract EVAL_ID`: run the CLI command directly and inspect stderr.

## Suggested Learning Sequence

1. `make python-quickstart`
2. `make python-feature-tour`
3. Open `/evals` and inspect all chart sections
4. Repeat `feature_tour.py` with different experiment names and run counts

## Related Files

- `datalayer_core/mixins/evals.py`
- `datalayer_core/cli/commands/evals.py`
- `services/ai-agents/datalayer_ai_agents/api/v1/endpoints/evals.py`
- `ui/src/views/evals/AIEvals.tsx`
