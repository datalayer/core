# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""
The ``datalayer agents`` command group: the workers work is delegated to
(ORCHESTRATOR.md, section 11 and O1-13).

``discover`` asks the orchestration control plane, which reads the agentspec
library and fills each worker's operations from its protocol's adapter.

The agent runtime commands of ``agent-runtimes`` — ``ls``, ``create``,
``terminate`` and the rest — join this group when that distribution is
installed: the CLI merges an extension's group into the one it already has
rather than letting it replace this one. They are that distribution's, and
this group adds none of them.
"""

from __future__ import annotations

from typing import Any, Optional

import typer

from datalayer_core.cli.commands.contents import OutputFormat
from datalayer_core.cli.commands.orchestration_common import (
    account_option,
    call,
    client,
    console,
    emit,
    orchestration_command,
    output_option,
)
from datalayer_core.displays.orchestration import agents_table
from datalayer_core.orchestration import (
    AgentProtocol,
    AgentsDiscover,
    TrustLevel,
    WorkerOperation,
)

app = typer.Typer(
    name="agents",
    help="Agents: the workers work is delegated to, and their runtimes.",
    invoke_without_command=True,
)


@app.callback()
def agents_callback(ctx: typer.Context) -> None:
    """Agents: the workers work is delegated to, and their runtimes."""
    if ctx.invoked_subcommand is None:
        typer.echo(ctx.get_help())


@app.command("discover")
@orchestration_command
def discover(
    capability: Optional[list[str]] = typer.Option(
        None,
        "--capability",
        "-c",
        help="A capability every worker found must declare, such as notebook.validate; repeatable.",
    ),
    protocol: Optional[list[AgentProtocol]] = typer.Option(
        None,
        "--protocol",
        "-p",
        case_sensitive=False,
        help="A protocol the worker must speak; repeatable.",
    ),
    operation: Optional[list[WorkerOperation]] = typer.Option(
        None,
        "--operation",
        case_sensitive=False,
        help="An operation the worker's protocol must support, such as steer; repeatable.",
    ),
    minimum_trust: Optional[TrustLevel] = typer.Option(
        None, "--minimum-trust", case_sensitive=False, help="The lowest trust level accepted."
    ),
    region: Optional[str] = typer.Option(None, "--region", help="The region the worker must run in."),
    limit: int = typer.Option(20, "--limit", "-n", min=1, help="The most workers to list."),
    account: Optional[str] = account_option(),
    output: OutputFormat = output_option(),
) -> None:
    """Find the workers that meet every constraint given."""
    command = call(
        lambda: AgentsDiscover(
            capabilities=capability or [],
            protocols=protocol or [],
            operations=operation or [],
            minimum_trust_level=minimum_trust,
            region=region,
            limit=limit,
        )
    )
    agents: list[Any] = call(lambda: client().discover_agents(command, account_uid=account))
    if emit([agent.to_wire() for agent in agents], output):
        return
    if not agents:
        console.print("No worker meets every constraint.")
        return
    console.print(agents_table(agents))
