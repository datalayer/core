# Datalayer Evals CLI Examples

This example walks you through the **`datalayer evals`** CLI step by step.
You will create an eval dataset, attach an experiment, launch a run, and watch
it to completion — all from your terminal, mirroring the Pydantic Evals mental
model (`Dataset` -> `Case` -> `Experiment` -> `Run` -> `Report`).

The runs you launch here will also show up in the Datalayer UI at
`/agents/evals`, on the **Experiment Insights** panel with pass-rate trend,
performance, and drift plots.

## Prerequisites

- Python 3.10+ with `datalayer_core` installed.
- A Datalayer API token exported in one of:
  - `DATALAYER_API_KEY`
  - `TEST_DATALAYER_API_KEY`
- (Optional) `DATALAYER_AI_AGENTS_URL` for non-default SaaS environments.
- (Optional) `DATALAYER_ACCOUNT_UID` to scope everything to an organization.

Sanity check:

```bash
datalayer evals --help
```

You should see four sub-commands: `datasets`, `experiments`, `runs`, `live`.

## How This Example Is Wired

- All commands run through `make` targets defined in [`Makefile`](./Makefile).
- IDs are persisted between targets in a local `.evals.env` file
  (`DATASET_ID`, `EXPERIMENT_ID`, `RUN_ID`).
- An end-to-end Python equivalent of the flow lives in
  [`launch_and_monitor.py`](./launch_and_monitor.py).

## Step-by-Step Walkthrough

### 1. Discover the available targets

```bash
make help
```

Lists every Make target with a one-line description. Use this as your menu.

### 2. List existing eval datasets

```bash
make list-datasets
```

Calls `datalayer evals datasets list --limit 20`. This is the hosted view of
your `EvalDataset` objects (equivalent to Logfire's **Eval Datasets** page).

### 3. Create a hosted eval dataset

```bash
make create-dataset
```

- Runs `datalayer evals datasets create <name>` with a date-stamped name.
- Parses the new dataset UUID from the CLI output.
- Writes `DATASET_ID=<uuid>` into `.evals.env`.

Maps to Pydantic Evals: this creates the empty **`Dataset`** that will hold
your `Case`s. You can later add cases through the UI (`/agents/evals` ->
Dataset detail -> Add Case) or via API.

### 4. Create an experiment bound to the dataset

```bash
make create-experiment
```

- Requires `DATASET_ID` (Step 3).
- Runs `datalayer evals experiments create <name> --dataset-id $DATASET_ID`.
- Persists `EXPERIMENT_ID` into `.evals.env`.

An **Experiment** groups one or more `Run`s of the same dataset under a
shared configuration (think "v1", "v2" iterations of a prompt or agent).

### 5. Launch a run

```bash
make launch-run
```

- Requires `EXPERIMENT_ID`.
- Runs `datalayer evals runs launch --experiment-id $EXPERIMENT_ID --status queued`.
- The CLI automatically writes provenance metadata into `summary`:
  - `summary.launch_source = "datalayer-cli"`
  - `summary.launched_at = "<ISO timestamp>"`
- Persists `RUN_ID` into `.evals.env`.

In the Datalayer UI these CLI-launched runs are highlighted in the
**Experiment Insights** panel under the **CLI Only** filter and counted in
the `CLI launched` KPI.

### 6. Watch the run

```bash
make watch-run
```

Polls `datalayer evals runs watch $RUN_ID --interval 3 --timeout 600` and
prints status transitions until the run reaches a terminal state
(`completed`, `failed`, `cancelled`) or the timeout expires.

This is the offline-eval equivalent of waiting for `Dataset.evaluate(...)`
to finish locally — the SaaS engine does the work and the CLI reports
status.

### 7. List runs for the experiment

```bash
make list-runs
```

Shows all runs (CLI- or UI-launched) for the current `EXPERIMENT_ID`. Useful
for confirming that the run you just launched is visible alongside any
others and for grabbing the IDs you want to compare in the UI.

### 8. Inspect live monitoring targets

```bash
make live-targets
```

Calls `datalayer evals live targets --window 24h --limit 20` and shows the
agents/runtimes that have produced live evaluator events recently. This is
the read side of Logfire's **Live Monitoring** experience.

### 9. Tear down local state

```bash
make clean
```

Removes `.evals.env`. The hosted resources stay; delete those via the UI or
`datalayer evals datasets delete <id>` / `experiments delete <id>` if you
want a full cleanup.

## Verifying in the UI

1. Open `/agents/evals` in Datalayer.
2. Switch to the **Eval Datasets** pane.
3. Pick your CLI-created experiment (or let it auto-select).
4. The **Experiment Insights** panel will show:
   - **Pass-rate trend** — sparkline over recent runs with per-run tooltips
     (id, timestamp, status, source, pass/fail/total).
   - **Status distribution** — bar chart of `completed`/`failed`/`running`.
   - **Performance** — line chart toggleable between `Avg Score` and
     `Duration` (segmented control above the chart).
   - **Drift** — pass-rate delta of the latest run vs the baseline (average
     of the earliest runs).
   - **KPI box** — `Runs shown`, `Total runs`, `CLI launched`, `UI launched`,
     `Avg pass rate`.
5. Use the **CLI Only / UI Only / All Sources** segmented control to isolate
   runs by provenance.

## End-to-End Python Variant

Prefer Python over Make? Run:

```bash
python launch_and_monitor.py
```

This uses `DatalayerClient` directly (`EvalsMixin`) to create dataset +
experiment + run and poll until terminal status — handy if you want to embed
the workflow in a larger script.

## Mapping to Pydantic Evals / Logfire

| Concept (Pydantic Evals / Logfire) | This Example                                         |
| ---------------------------------- | ---------------------------------------------------- |
| `Dataset`                          | `make create-dataset`                                |
| `Case` (input/expected/metadata)   | Added via UI or API after `create-dataset`           |
| Evaluators                         | Configured on the experiment / case                  |
| Experiment iteration               | `make create-experiment`                             |
| `Dataset.evaluate(...)` (offline)  | `make launch-run` + `make watch-run`                 |
| Online evaluator events            | `make live-targets`                                  |
| Report metrics / drift             | UI **Experiment Insights** panel (trend + drift)     |

## Troubleshooting

- **`Could not extract DATASET_ID`** — the CLI output did not contain a UUID.
  Run the underlying command manually (`datalayer evals datasets create ...`)
  to inspect the error.
- **`401 Unauthorized`** — confirm `DATALAYER_API_KEY` is set and valid.
- **`Run never leaves queued`** — verify the experiment is wired to a runtime
  pod (online evals require `runtime_pod_name` + `environment_name` on the
  run). Use the UI to launch an online run if you don't have those values
  handy from the terminal.
- **Run not visible in UI** — confirm `DATALAYER_ACCOUNT_UID` matches the
  account context you are viewing in the UI.

## Related

- `services/ai-agents/datalayer_ai_agents/api/v1/endpoints/evals.py` — the
  authoritative API surface.
- `core/datalayer_core/mixins/evals.py` — the `EvalsMixin` powering this CLI.
- `core/datalayer_core/cli/commands/evals.py` — Typer command definitions.
- `ui/src/views/evals/AIEvals.tsx` — the UI consuming the same endpoints.
