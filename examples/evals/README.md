[![Datalayer](https://assets.datalayer.tech/datalayer-25.svg)](https://datalayer.io)

# Datalayer Evals Examples

This folder contains two Python SDK examples, one per supported `run_mode`:

- `evals_batch_example.py` uses `run_mode=batch`
- `evals_interactive_example.py` uses `run_mode=interactive`

These examples are intentionally **SDK-lane only** (`run_environment=sdk`).

- `sdk`: direct endpoints + backend `run_environment=sdk`
- `sdk-proxy`: local proxy endpoints + backend `run_environment=sdk`

If you need evalsets in the UI lane (`run_environment=ui`), create them from the Evals UI.

## Examples Location

Use this repository path as the canonical location of examples:

- https://github.com/datalayer/core/tree/main/examples/evals

## Files

- `evals_batch_example.py`: create evalset -> 5 experiments -> 3 runs per experiment in batch mode.
- `evals_interactive_example.py`: create evalset -> 5 experiments -> 3 runs per experiment in interactive mode.
- `Makefile`: convenience targets for sdk/sdk-proxy runs and proxy service URLs.

By default, each script now creates experiments configured for real agent execution metadata (cloud/local target + agent spec), then launches three runs per experiment.

Use `--synthetic` to keep deterministic synthetic behavior (seeded metrics/statuses) for testing and demos.

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
- `LOCAL_AGENT_BASE_URL=http://localhost:8765`
- `LOCAL_AGENT_ID=default`
- `LOCAL_AGENT_EVALS_MODE=interactive`
- `LOCAL_AGENT_EVALS_EMIT_LIVE_EVENTS=true`

For `sdk-proxy` local target runs, start `agent-runtimes` first. Example:

```bash
agent-runtimes serve --host 127.0.0.1 --port 8765 --agent-id demo-evals --agent-name default
```

Also ensure local ai-agents proxy is reachable (default `http://localhost:4400`).
If not, start local services first (for example `p pf-local`).

## Make Targets

```bash
make help
make evals-batch-sdk-local
make evals-batch-sdk-cloud
make evals-batch-sdk-proxy-local
make evals-batch-sdk-proxy-cloud
make evals-batch-sdk-proxy-local SYNTHETIC=1
make evals-batch-sdk-proxy-synthetic
make evals-interactive-sdk-local
make evals-interactive-sdk-cloud
make evals-interactive-sdk-proxy-local
make evals-interactive-sdk-proxy-cloud
make evals-interactive-sdk-proxy-local SYNTHETIC=1
make evals-interactive-sdk-proxy-synthetic
```

Target behavior:

- `evals-*-sdk-local` uses local execution target.
- `evals-*-sdk-cloud` uses cloud execution target.
- `evals-*-sdk-proxy-local` uses local execution target and auto-starts an `agent-runtimes` server on a random free port, then bootstraps the local agent (via `POST /api/v1/agents`). These make targets export `DATALAYER_EVALS_MODE=$(LOCAL_AGENT_EVALS_MODE)` and `DATALAYER_EVALS_EMIT_LIVE_EVENTS=$(LOCAL_AGENT_EVALS_EMIT_LIVE_EVENTS)` so local runtime eval emission is enabled by default.
- `evals-*-sdk-proxy-cloud` keeps sdk-proxy endpoints but forces cloud execution target.

Note: GNU make parses flags like `--synthetic` as make options, so use `SYNTHETIC=1` or the `*-synthetic` targets.

## Direct Commands

Batch mode:

```bash
python evals_batch_example.py \
  --eval-name batch-demo \
  --run-environment sdk-proxy \
  --execution-target cloud \
  --agentspec-id demo-evals \
  --run-status completed \
  --clean
```

Batch cloud note:

- Batch cloud mode now launches a runtime pod and submits code for execution.
- Runs should transition to terminal states (`completed`/`failed`) instead of staying queued.
- If your environment has no runtime capacity, creation can still fail before execution starts.

### Cloud execution check

Use this checklist to validate that SDK batch runs are really executed by a cloud agent runtime.

1. Run batch cloud mode:

```bash
make evals-batch-sdk-proxy-cloud
```

2. Pick one created run ID, then inspect execution evidence:

```bash
python - <<'PY'
import os
from datalayer_core import DatalayerClient
from datalayer_core.utils.urls import DatalayerURLs

RUN_ID = '<replace_with_run_id>'

urls = DatalayerURLs.from_environment(
  iam_url='http://localhost:9700',
  runtimes_url='http://localhost:9500',
  ai_agents_url='http://localhost:4400',
)
token = os.environ.get('DATALAYER_API_KEY') or os.environ.get('TEST_DATALAYER_API_KEY')
client = DatalayerClient(urls=urls, token=token)

run = (client.evals_get_run(RUN_ID).get('run') or {})
summary = run.get('summary') or {}
print('status=', run.get('status'))
print('launch_source=', summary.get('launch_source'))
print('run_mode=', summary.get('run_mode'))
print('runtime_pod_name=', summary.get('runtime_pod_name'))
print('execution_url=', summary.get('execution_url'))
print('execution_error=', summary.get('execution_error'))
print('metrics=', run.get('metrics'))
PY
```

Expected success signals:

- `launch_source=ai-agents-batch-executor`
- `runtime_pod_name` is non-empty
- `execution_url` is set
- `status` becomes `completed` or `failed` with populated metrics

If you see HTTP 404 in `execution_error`, runtime routing is not wired correctly yet.

Required wiring for local sdk-proxy setups:

- Start the agent-runtimes service with a Vercel AI route (default in Makefile):

```bash
cd /home/echarles/Content/datalayer-osp/src/ai/agent-runtimes
make agent-serve
```

- Optional protocol override when needed:

```bash
make agent-serve AGENT_SERVE_PROTOCOL=ag-ui
```

- Set `DATALAYER_AGENT_RUNTIMES_URL` in the ai-agents service environment to the reachable agent-runtimes base URL.
- Restart ai-agents so it picks up updated environment values.
- Re-run `make evals-batch-sdk-proxy-cloud`.

Notes from local verification:

- Batch cloud execution path is invoked (`launch_source=ai-agents-batch-executor`).
- Interactive synthetic monitoring path is working and emits live targets/events.
- If agent-runtimes URL is unresolved, batch execution can fail with endpoint 404.

Interactive mode:

```bash
python evals_interactive_example.py \
  --eval-name interactive-demo \
  --run-environment sdk-proxy \
  --execution-target local \
  --local-agent-base-url http://127.0.0.1:8000 \
  --local-agent-id default \
  --agentspec-id demo-evals \
  --run-status running \
  --clean
```

Synthetic test mode:

```bash
python evals_interactive_example.py \
  --eval-name interactive-dry-run \
  --run-environment sdk-proxy \
  --synthetic \
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

## Agent Invocation Modes

The examples now support two modes:

- **Default (no `--synthetic`)**: experiments are configured with explicit execution metadata:
  - `execution_target` (`cloud` or `local`)
  - `agent_spec_id` (set with `--agentspec-id`; defaults to `demo-evals` if omitted)
  - runtime settings (`environment_name`) or local settings (`local_agent_base_url`, `local_agent_id`)
- **`--synthetic`**: uses synthetic metrics/status behavior without requiring synthetic agent-spec defaults.

Flag note:

- Use `--agentspec-id <id>` as the primary flag.
- `--agent-spec-id <id>` is also accepted as an alias.

This allows exercising the same experiment/run model while keeping a deterministic test fallback.

## UI vs SDK Agent Target Rules

- UI-launched evals (`run_environment=ui`) are cloud-agent only.
- SDK-launched evals (`run_environment=sdk`) support both cloud and local agent execution targets.
- Cloud runtimes are intentionally user-managed in these examples and in the UI flow. They are not auto-terminated.

Execution details in these examples:

- `--execution-target cloud` + no `--synthetic`: launches a runtime pod, submits code, and persists run results.
- `--execution-target local` + no `--synthetic` (SDK examples): executes directly from Python against the local Vercel AI chat API (`POST /api/v1/vercel-ai/{agent_id}`) and persists interaction artifacts.
- UI-created runs trigger the ai-agents run API (`POST /evals/experiments/{experiment_id}/runs`), which executes against the configured cloud runtime agent.
- `--synthetic`: does not call any agent API and writes synthetic run data for deterministic demos.

Run interaction artifacts now persisted for UI inspection:

- Prompt sent to the agent (`summary.agent_prompt` / `report.agent_prompt`)
- Output received from the agent (`summary.agent_output` / `report.agent_output`)
- Raw response excerpt when available (`summary.agent_output_text` / `report.agent_output_text`)

When using cloud target, stop runtime resources explicitly when you are done.

## Batch vs Interactive At A Glance

| Dimension | Batch (`run_mode=batch`) | Interactive (`run_mode=interactive`) |
|---|---|---|
| Evaluation target scope | Fixed, versioned case set | Event/live-window driven behavior |
| Primary goal | Deterministic regression comparison | Operational monitoring and drift visibility |
| Typical interpretation | Compare runs on identical baseline | Track changes over time windows and targets |
| Monitoring live targets | Not primary | Primary |
| Good for CI gates | Yes | Usually complementary, not replacement |

## Notes

- Batch mode is intended for deterministic case-based execution.
- Interactive mode is intended for live or near-real-time evaluation workflows.
- Batch example cases cover normalization, formatting, mixed-content, and lightweight unicode scenarios.
- Interactive example cases cover latency expectations, safety/refusal behavior, concise response quality, and JSON formatting requirements.
- Open `/evals` in UI and use the SDK tab to view records created by these examples.
- The UI tab is a separate lane intended for evalsets authored from the web UI.

## Monitoring Tab: How To Trigger Content And What To Expect

Use the interactive example with **agent-enabled** settings to trigger monitoring content intentionally.

Trigger steps:

1. Run the interactive example:

```bash
python evals_interactive_example.py \
  --eval-name monitoring-demo \
  --run-environment sdk-proxy \
  --execution-target local \
  --local-agent-base-url http://127.0.0.1:8000 \
  --local-agent-id default \
  --agentspec-id demo-evals \
  --run-status running \
  --clean
```

2. Open `/evals`, switch to the **SDK** tab, select the created evalset.

3. Open the Monitoring/Live sections.

What to expect:

- You should see interactive run monitoring signals (run status evolution, pass-rate-oriented run summaries).
- Interactive local-agent runs emit live evaluator events directly from the example flow, so live target rows should populate with event counts, pass rate, avg value, and last-event time.
- Interactive cloud runs still depend on runtime-side event emission timing.
- If live targets are empty while runs are present, that typically means no live events were emitted yet (this is normal).

Synthetic mode note:

- `--synthetic` is useful for deterministic regression tests.
- In interactive synthetic mode, the example now writes synthetic live events so Monitoring has visible content.

## Interactive and Online Evals Semantics

In Datalayer, `run_mode=interactive` is the online-evaluation lane:

- target: evaluated runtime target (for example an experiment)
- evaluator: scorer attached to the target
- event: each evaluator result emitted over time

This aligns with event-driven online-evals systems where monitoring focuses on rolling windows, target/evaluator drill-down, and operational feedback rather than deterministic replay.

Quick monitoring verification command:

```bash
python - <<'PY'
import os
from datalayer_core import DatalayerClient
from datalayer_core.utils.urls import DatalayerURLs

urls = DatalayerURLs.from_environment(
  iam_url='http://localhost:9700',
  runtimes_url='http://localhost:9500',
  ai_agents_url='http://localhost:4400',
)
token = os.environ.get('DATALAYER_API_KEY') or os.environ.get('TEST_DATALAYER_API_KEY')
client = DatalayerClient(urls=urls, token=token)
payload = client.evals_list_live_targets(window='24h', limit=20)
print('targets=', len(payload.get('targets') or []))
for target in (payload.get('targets') or [])[:10]:
  print(target.get('target_type'), target.get('target_id'), target.get('event_count'), target.get('pass_rate'))
PY
```

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
