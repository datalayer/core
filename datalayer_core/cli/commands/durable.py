# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

# Copyright (c) 2023-2026 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""
The ``datalayer durable`` command group.

`datalayer-durable`'s own workflow engine, for a platform administrator
troubleshooting it directly (2026-09-13)::

    datalayer durable list
    datalayer durable describe exec_123
    datalayer durable describe-execution exec_123 --account org_1
    datalayer durable start NotebookRunWorkflow --task-uid tsk_1
    datalayer durable signal exec_123 approved
    datalayer durable cancel exec_123
    datalayer durable operations

Every other caller of durable is a service presenting its own workload key —
``durable/datalayer_durable/auth.py`` says so, and stays that way. This is
the one exception, gated on the ``platform_admin`` role rather than a
service identity, over the same ``DATALAYER_API_KEY`` bearer token every
other command here already sends.
"""

from __future__ import annotations

import json
from typing import Optional

import typer
import yaml
from rich.table import Table

from datalayer_core.cli.commands.contents import OutputFormat
from datalayer_core.cli.commands.orchestration_common import (
    call,
    client,
    console,
    emit,
    orchestration_command,
    output_option,
)
from datalayer_core.mixins.durable import WorkflowRun

app = typer.Typer(
    name="durable",
    help="Durable: the workflow engine behind orchestration, for troubleshooting directly.",
    no_args_is_help=True,
)


def _run_table(run: WorkflowRun) -> Table:
    """Render one run as a two-column table."""
    table = Table(show_header=False, box=None)
    table.add_row("uid", run.uid)
    table.add_row("workflow", run.workflow)
    table.add_row("status", run.status)
    table.add_row("task_uid", run.task_uid)
    table.add_row("queue", run.queue)
    if run.error:
        table.add_row("error", json.dumps(run.error, default=str))
    return table


def _runs_table(runs: list[WorkflowRun]) -> Table:
    """Render runs as a table, one row each."""
    table = Table()
    for column in ("uid", "workflow", "status", "task_uid", "queue"):
        table.add_column(column)
    for run in runs:
        table.add_row(run.uid, run.workflow, run.status, run.task_uid, run.queue)
    return table


@app.command("list")
@orchestration_command
def list_workflows(
    task_uid: Optional[str] = typer.Option(
        None, "--task-uid", help="Only runs under this task uid."
    ),
    limit: int = typer.Option(
        50, "--limit", help="At most this many, oldest open first."
    ),
    output: OutputFormat = output_option(),
) -> None:
    """The open runs durable holds, or those of one task uid."""
    runs = call(
        lambda: client().list_open_durable_workflows(
            task_uid=task_uid or "", limit=limit
        )
    )
    if emit([run.__dict__ for run in runs], output):
        return
    if not runs:
        console.print("Nothing open.")
        return
    console.print(_runs_table(runs))


@app.command("describe")
@orchestration_command
def describe(
    uid: str = typer.Argument(
        ...,
        help="The workflow's own uid — a literal `task_uid`, not an execution id past its first attempt.",
    ),
    output: OutputFormat = output_option(),
) -> None:
    """
    One run, by its own uid.

    For an orchestration execution that may have retried, `describe-execution` asks
    about its *current* attempt instead — this only ever answers about the uid given,
    which for an execution means attempt 1.
    """
    run = call(lambda: client().describe_durable_workflow(uid))
    if run is None:
        console.print(f"No run {uid!r}.", style="red", markup=False, highlight=False)
        raise typer.Exit(1)
    if emit(run.__dict__, output):
        return
    console.print(_run_table(run))


@app.command("describe-execution")
@orchestration_command
def describe_execution(
    execution_id: str = typer.Argument(..., help="The execution."),
    account: str = typer.Option(
        ..., "--account", help="The account the execution belongs to."
    ),
    output: OutputFormat = output_option(),
) -> None:
    """
    Describe the run of an orchestration execution's *current* attempt.

    The one durable route that is execution-aware rather than a literal
    workflow uid (ORCHESTRATOR.md, O4-05). Not defaulted to your own account:
    a platform administrator is as likely investigating someone else's.
    """
    run = call(
        lambda: client().describe_durable_execution(execution_id, account_uid=account)
    )
    if run is None:
        console.print(
            f"No run for execution {execution_id!r}.",
            style="red",
            markup=False,
            highlight=False,
        )
        raise typer.Exit(1)
    if emit(run.__dict__, output):
        return
    console.print(_run_table(run))


@app.command("start")
@orchestration_command
def start(
    workflow: str = typer.Argument(
        ..., help="The workflow's name, as durable's catalog knows it."
    ),
    task_uid: str = typer.Option(
        ...,
        "--task-uid",
        help="Its identity — the same request twice answers the run that already exists.",
    ),
    queue: str = typer.Option("", "--queue"),
    arguments: Optional[str] = typer.Option(
        None, "--arguments", help="A JSON object, the workflow's own arguments."
    ),
    output: OutputFormat = output_option(),
) -> None:
    """
    Start a workflow directly.

    What every service caller does through its own key, done here as yourself —
    troubleshooting, not the ordinary path a person's work takes (that is `datalayer
    executions run`).
    """
    parsed = call(lambda: json.loads(arguments) if arguments else {})
    run = call(
        lambda: client().start_durable_workflow(
            workflow, task_uid=task_uid, queue=queue, arguments=parsed
        )
    )
    if emit(run.__dict__, output):
        return
    console.print(_run_table(run))


@app.command("signal")
@orchestration_command
def signal(
    uid: str = typer.Argument(..., help="The run to signal."),
    name: str = typer.Argument(
        ..., help="The signal's name, as the workflow waits for it."
    ),
    payload: Optional[str] = typer.Option(
        None, "--payload", help="A JSON object, the signal's own payload."
    ),
) -> None:
    """Tell a waiting run something. Already over answers so, not an error."""
    parsed = call(lambda: json.loads(payload) if payload else {})
    delivered = call(lambda: client().signal_durable_workflow(uid, name, parsed))
    console.print(
        "Delivered." if delivered else "Nothing was waiting to receive it.",
        markup=False,
        highlight=False,
    )


@app.command("cancel")
@orchestration_command
def cancel(
    uid: str = typer.Argument(..., help="The run to cancel."),
    reason: str = typer.Option("", "--reason", help="Why, kept on the run."),
) -> None:
    """Stop a run. Already over answers so, not an error."""
    cancelled = call(lambda: client().cancel_durable_workflow(uid, reason=reason))
    console.print(
        "Cancelled." if cancelled else "Nothing was left running to cancel.",
        markup=False,
        highlight=False,
    )


@app.command("operations")
@orchestration_command
def operations(output: OutputFormat = output_option()) -> None:
    """What durable's engine is, and whether it answers at all."""
    answer = call(lambda: client().durable_operations())
    if emit(answer, output):
        return
    console.print(
        yaml.safe_dump(answer, sort_keys=False).rstrip(), markup=False, highlight=False
    )
