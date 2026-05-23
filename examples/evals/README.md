[![Datalayer](https://assets.datalayer.tech/datalayer-25.svg)](https://datalayer.io)

# Datalayer Evals Examples

This folder contains two Python examples, one per supported `run_mode`:

- `evals_batch_example.py` uses `run_mode=batch`
- `evals_interactive_example.py` uses `run_mode=interactive`

`run_environment` now supports three explicit execution options:

- `cloud`: cloud endpoints + backend `run_environment=cloud`
- `cloud-proxy`: local proxy endpoints + backend `run_environment=cloud`
- `local`: cloud endpoints + backend `run_environment=local`
- `local-proxy`: local proxy endpoints + backend `run_environment=local`

`proxy` is still accepted by the scripts as a deprecated alias of `cloud-proxy`.

## Examples Source

Use this repository path as the canonical source of examples:

- https://github.com/datalayer/core/tree/main/examples/evals

## Files

- `evals_batch_example.py`: create eval dataset -> experiment -> multiple runs in batch mode.
- `evals_interactive_example.py`: create eval dataset -> experiment -> multiple runs in interactive mode.
- `Makefile`: convenience targets for cloud/proxy runs and proxy service URLs.

Each script seeds multiple representative cases and creates multiple runs by default (`--runs 3`) so trend, drift, and run-comparison views are populated.

## Prerequisites

- Python 3.10+
- `datalayer_core` installed
- `DATALAYER_API_KEY` (or `TEST_DATALAYER_API_KEY`) set

Optional:

- `DATALAYER_ACCOUNT_UID` for organization scoping
- local proxy service URLs (`LOCAL_IAM_URL`, `LOCAL_RUNTIMES_URL`, `LOCAL_AI_AGENTS_URL`)

Default local proxy endpoints used by examples for `cloud-proxy` and `local-proxy`:

- `LOCAL_IAM_URL=http://localhost:9700/api/iam/`
- `LOCAL_RUNTIMES_URL=http://localhost:9500/api/runtimes/`
- `LOCAL_AI_AGENTS_URL=http://localhost:4400/api/ai-agents/`

## Make Targets

```bash
make help
make python-batch-cloud
make python-batch-cloud-proxy
make python-batch-local
make python-batch-local-proxy
make python-interactive-cloud
make python-interactive-cloud-proxy
make python-interactive-local
make python-interactive-local-proxy
```

## Direct Commands

Batch mode:

```bash
python evals_batch_example.py \
  --eval-name batch-demo \
  --experiment-name batch-experiment \
  --run-environment cloud-proxy \
  --runs 3 \
  --run-status completed
```

Interactive mode:

```bash
python evals_interactive_example.py \
  --eval-name interactive-demo \
  --experiment-name interactive-experiment \
  --run-environment cloud-proxy \
  --runs 3 \
  --run-status running
```

Pure local mode with direct cloud endpoints (no localhost proxy):

```bash
python evals_batch_example.py \
  --eval-name local-batch-demo \
  --experiment-name local-batch-experiment \
  --run-environment local \
  --runs 3 \
  --run-status completed

python evals_interactive_example.py \
  --eval-name local-interactive-demo \
  --experiment-name local-interactive-experiment \
  --run-environment local \
  --runs 3 \
  --run-status running
```

Local mode through proxy services (local endpoints + backend local mode):

```bash
python evals_batch_example.py \
  --eval-name local-batch-demo \
  --experiment-name local-batch-experiment \
  --run-environment local-proxy \
  --runs 3 \
  --run-status completed

python evals_interactive_example.py \
  --eval-name local-interactive-demo \
  --experiment-name local-interactive-experiment \
  --run-environment local-proxy \
  --runs 3 \
  --run-status running
```

## Notes

- Batch mode is intended for deterministic case-based execution.
- Interactive mode is intended for live or near-real-time evaluation workflows.
- Batch example cases cover normalization, formatting, mixed-content, and lightweight unicode scenarios.
- Interactive example cases cover latency expectations, safety/refusal behavior, concise response quality, and JSON formatting requirements.
- Open `/evals` in UI and use the Cloud/Local tab to match backend mode:
  - `cloud` and `cloud-proxy` map to backend `cloud`
  - `local` and `local-proxy` map to backend `local`

## Schema In The Examples

Both examples create eval datasets with a richer schema object (not just `{ "type": "object" }`).

The schema includes:

- `schema_version`
- `kind`
- `input_schema`
- `output_schema`
- `metadata_schema`

This gives you explicit structure for:

- case inputs
- expected outputs
- metadata used for filtering and interpretation

Example shape:

```json
{
  "schema_version": "1.0",
  "kind": "batch",
  "input_schema": {
    "type": "object",
    "required": ["text"],
    "properties": {
      "text": { "type": "string" }
    }
  },
  "output_schema": {
    "type": "object",
    "properties": {
      "score": { "type": "number", "minimum": 0, "maximum": 1 }
    }
  },
  "metadata_schema": {
    "type": "object",
    "properties": {
      "tags": { "type": "array", "items": { "type": "string" } }
    }
  }
}
```

## Step-by-Step: Actions And UI Interpretation

1. **Run one example**
  - Action: launch either batch or interactive script.
  - UI: a new eval dataset appears in the Cloud/Local tab selected by `run_environment`.

2. **Open the eval dataset**
  - Action: inspect the eval dataset details and case list.
  - UI: you should see multiple representative cases seeded by the example.

2.1 **Inspect schemas**
  - Action: click **Edit schema**.
  - UI: review Input, Output, and Metadata schema tabs.
  - Why it matters: these schemas define expected structure and keep case definitions consistent.

3. **Open the experiment**
  - Action: verify experiment config.
  - UI: confirm `run_mode` (`batch` or `interactive`) and metadata like model/prompt.

4. **Review runs**
  - Action: examples create multiple runs by default (`--runs 3`).
  - UI: run history, trend charts, and drift/compare sections should all populate.

5. **Interpret quality signals**
  - Action: compare statuses and metrics across runs.
  - UI: use pass rate, avg score, duration, and status distribution to identify regressions or improvements.

6. **For interactive mode, check monitoring views**
  - Action: switch to Monitoring/Live sections in `/evals`.
  - UI: inspect target pass rates and event timelines when runtime events are available.
