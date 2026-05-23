[![Datalayer](https://assets.datalayer.tech/datalayer-25.svg)](https://datalayer.io)

# Datalayer Evals Examples

This folder contains two Python SDK examples, one per supported `run_mode`:

- `evals_batch_example.py` uses `run_mode=batch`
- `evals_interactive_example.py` uses `run_mode=interactive`

These examples are intentionally **SDK-lane only** (`run_environment=sdk`).

- `sdk`: direct endpoints + backend `run_environment=sdk`
- `sdk-proxy`: local proxy endpoints + backend `run_environment=sdk`

If you need evalsets in the UI lane (`run_environment=ui`), create them from the Evals UI.

## Examples Source

Use this repository path as the canonical source of examples:

- https://github.com/datalayer/core/tree/main/examples/evals

## Files

- `evals_batch_example.py`: create evalset -> 5 experiments -> 3 runs per experiment in batch mode.
- `evals_interactive_example.py`: create evalset -> 5 experiments -> 3 runs per experiment in interactive mode.
- `Makefile`: convenience targets for sdk/sdk-proxy runs and proxy service URLs.

Each script seeds multiple representative cases and creates three runs per experiment so trend, drift, and run-comparison views are populated.

Each script currently creates 5 experiments and 3 runs per experiment.

## Prerequisites

- Python 3.10+
- `datalayer_core` installed
- `DATALAYER_API_KEY` (or `TEST_DATALAYER_API_KEY`) set

Optional:

- `DATALAYER_ACCOUNT_UID` for organization scoping
- local proxy service URLs (`LOCAL_IAM_URL`, `LOCAL_RUNTIMES_URL`, `LOCAL_AI_AGENTS_URL`)

Default local proxy endpoints used by examples for `sdk-proxy`:

- `LOCAL_IAM_URL=http://localhost:9700/api/iam/`
- `LOCAL_RUNTIMES_URL=http://localhost:9500/api/runtimes/`
- `LOCAL_AI_AGENTS_URL=http://localhost:4400/api/ai-agents/`

## Make Targets

```bash
make help
make evals-batch-sdk
make evals-batch-sdk-proxy
make evals-interactive-sdk
make evals-interactive-sdk-proxy
```

## Direct Commands

Batch mode:

```bash
python evals_batch_example.py \
  --eval-name batch-demo \
  --run-environment sdk-proxy \
  --run-status completed \
  --clean
```

Interactive mode:

```bash
python evals_interactive_example.py \
  --eval-name interactive-demo \
  --run-environment sdk-proxy \
  --run-status running \
  --clean
```

Direct endpoint mode (no localhost proxy):

```bash
python evals_batch_example.py \
  --eval-name sdk-batch-demo \
  --run-environment sdk \
  --run-status completed \
  --clean

python evals_interactive_example.py \
  --eval-name sdk-interactive-demo \
  --run-environment sdk \
  --run-status running \
  --clean
```

SDK mode through proxy services (local endpoints + backend sdk mode):

```bash
python evals_batch_example.py \
  --eval-name sdk-batch-demo \
  --run-environment sdk-proxy \
  --run-status completed \
  --clean

python evals_interactive_example.py \
  --eval-name sdk-interactive-demo \
  --run-environment sdk-proxy \
  --run-status running \
  --clean
```

## Datalayer CLI: Comparison Report Invocation

After running one of the examples, generate an evalset-level comparison report with the Datalayer CLI.

1. List evalsets in the SDK lane and copy the target evalset ID:

```bash
datalayer evals evals list --run-environment sdk
```

2. Generate the comparison report:

```bash
datalayer evals evals compare-report <evalset_id>
```

Useful options:

- `--run-limit 100` to increase runs fetched per experiment.
- `--account-uid <uid>` for org/account context.
- `--raw` to print JSON report output.
- `--ai-agents-url <url>` and `--token <token>` for explicit endpoint/auth.

## Agent Invocation: What Is Executed In These Examples

These two scripts are **dataset-and-run seeding examples**, not agent execution runners.

What the scripts do:

- create one evalset with a rich schema
- create five experiments per evalset (`...-experiment-1`, `...-experiment-2`, `...-experiment-3`, `...-experiment-4`, `...-experiment-5`)
- create three runs per experiment
- create evaluation records and per-run summaries so `/evals` comparison, trend, and drift UI sections are populated

What the scripts do not do:

- they do **not** invoke your target application/agent endpoint
- they do **not** execute model inference per case at runtime

So where is the "agent" in these examples?

- The agent/model behavior is represented by the seeded run/evaluation outputs.
- This is intentional so the examples are deterministic and immediately useful for UI/CLI walkthroughs.

If you want real agent invocation:

- run your app/agent yourself for each case and write outputs/metrics back through the evals APIs, or
- use launch/runner workflows (for example via CLI compare/report flows) that execute submitted code or connected runtime logic.

In short: these examples showcase the eval data model and analysis workflow end-to-end; they are not a live executor for your agent.

## Notes

- Batch mode is intended for deterministic case-based execution.
- Interactive mode is intended for live or near-real-time evaluation workflows.
- Batch example cases cover normalization, formatting, mixed-content, and lightweight unicode scenarios.
- Interactive example cases cover latency expectations, safety/refusal behavior, concise response quality, and JSON formatting requirements.
- Open `/evals` in UI and use the SDK tab to view records created by these examples.
- The UI tab is a separate lane intended for evalsets authored from the web UI.

## Monitoring Tab: How To Trigger Content And What To Expect

Use the interactive example to trigger monitoring content intentionally.

Trigger steps:

1. Run the interactive example:

```bash
python evals_interactive_example.py \
  --eval-name monitoring-demo \
  --run-environment sdk-proxy \
  --run-status running \
  --clean
```

2. Open `/evals`, switch to the **SDK** tab, select the created evalset.

3. Open the Monitoring/Live sections.

What to expect:

- You should see interactive run monitoring signals (run status evolution, pass-rate-oriented run summaries).
- If your runtime pipeline emits live eval events, live target rows will populate with event counts, pass rate, avg value, and last-event time.
- If live targets are empty while runs are present, that typically means no live events were emitted yet (this is normal).

## Schema In The Examples

Both examples create evalsets with a richer schema object (not just `{ "type": "object" }`).

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
  - UI: a new evalset appears in the SDK tab (`run_environment=sdk`).

2. **Open the evalset**
  - Action: inspect the evalset details and case list.
  - UI: you should see multiple representative cases seeded by the example.

2.1 **Inspect schemas**
  - Action: click **Edit schema**.
  - UI: review Input, Output, and Metadata schema tabs.
  - Why it matters: these schemas define expected structure and keep case definitions consistent.

3. **Open the experiment**
  - Action: verify experiment config.
  - UI: confirm `run_mode` (`batch` or `interactive`) and metadata like model/prompt.

4. **Review runs**
  - Action: examples create three runs per experiment by default.
  - UI: run history, trend charts, and drift/compare sections should all populate.

5. **Interpret quality signals**
  - Action: compare statuses and metrics across runs.
  - UI: use pass rate, avg score, duration, and status distribution to identify regressions or improvements.

6. **For interactive mode, check monitoring views**
  - Action: switch to Monitoring/Live sections in `/evals`.
  - UI: inspect target pass rates and event timelines when runtime events are available.
