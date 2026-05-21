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

## Cloud vs Local (Important)

In the `/evals` UI, the **Cloud** and **Local** tabs are driven by `eval.run_environment`:

- **Cloud tab**: `run_environment="cloud"`
- **Local tab**: `run_environment="local"`

The `run_mode` (`offline` / `online` / `sdk`) is different from run environment:

- It describes how runs execute.
- It does **not** decide whether an eval appears in Cloud or Local tab.

Execution mode quick definitions:

- `offline`: run evaluation logic in a non-interactive batch style. Best when you evaluate a fixed set of eval cases and want reproducible, asynchronous-style processing.
- `online`: evaluate live traffic or near-real-time events as they happen. Best for continuous monitoring and production feedback loops.
- `sdk`: run via SDK-driven orchestration from client code/scripts (for example these Python examples), where you control run creation and metadata programmatically.

Rule of thumb:

- `run_environment` controls **where an eval is run and listed** (Cloud or Local).
- `run_mode` controls **how the run is executed**.

## Scope of These Examples

The examples are **not** limited to sdk mode.

- Quickstart and feature-tour commands default to `run_mode=sdk` because that is the easiest beginner path.
- The same scripts support `offline`, `online`, and `sdk` execution modes.
- You can choose any mode with `--run-mode` in direct Python commands.

Ready-to-run mode targets are provided:

- `make python-quickstart-local-offline`
- `make python-quickstart-local-online`
- `make python-quickstart-sdk`
- `make python-feature-tour-local-offline`
- `make python-feature-tour-local-online`
- `make python-feature-tour-sdk`

If you use local service URLs, equivalent `-local` targets are also available:

- `make python-quickstart-local-offline-local`
- `make python-quickstart-local-online-local`
- `make python-feature-tour-local-offline-local`
- `make python-feature-tour-local-online-local`

### Run Environment × Run Mode Matrix

This matrix clarifies what is supported and what each axis controls.

| `run_environment` value | Tab in `/evals` UI | Supported `run_mode` values in examples |
| --- | --- | --- |
| `cloud` | Cloud | `offline`, `online`, `sdk` |
| `local` | Local | `offline`, `online`, `sdk` |

Interpretation:

- The `run_environment` column affects UI placement (Cloud vs Local tab).
- The `run_mode` column affects run behavior.
- These two dimensions are independent in the example scripts.

If you want your eval to appear in Local tab, create it with `--run-environment local`.

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
make python-quickstart-sdk
```

### Option B: run against local services (explicit URL flags)

```bash
make python-quickstart-sdk-local
```

This target passes these flags directly to the script:

- `--iam-url http://localhost:9700/api/iam/`
- `--runtimes-url http://localhost:9500/api/runtimes/`
- `--ai-agents-url http://localhost:4400/api/ai-agents/`

### Option C: cloud vs local explicit targets

```bash
make python-quickstart-cloud
make python-quickstart-sdk
```

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

## Feature Tour (Comparison + Drift)

This path creates enough runs to populate charts and comparison views.

### Option A: one command

```bash
make python-feature-tour-sdk
```

### Option C: run against local services (explicit URL flags)

```bash
make python-feature-tour-sdk-local
```

This target passes these flags directly to the script:

- `--iam-url http://localhost:9700/api/iam/`
- `--runtimes-url http://localhost:9500/api/runtimes/`
- `--ai-agents-url http://localhost:4400/api/ai-agents/`

### Option B: cloud vs local explicit targets

```bash
make python-feature-tour-cloud
make python-feature-tour-sdk
```

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
make python-quickstart-sdk-local
make python-feature-tour-cloud-local
make python-feature-tour-sdk-local
```

Note on URL format:

- You can pass either service URLs (for example `http://localhost:4400/api/ai-agents/`) or plain base URLs (`http://localhost:4400`).
- The Python examples normalize `--iam-url`, `--runtimes-url`, and `--ai-agents-url` to avoid duplicated path segments such as `/api/ai-agents/api/ai-agents/...`.
- CLI local targets normalize `LOCAL_AI_AGENTS_URL` to a base URL before calling `datalayer evals ...`.

You can override defaults per run:

```bash
make python-quickstart-local \
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
