# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""
The ``datalayer executions`` command group: work delegated to an agent over A2A
or ACP (ORCHESTRATOR.md, section 11 and O1-13)::

    datalayer executions run --agent validator --goal "Validate it" --context notebook:nb-1@3
    datalayer executions watch exec_123
    datalayer executions steer exec_123 "Check the statistical assumptions"
    datalayer executions cancel exec_123
    datalayer executions artifacts exec_123

Each is a command the orchestration control plane serves, over the routes the
app's execution page uses, with the caller's own token. A command that changes
something carries an idempotency key: the one given, or one derived from what
it asks — so the same command run again after a lost answer is recognised as
the same command rather than done twice, and a different one is different.
"""

from __future__ import annotations

from typing import Optional

import typer

from datalayer_core.cli.commands.contents import OutputFormat
from datalayer_core.cli.commands.orchestration_common import (
    OrchestrationCommandError,
    account_option,
    call,
    client,
    console,
    emit,
    emit_line,
    orchestration_command,
    output_option,
)
from datalayer_core.client.client import DatalayerClient
from datalayer_core.displays.orchestration import artifacts_table, event_line, execution_table
from datalayer_core.mixins.orchestration import Receipt
from datalayer_core.orchestration import (
    AgentBinding,
    AgentProtocol,
    AgentsDiscover,
    ContextKind,
    ContextManifest,
    ContextReference,
    ExecutionsCancel,
    ExecutionsCollect,
    ExecutionsDelegate,
    ExecutionsSteer,
    MutatingCommand,
    Objective,
    Policy,
    binding_for,
    command_idempotency_key,
    format_context_uri,
)

app = typer.Typer(
    name="executions",
    help="Executions: work delegated to agents over A2A and ACP — run, watch, steer, cancel, collect.",
    no_args_is_help=True,
)

#: What a placeholder key is replaced by, before it leaves: every mutating
#: command needs one to be built, and the derived key is computed from the
#: command without it.
_PENDING_KEY = "pending"


def context_reference(value: str) -> ContextReference:
    """A reference given on the command line: its canonical URI, or ``<kind>:<uid>@<version>``."""
    uri = value.strip()
    if not uri.startswith("datalayer:"):
        kind, _, rest = uri.partition(":")
        uid, _, version = rest.rpartition("@")
        if not kind or not uid or not version:
            raise OrchestrationCommandError(
                f"'{value}' is not a context reference: give datalayer:<kind>/<uid>@<version> "
                "or <kind>:<uid>@<version>."
            )
        uri = call(lambda: format_context_uri(ContextKind(kind), uid, version))
    return call(lambda: ContextReference(uri=uri))


def keyed(command: MutatingCommand, idempotency_key: Optional[str]) -> MutatingCommand:
    """The command under the key given, or under the one derived from what it asks."""
    return command.model_copy(update={"idempotency_key": idempotency_key or command_idempotency_key(command)})


def resolve_binding(
    the_client: DatalayerClient,
    agent_id: str,
    *,
    capability: Optional[str],
    protocol: Optional[AgentProtocol],
    account: Optional[str],
) -> AgentBinding:
    """The binding of the worker a delegation names, as the control plane discovers it."""
    discovered = call(
        lambda: the_client.discover_agents(
            AgentsDiscover(
                capabilities=[capability] if capability else [],
                protocols=[protocol] if protocol else [],
                limit=100,
            ),
            account_uid=account,
        )
    )
    for descriptor in discovered:
        if descriptor.agent_id == agent_id:
            return call(lambda: binding_for(descriptor, protocol=protocol, capability=capability))
    constraints = "".join(
        [f" with the capability {capability}" if capability else "", f" over {protocol.value}" if protocol else ""]
    )
    raise OrchestrationCommandError(
        f"No worker '{agent_id}' was discovered{constraints}: `datalayer agents discover` lists the "
        "workers work can be delegated to."
    )


def show_receipt(receipt: Receipt, output: OutputFormat, *, delivered: str, undelivered: str) -> None:
    if emit(receipt.to_wire(), output):
        return
    console.print(execution_table(receipt.execution))
    words = delivered if receipt.delivered else undelivered
    console.print(f"{words} {receipt.detail}" if receipt.detail else words, markup=False, highlight=False)


def stream(
    the_client: DatalayerClient,
    execution_id: str,
    *,
    children: bool,
    from_sequence: Optional[int],
    last_event_id: Optional[str],
    account: Optional[str],
    output: OutputFormat,
) -> None:
    """Print each event of an execution, and its tree, until every one is over."""
    events = the_client.subscribe_execution(
        execution_id,
        include_children=children,
        from_sequence=from_sequence,
        last_event_id=last_event_id,
        account_uid=account,
    )
    try:
        for event, cursor in events:
            if output is OutputFormat.TABLE:
                # One event, one line, however long: a watch is read and piped
                # line by line.
                console.print(
                    event_line(event, root_execution_id=execution_id), markup=False, highlight=False, soft_wrap=True
                )
            else:
                emit_line({"cursor": cursor, "event": event.to_wire()}, output)
    except OrchestrationCommandError:
        raise
    except Exception as error:
        raise OrchestrationCommandError(str(error)) from error
    if output is OutputFormat.TABLE:
        console.print(f"Over: every execution {execution_id} covers has ended.", markup=False, highlight=False)


@app.command("run")
@orchestration_command
def run(
    agent: str = typer.Option(..., "--agent", "-a", help="The worker's agent id, as `datalayer agents discover` lists it."),
    goal: str = typer.Option(..., "--goal", "-g", help="What the worker is to do."),
    context: Optional[list[str]] = typer.Option(
        None,
        "--context",
        help="What the worker may read: datalayer:<kind>/<uid>@<version>, or <kind>:<uid>@<version>; repeatable.",
    ),
    capability: Optional[str] = typer.Option(
        None, "--capability", "-c", help="The capability the work is for; the worker's first when omitted."
    ),
    protocol: Optional[AgentProtocol] = typer.Option(
        None, "--protocol", "-p", case_sensitive=False, help="The protocol to reach the worker over; its first endpoint's when omitted."
    ),
    instructions: Optional[str] = typer.Option(None, "--instructions", help="Steering that applies from the start."),
    criterion: Optional[list[str]] = typer.Option(None, "--criterion", help="An acceptance criterion; repeatable."),
    deadline: Optional[str] = typer.Option(None, "--deadline", help="When the work must be over, as an RFC 3339 instant."),
    parent: Optional[str] = typer.Option(None, "--parent", help="The execution this one is delegated from."),
    idempotency_key: Optional[str] = typer.Option(
        None,
        "--idempotency-key",
        help="The key of this delegation; derived from what it asks when omitted, so running the same command again is the same execution.",
    ),
    watch_after: bool = typer.Option(False, "--watch", "-w", help="Then stream its events until it is over."),
    account: Optional[str] = account_option(),
    output: OutputFormat = output_option(),
) -> None:
    """Delegate an objective, and the context it may use, to a worker."""
    the_client = client()
    references = [context_reference(value) for value in context or []]
    binding = resolve_binding(the_client, agent, capability=capability, protocol=protocol, account=account)
    command = call(
        lambda: ExecutionsDelegate(
            idempotency_key=_PENDING_KEY,
            parent_execution_id=parent,
            agent=binding,
            objective=Objective(goal=goal, acceptance_criteria=criterion or [], instructions=instructions),
            context=ContextManifest(references=references),
            policy=Policy(deadline=deadline),
        )
    )
    receipt: Receipt = call(lambda: the_client.delegate_execution(keyed(command, idempotency_key), account_uid=account))
    show_receipt(
        receipt,
        output,
        delivered="Delegated: the durable service took it.",
        undelivered="Received, and not dispatched yet.",
    )
    if watch_after:
        stream(
            the_client,
            receipt.execution.execution_id,
            children=True,
            from_sequence=None,
            last_event_id=None,
            account=account,
            output=output,
        )


@app.command("watch")
@orchestration_command
def watch(
    execution_id: str = typer.Argument(..., help="The execution to watch."),
    children: bool = typer.Option(True, "--children/--no-children", help="The events of the executions it delegated to as well."),
    from_sequence: Optional[int] = typer.Option(None, "--from-sequence", min=0, help="Replay its own events after this sequence."),
    last_event_id: Optional[str] = typer.Option(
        None, "--last-event-id", help="Resume after this cursor, as a JSON watch prints it."
    ),
    account: Optional[str] = account_option(),
    output: OutputFormat = output_option(),
) -> None:
    """Stream an execution's events, and its children's, until every one is over."""
    stream(
        client(),
        execution_id,
        children=children,
        from_sequence=from_sequence,
        last_event_id=last_event_id,
        account=account,
        output=output,
    )


@app.command("steer")
@orchestration_command
def steer(
    execution_id: str = typer.Argument(..., help="The execution to steer."),
    instructions: str = typer.Argument(..., help="What to add to the worker's instructions."),
    idempotency_key: Optional[str] = typer.Option(
        None, "--idempotency-key", help="The key of this steer; derived from the execution and the instructions when omitted."
    ),
    account: Optional[str] = account_option(),
    output: OutputFormat = output_option(),
) -> None:
    """Add instructions to an execution while its worker works."""
    command = call(
        lambda: ExecutionsSteer(idempotency_key=_PENDING_KEY, execution_id=execution_id, instructions=instructions)
    )
    receipt: Receipt = call(lambda: client().steer_execution(keyed(command, idempotency_key), account_uid=account))
    show_receipt(
        receipt,
        output,
        delivered="Received, and the execution's run was told.",
        undelivered="Received; the execution's run was not told yet.",
    )


@app.command("cancel")
@orchestration_command
def cancel(
    execution_id: str = typer.Argument(..., help="The execution to cancel."),
    reason: Optional[str] = typer.Option(None, "--reason", help="Why, kept on the execution."),
    cascade: bool = typer.Option(True, "--cascade/--no-cascade", help="Stop everything it delegated too."),
    idempotency_key: Optional[str] = typer.Option(
        None, "--idempotency-key", help="The key of this cancel; derived from what it asks when omitted."
    ),
    account: Optional[str] = account_option(),
    output: OutputFormat = output_option(),
) -> None:
    """Stop an execution, and by default everything below it, keeping its history."""
    command = call(
        lambda: ExecutionsCancel(idempotency_key=_PENDING_KEY, execution_id=execution_id, reason=reason, cascade=cascade)
    )
    receipt: Receipt = call(lambda: client().cancel_execution(keyed(command, idempotency_key), account_uid=account))
    if emit(receipt.to_wire(), output):
        return
    console.print(execution_table(receipt.execution))
    stopped = receipt.cancelled_execution_ids
    words = (
        f"Cancelled {len(stopped)} execution{'' if len(stopped) == 1 else 's'}: {', '.join(stopped)}."
        if stopped
        else "Nothing was left running to cancel."
    )
    console.print(words, markup=False, highlight=False)


@app.command("artifacts")
@orchestration_command
def artifacts(
    execution_id: str = typer.Argument(..., help="The execution whose artifacts to list."),
    children: bool = typer.Option(True, "--children/--no-children", help="The artifacts of the executions it delegated to as well."),
    account: Optional[str] = account_option(),
    output: OutputFormat = output_option(),
) -> None:
    """The artifacts an execution registered, and its children's, with what each came to."""
    collection = call(
        lambda: client().collect_execution(
            ExecutionsCollect(execution_id=execution_id, include_children=children), account_uid=account
        )
    )
    if emit(collection.to_wire(), output):
        return
    if not collection.artifacts:
        console.print("Nothing registered yet.")
        return
    console.print(artifacts_table(collection.artifacts))
