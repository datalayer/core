# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""Event commands for Datalayer CLI."""

import json
from typing import Optional

import typer
from rich.console import Console
from rich.table import Table

from datalayer_core.client.client import DatalayerClient

# Create a Typer app for event commands
app = typer.Typer(name="events", help="Agent event management commands", invoke_without_command=True)

console = Console()


@app.callback()
def events_callback(ctx: typer.Context):
    """Agent event management commands."""
    if ctx.invoked_subcommand is None:
        typer.echo(ctx.get_help())


def _display_events(events: list) -> None:
    """Display events in a table format."""
    table = Table(title="Agent Events")
    table.add_column("ID", style="cyan")
    table.add_column("Agent ID", style="green")
    table.add_column("Kind", style="yellow")
    table.add_column("Title", style="white")
    table.add_column("Status", style="magenta")
    table.add_column("Read", style="blue")
    for event in events:
        table.add_row(
            str(event.get("id", "")),
            str(event.get("agent_id", "")),
            str(event.get("kind", "")),
            str(event.get("title", "")),
            str(event.get("status", "")),
            str(event.get("read", False)),
        )
    console.print(table)


@app.command(name="list")
def events_list(
    agent_id: Optional[str] = typer.Option(
        None,
        "--agent-id",
        help="Filter events by agent runtime ID.",
    ),
    kind: Optional[str] = typer.Option(
        None,
        "--kind",
        help="Filter events by kind.",
    ),
    token: Optional[str] = typer.Option(
        None,
        "--token",
        help="Authentication token (Bearer token for API requests).",
    ),
) -> None:
    """List agent events."""
    try:
        client = DatalayerClient(token=token)
        result = client._list_events(agent_id=agent_id, kind=kind)
        events = result if isinstance(result, list) else result.get("events", [])
        _display_events(events)
    except Exception as e:
        console.print(f"[red]Error listing events: {e}[/red]")
        raise typer.Exit(1)


@app.command(name="ls")
def events_ls(
    agent_id: Optional[str] = typer.Option(
        None,
        "--agent-id",
        help="Filter events by agent runtime ID.",
    ),
    kind: Optional[str] = typer.Option(
        None,
        "--kind",
        help="Filter events by kind.",
    ),
    token: Optional[str] = typer.Option(
        None,
        "--token",
        help="Authentication token (Bearer token for API requests).",
    ),
) -> None:
    """List agent events (alias for list)."""
    events_list(agent_id=agent_id, kind=kind, token=token)


@app.command(name="get")
def events_get(
    event_id: str = typer.Argument(..., help="ID of the event to retrieve."),
    token: Optional[str] = typer.Option(
        None,
        "--token",
        help="Authentication token (Bearer token for API requests).",
    ),
) -> None:
    """Get a single event by ID."""
    try:
        client = DatalayerClient(token=token)
        event = client._get_event(event_id)
        console.print_json(json.dumps(event, default=str))
    except Exception as e:
        console.print(f"[red]Error getting event: {e}[/red]")
        raise typer.Exit(1)


@app.command(name="create")
def events_create(
    agent_id: str = typer.Argument(..., help="Agent runtime ID."),
    title: str = typer.Argument(..., help="Event title."),
    kind: str = typer.Option("generic", "--kind", help="Event kind."),
    status: str = typer.Option("pending", "--status", help="Event status."),
    token: Optional[str] = typer.Option(
        None,
        "--token",
        help="Authentication token (Bearer token for API requests).",
    ),
) -> None:
    """Create a new agent event."""
    try:
        client = DatalayerClient(token=token)
        event = client._create_event(
            agent_id=agent_id,
            title=title,
            kind=kind,
            status=status,
        )
        console.print_json(json.dumps(event, default=str))
    except Exception as e:
        console.print(f"[red]Error creating event: {e}[/red]")
        raise typer.Exit(1)


@app.command(name="delete")
def events_delete(
    event_id: str = typer.Argument(..., help="ID of the event to delete."),
    token: Optional[str] = typer.Option(
        None,
        "--token",
        help="Authentication token (Bearer token for API requests).",
    ),
) -> None:
    """Delete an event by ID."""
    try:
        client = DatalayerClient(token=token)
        result = client._delete_event(event_id)
        console.print(f"[green]Event {event_id} deleted.[/green]")
    except Exception as e:
        console.print(f"[red]Error deleting event: {e}[/red]")
        raise typer.Exit(1)


@app.command(name="mark-read")
def events_mark_read(
    event_id: str = typer.Argument(..., help="ID of the event to mark as read."),
    token: Optional[str] = typer.Option(
        None,
        "--token",
        help="Authentication token (Bearer token for API requests).",
    ),
) -> None:
    """Mark an event as read."""
    try:
        client = DatalayerClient(token=token)
        result = client._mark_event_read(event_id)
        console.print(f"[green]Event {event_id} marked as read.[/green]")
    except Exception as e:
        console.print(f"[red]Error marking event as read: {e}[/red]")
        raise typer.Exit(1)


@app.command(name="mark-unread")
def events_mark_unread(
    event_id: str = typer.Argument(..., help="ID of the event to mark as unread."),
    token: Optional[str] = typer.Option(
        None,
        "--token",
        help="Authentication token (Bearer token for API requests).",
    ),
) -> None:
    """Mark an event as unread."""
    try:
        client = DatalayerClient(token=token)
        result = client._mark_event_unread(event_id)
        console.print(f"[green]Event {event_id} marked as unread.[/green]")
    except Exception as e:
        console.print(f"[red]Error marking event as unread: {e}[/red]")
        raise typer.Exit(1)
