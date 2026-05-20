# Datalayer Evals Examples (Beginner Guide)

This folder gives you two ways to learn Evals from scratch:

1. Quickstart path: one eval, one experiment, one run.
2. Feature tour path: multiple experiments and runs so UI charts (drift + comparison) are meaningful.

If you are new, do both in order.

## What You Will Learn

After running the examples, you will understand how to:

- Create hosted evals.
- Create experiments inside the same eval.
- Launch runs with metrics.
- Compare runs and experiments.
- Interpret drift in pass-rate trends.
- Validate everything in the `/evals` UI.

## Files In This Folder

- `Makefile`: CLI + Python helper targets.
- `launch_and_monitor.py`: beginner quickstart script.
- `feature_tour.py`: richer dataset for comparison and drift charts.

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
make python-quickstart
```

### Option B: explicit script call

```bash
python launch_and_monitor.py \
  --eval-name newbie-eval \
  --experiment-name newbie-experiment \
  --execution-mode sdk \
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
make python-feature-tour
```

### Option B: explicit script call

```bash
python feature_tour.py \
  --eval-name feature-tour-eval \
  --experiment-names baseline,candidate \
  --runs-per-experiment 5 \
  --status completed \
  --execution-mode sdk \
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

## Verify Features In UI

Open `/evals`, choose your eval, then confirm:

### Experiment Insights (single experiment)

- Pass-rate trend chart
- Status distribution chart
- Performance chart (Avg Score / Duration)
- Drift card (latest vs baseline)
- Source filtering (All / CLI / UI)

### Compare Experiments In This Eval

- Latest pass rate chart across experiments
- Drift delta chart across experiments
- Trend overlay chart for selected experiments
- Summary list (runs, latest pass-rate, drift points)

### Run Comparison

- Select run A and B
- Compare pass-rate and status deltas

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
- Dataset/experiment workflow patterns:
  quickstart + feature tour scripts.
- Beginner-ready recipes for:
  - offline dataset runs
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

## Related Source Files

- `datalayer_core/mixins/evals.py`
- `datalayer_core/cli/commands/evals.py`
- `services/ai-agents/datalayer_ai_agents/api/v1/endpoints/evals.py`
- `ui/src/views/evals/AIEvals.tsx`
