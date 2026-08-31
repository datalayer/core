# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

# Copyright (c) 2023-2026 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""
The ``datalayer mcp`` command group: the agents connected to the account,
the audit log, the observability of a run, and the configuration of the MCP
clients.

Every operation here is one the web application has too, over the same
routes — the gateway's ``/api/mcp/v1``, IAM's connected agents and the
``datalayer-otel`` query API, all with the caller's own token.
"""

from __future__ import annotations

import json
import sys
from dataclasses import dataclass
from functools import wraps
from pathlib import Path
from typing import Any, Callable, TypeVar

import typer
import yaml
from rich.console import Console

from datalayer_core.cli.commands.contents import OutputFormat
from datalayer_core.client.client import DatalayerClient
from datalayer_core.displays.mcp import (
    activity_summary_table,
    alerts_table,
    audit_events_table,
    bindings_table,
    connected_agents_table,
    service_agents_table,
    forwarding_table,
    jobs_table,
    logs_table,
    policy_table,
    slis_table,
    spans_table,
    tasks_table,
)
from datalayer_core.mcp import (
    CLI_CLIENT_METADATA_URL,
    derived_idempotency_key,
    MCP_CLIENT_IDS,
    MCP_CLIENTS,
    default_config_path,
    mcp_endpoint_url,
    render_client_configuration,
    span_tree,
    write_client_configuration,
)

_Command = TypeVar("_Command", bound=Callable[..., Any])
console = Console()
error_console = Console(stderr=True)


@dataclass(frozen=True)
class McpCLIContext:
    output: OutputFormat


class McpCommandError(RuntimeError):
    """A safe, user-facing error of an MCP command."""


def mcp_command(function: _Command) -> _Command:
    """The error boundary every MCP command shares."""

    @wraps(function)
    def wrapped(*args: Any, **kwargs: Any) -> Any:
        try:
            return function(*args, **kwargs)
        except McpCommandError as error:
            error_console.print(f"[red]{error}[/red]")
            raise typer.Exit(1) from None

    return wrapped  # type: ignore[return-value]


def _client_registration_notes() -> str:
    lines = ["How each client registers with Datalayer's authorization server:"]
    for setup in MCP_CLIENTS.values():
        how = (
            "by URL (Client ID Metadata Document)"
            if setup.registration == "cimd"
            else "dynamic client registration (the deprecated fallback)"
        )
        lines.append(f"  {setup.id:<15} {how}")
    lines.append(
        f"  {'any other':<15} whatever its vendor does; this command writes no file for it"
    )
    lines.append(
        "\nNone of the seven takes a client_metadata_url in its configuration file: "
        "a client's id is its vendor's own document. Datalayer's own clients pass "
        f"theirs in code — this CLI and agent-runtimes use {CLI_CLIENT_METADATA_URL} "
        "and its sibling under https://datalayer.ai/.well-known/mcp-clients/."
    )
    return "\n".join(lines)


app = typer.Typer(
    name="mcp",
    help="The agents connected to your account, their audit log and runs, and the MCP clients' configuration.",
    invoke_without_command=True,
    no_args_is_help=True,
)


@app.callback()
def mcp_callback(
    ctx: typer.Context,
    output: OutputFormat = typer.Option(
        OutputFormat.TABLE,
        "--output",
        "-o",
        case_sensitive=False,
        help="Output format used by MCP commands.",
    ),
) -> None:
    """Use the shared CLI authentication and the selected output format."""
    ctx.obj = McpCLIContext(output=output)


def _context(ctx: typer.Context) -> McpCLIContext:
    value = ctx.find_object(McpCLIContext)
    return value or McpCLIContext(output=OutputFormat.TABLE)


def _client() -> DatalayerClient:
    try:
        return DatalayerClient()
    except Exception as error:
        raise McpCommandError(str(error)) from error


def _dump(value: Any) -> Any:
    if hasattr(value, "model_dump"):
        return value.model_dump(mode="json")
    if isinstance(value, list):
        return [_dump(item) for item in value]
    return value


def _emit_machine(value: Any, context: McpCLIContext) -> bool:
    """Print JSON or YAML when asked; answer whether that was done."""
    if context.output is OutputFormat.JSON:
        console.print_json(json.dumps(_dump(value)))
        return True
    if context.output is OutputFormat.YAML:
        console.print(yaml.safe_dump(_dump(value), sort_keys=False).rstrip())
        return True
    return False


def _call(function: Callable[[], Any]) -> Any:
    try:
        return function()
    except McpCommandError:
        raise
    except Exception as error:
        raise McpCommandError(str(error)) from error


# ---------------------------------------------------------------------------
# agents
# ---------------------------------------------------------------------------

agents_app = typer.Typer(name="agents", help="The agents connected to your account.")
app.add_typer(agents_app)


@agents_app.command(name="list")
@mcp_command
def agents_list(ctx: typer.Context) -> None:
    """List the agents connected to your account, with their scopes and last use."""
    agents = _call(lambda: _client().list_connected_agents())
    if _emit_machine(agents, _context(ctx)):
        return
    if not agents:
        console.print("No agent is connected. Connect one from an MCP client: `datalayer mcp setup --help`.")
        return
    console.print(connected_agents_table(agents))


@agents_app.command(name="revoke")
@mcp_command
def agents_revoke(
    ctx: typer.Context,
    grant_uid: str = typer.Argument(..., help="The grant, from `datalayer mcp agents list`."),
    yes: bool = typer.Option(False, "--yes", "-y", help="Do not ask for confirmation."),
) -> None:
    """Disconnect an agent: its refresh token stops working at once."""
    if not yes and not typer.confirm(f"Disconnect the agent behind grant {grant_uid}?"):
        raise typer.Exit(0)
    answer = _call(lambda: _client().disconnect_agent(grant_uid))
    if _emit_machine(answer, _context(ctx)):
        return
    console.print(answer.get("message") or f"Disconnected {grant_uid}.")


# ---------------------------------------------------------------------------
# service agents
# ---------------------------------------------------------------------------

service_agents_app = typer.Typer(
    name="service-agents",
    help="Agents that belong to an organization rather than to a person.",
)
app.add_typer(service_agents_app)


@service_agents_app.command(name="list")
@mcp_command
def service_agents_list(
    ctx: typer.Context,
    org_uid: str = typer.Argument(..., help="The organization."),
) -> None:
    """List an organization's service agents, revoked ones included."""
    agents = _call(lambda: _client().list_service_agents(org_uid))
    if _emit_machine(agents, _context(ctx)):
        return
    if not agents:
        console.print(
            "This organization has no service agents. "
            "Create one with `datalayer mcp service-agents create`."
        )
        return
    console.print(service_agents_table(agents))


@service_agents_app.command(name="create")
@mcp_command
def service_agents_create(
    ctx: typer.Context,
    org_uid: str = typer.Argument(..., help="The organization it belongs to."),
    name: str = typer.Option(..., "--name", help="What it is, for the audit."),
    scopes: str = typer.Option(
        ...,
        "--scopes",
        help=(
            "Space-separated, from: runtimes:read runtimes:write data:read "
            "sandboxes:manage."
        ),
    ),
    description: str = typer.Option("", "--description", help="Optional."),
    team_uid: str = typer.Option("", "--team", help="A team's rather than the organization's."),
) -> None:
    """Create a service agent and print its key — once.

    IAM stores a hash of the key and has no way back, so this is the only
    place it exists. Pipe it somewhere or copy it now; losing it means
    rotating, not recovering.
    """
    agent = _call(
        lambda: _client().create_service_agent(
            org_uid,
            name=name,
            scopes=scopes,
            description=description,
            team_uid=team_uid,
        )
    )
    if _emit_machine(agent, _context(ctx)):
        return
    console.print(f"Created service agent {agent.get('uid', '')}.")
    console.print("")
    console.print(agent.get("key", ""))
    console.print("")
    console.print(
        "[bold]That key is shown once and cannot be shown again.[/bold] "
        "Store it now; if you lose it, rotate."
    )


@service_agents_app.command(name="rotate")
@mcp_command
def service_agents_rotate(
    ctx: typer.Context,
    org_uid: str = typer.Argument(..., help="The organization."),
    agent_uid: str = typer.Argument(..., help="From `service-agents list`."),
    yes: bool = typer.Option(False, "--yes", "-y", help="Do not ask for confirmation."),
) -> None:
    """Give the agent a new key. The old one stops working at once."""
    if not yes and not typer.confirm(
        f"Rotate the key of {agent_uid}? Anything still using the old key "
        "stops working immediately."
    ):
        raise typer.Exit(0)
    agent = _call(lambda: _client().rotate_service_agent_key(org_uid, agent_uid))
    if _emit_machine(agent, _context(ctx)):
        return
    console.print(f"Rotated the key of {agent_uid}. The previous key no longer works.")
    console.print("")
    console.print(agent.get("key", ""))
    console.print("")
    console.print("[bold]Shown once.[/bold]")


@service_agents_app.command(name="revoke")
@mcp_command
def service_agents_revoke(
    ctx: typer.Context,
    org_uid: str = typer.Argument(..., help="The organization."),
    agent_uid: str = typer.Argument(..., help="From `service-agents list`."),
    yes: bool = typer.Option(False, "--yes", "-y", help="Do not ask for confirmation."),
) -> None:
    """Stop the agent. It stays listed, because its audit rows name it."""
    if not yes and not typer.confirm(f"Revoke {agent_uid}? Its key stops working."):
        raise typer.Exit(0)
    agent = _call(lambda: _client().revoke_service_agent(org_uid, agent_uid))
    if _emit_machine(agent, _context(ctx)):
        return
    console.print(
        f"Revoked {agent_uid}. Its key no longer authenticates; it stays in the "
        "list so its audit rows still resolve."
    )


# ---------------------------------------------------------------------------
# activity, tasks, bindings, policy
# ---------------------------------------------------------------------------


@app.command(name="activity")
@mcp_command
def activity(
    ctx: typer.Context,
    org: str | None = typer.Option(None, "--org", help="An organization you own."),
) -> None:
    """What is going on: connected clients, bound sandboxes, running tasks, today's counts."""
    answer = _call(lambda: _client().get_mcp_activity(org=org))
    if _emit_machine(answer, _context(ctx)):
        return
    console.print(activity_summary_table(answer))
    if answer.clients:
        console.print(connected_agents_table(
            [
                {
                    "uid": client.grant_uid,
                    "client_name": client.client_name,
                    "client_id": client.client_id,
                    "scopes": client.scopes,
                    "created_at": client.connected_at,
                    "last_used_at": client.last_call.at if client.last_call else None,
                }
                for client in answer.clients
            ],
            title="Connected clients",
        ))
    if answer.sandboxes:
        console.print(bindings_table(answer.sandboxes, title="Bound sandboxes"))
    if answer.tasks:
        console.print(tasks_table(answer.tasks, title="Running tasks"))
    if answer.calls:
        console.print(audit_events_table(answer.calls, title="Last calls"))


tasks_app = typer.Typer(name="tasks", help="The runs the agents started.")
app.add_typer(tasks_app)


@tasks_app.command(name="list")
@mcp_command
def tasks_list(
    ctx: typer.Context,
    notebook: str | None = typer.Option(None, "--notebook", help="Filter by notebook uid."),
    sandbox: str | None = typer.Option(None, "--sandbox", help="Filter by sandbox uid."),
    agent: str | None = typer.Option(None, "--agent", help="Filter by the agent's client id."),
    status: str | None = typer.Option(None, "--status", help="working, input_required, completed, failed, cancelled."),
    org: str | None = typer.Option(None, "--org", help="An organization you own."),
    cursor: str | None = typer.Option(None, "--cursor", help="Continue a page."),
    limit: int = typer.Option(50, "--limit", min=1, max=200),
) -> None:
    """List the tasks, newest first."""
    page = _call(
        lambda: _client().list_mcp_tasks(
            notebook=notebook, sandbox=sandbox, agent=agent, status=status, org=org, cursor=cursor, limit=limit
        )
    )
    if _emit_machine(page, _context(ctx)):
        return
    console.print(tasks_table(page.items))
    if page.next_cursor:
        console.print(f"Next cursor: {page.next_cursor}")


@tasks_app.command(name="describe")
@mcp_command
def tasks_describe(ctx: typer.Context, task_uid: str = typer.Argument(...)) -> None:
    """One task, with its outputs."""
    task = _call(lambda: _client().get_mcp_task(task_uid))
    if _emit_machine(task, _context(ctx)):
        return
    console.print(tasks_table([task]))
    for output in task.outputs:
        console.print(f"[{output.index}] {output.output_type}: {output.text or output.reference or ''}")
    if task.error:
        console.print(f"[red]{task.error}[/red]")


@tasks_app.command(name="cancel")
@mcp_command
def tasks_cancel(ctx: typer.Context, task_uid: str = typer.Argument(...)) -> None:
    """Stop a task that is still going; a finished one is answered as it is."""
    task = _call(lambda: _client().cancel_mcp_task(task_uid))
    if _emit_machine(task, _context(ctx)):
        return
    console.print(f"{task.uid}: {task.status}")


@tasks_app.command(name="input")
@mcp_command
def tasks_input(
    ctx: typer.Context,
    task_uid: str = typer.Argument(..., help="The task waiting on you."),
    payload: str | None = typer.Option(
        None, "--input", help="The tool's own input, as JSON. `-` reads stdin."
    ),
    file: Path | None = typer.Option(None, "--file", help="Read the JSON from this file."),
    key: str | None = typer.Option(
        None,
        "--key",
        help="Idempotency key. Derived from the task and the input when omitted, "
        "so re-running the same command after a timeout answers once.",
    ),
) -> None:
    """Answer a task that is waiting on a person.

    The input is whatever the tool asked for, so it is JSON rather than
    flags: this command cannot know the shape, and inventing one would make
    it wrong for every tool but the one it was written against.

    The idempotency key is derived from the task and the input unless you
    give one. That matters more than it looks: a `POST` that timed out may
    well have arrived, and a freshly generated key on the retry would be a
    *second* answer to a question that was already answered.
    """
    if (payload is None) == (file is None):
        raise McpCommandError("give the input with --input or --file, not both and not neither")
    raw = file.read_text() if file is not None else (sys.stdin.read() if payload == "-" else payload)
    try:
        answer = json.loads(raw or "")
    except json.JSONDecodeError as error:
        raise McpCommandError(f"the input is not valid JSON: {error}") from error
    if not isinstance(answer, dict):
        # The gateway sends this on as the tool's arguments, and a tool's
        # arguments are an object. A bare list or string would be refused
        # there, one network round trip later and with a worse message.
        raise McpCommandError("the input must be a JSON object, as the tool's arguments are")

    task = _call(
        lambda: _client().answer_mcp_task(
            task_uid, answer, idempotency_key=key or derived_idempotency_key(task_uid, answer)
        )
    )
    if _emit_machine(task, _context(ctx)):
        return
    console.print(f"{task.uid}: {task.status}")


bindings_app = typer.Typer(name="bindings", help="The handles the agents hold: notebooks, toolsets, sandboxes.")
app.add_typer(bindings_app)


@bindings_app.command(name="list")
@mcp_command
def bindings_list(
    ctx: typer.Context,
    kind: str | None = typer.Option(None, "--kind", help="notebook, toolset or sandbox."),
    state: str | None = typer.Option(None, "--state", help="active, lost, closed, expired."),
    agent: str | None = typer.Option(None, "--agent", help="Filter by the agent's client id."),
    limit: int = typer.Option(50, "--limit", min=1, max=200),
) -> None:
    """List your handles."""
    page = _call(lambda: _client().list_mcp_bindings(kind=kind, state=state, agent=agent, limit=limit))
    if _emit_machine(page, _context(ctx)):
        return
    console.print(bindings_table(page.items))


@bindings_app.command(name="terminate")
@mcp_command
def bindings_terminate(
    ctx: typer.Context,
    binding_uid: str = typer.Argument(..., help="The handle, e.g. sb_…"),
    yes: bool = typer.Option(False, "--yes", "-y", help="Do not ask for confirmation."),
) -> None:
    """Release a handle; a sandbox binding's runtime is terminated with it."""
    if not yes and not typer.confirm(f"Terminate {binding_uid}?"):
        raise typer.Exit(0)
    binding = _call(lambda: _client().terminate_mcp_binding(binding_uid))
    if _emit_machine(binding, _context(ctx)):
        return
    console.print(f"{binding.uid}: {binding.state or 'closed'}")


@app.command(name="policy")
@mcp_command
def policy(
    ctx: typer.Context,
    agent: str | None = typer.Option(None, "--agent", help="Preview the policy as this agent (client id)."),
) -> None:
    """The effective policy for your token, each rule naming the layer that decided it."""
    answer = _call(lambda: _client().get_mcp_effective_policy(agent=agent))
    if _emit_machine(answer, _context(ctx)):
        return
    console.print(policy_table(answer))


def _scope_of(org: str | None, team: str | None) -> tuple[str, str]:
    """Which layer a command means, from the flags it was given.

    One command with a scope flag rather than three commands for one
    document. The plan named `datalayer mcp policy`, `datalayer orgs
    mcp-policy` and `datalayer mcp quotas` separately; three entry points
    onto one policy document is three places for the rules, the refusals and
    the version handling to drift, and quotas *are* three of those rules —
    a `quotas set` would be a second way to write what `policy set` writes.
    """
    if org and team:
        raise McpCommandError(
            "A policy layer is one of an organization, a team or you. Name "
            "--org or --team, not both."
        )
    if team:
        return "team", team
    if org:
        return "organization", org
    return "personal", ""


@app.command(name="policy-get")
@mcp_command
def policy_get(
    ctx: typer.Context,
    org: str | None = typer.Option(None, "--org", help="An organization you own."),
    team: str | None = typer.Option(None, "--team", help="A team you own."),
) -> None:
    """One layer's own rules — what it narrows, not what applies to you.

    `datalayer mcp policy` is the other question: every layer intersected,
    with the layer that decided each rule. This is the one that can be
    written back.
    """
    scope, subject = _scope_of(org, team)
    if scope == "personal":
        subject = _call(lambda: _client().get_profile()).uid
    layer = _call(lambda: _client().get_mcp_policy_layer(scope, subject))
    if _emit_machine(layer, _context(ctx)):
        return
    if layer is None:
        console.print(
            f"No {scope} policy. This layer narrows nothing — which is not the "
            "same as having written one that narrows nothing."
        )
        return
    for name, value in sorted(layer.items()):
        if name != "version":
            console.print(f"{name}: {value}")
    console.print(f"[dim]version {layer.get('version')}[/dim]")


@app.command(name="policy-set")
@mcp_command
def policy_set(
    ctx: typer.Context,
    org: str | None = typer.Option(None, "--org", help="An organization you own."),
    team: str | None = typer.Option(None, "--team", help="A team you own."),
    deny: str = typer.Option("", "--deny", help="Comma-separated tools to deny."),
    allow: str = typer.Option("", "--allow", help="Comma-separated tools to permit, to the exclusion of the rest."),
    clients: str = typer.Option("", "--clients", help="Comma-separated CIMD URLs or hostnames to admit."),
    calls_per_minute: int | None = typer.Option(None, "--calls-per-minute"),
    credits_per_day: float | None = typer.Option(None, "--credits-per-day"),
    sandboxes: int | None = typer.Option(None, "--sandboxes", help="Sandboxes at once."),
    yes: bool = typer.Option(False, "--yes", "-y", help="Do not ask for confirmation."),
) -> None:
    """Replace one layer's rules.

    **Replace, not merge.** A policy is small and read whole, and merging
    would leave no way to express removing a rule — so a flag you leave out
    is a rule you are clearing, and the confirmation says so.

    The quota rules live here too: they *are* policy rules, and a separate
    `quotas set` would be a second way to write the same document.
    """
    scope, subject = _scope_of(org, team)
    if scope == "personal":
        subject = _call(lambda: _client().get_profile()).uid

    rules: dict[str, Any] = {}
    for flag, name in ((deny, "toolDenylist"), (allow, "toolAllowlist"), (clients, "allowedClients")):
        entries = [entry.strip() for entry in flag.split(",") if entry.strip()]
        if entries:
            rules[name] = entries
    for value, name, label in (
        (calls_per_minute, "maxCallsPerMinute", "Calls per minute"),
        (credits_per_day, "maxCreditsPerDay", "Credits per day"),
        (sandboxes, "maxConcurrentSandboxes", "Sandboxes at once"),
    ):
        if value is None:
            continue
        if value <= 0:
            # Refused here rather than at the write. IAM's refusal is correct
            # and unhelpful: somebody who passed 0 meant "stop my agents",
            # and a non-positive limit reads as *no limit*.
            raise McpCommandError(
                f"{label} cannot be {value}. A non-positive limit reads as no "
                "limit, so it would lift the limit rather than set it. To stop "
                "an agent, revoke its grant or deny the tools it uses."
            )
        rules[name] = value

    current = _call(lambda: _client().get_mcp_policy_layer(scope, subject))
    cleared = sorted(
        name
        for name in (current or {})
        if name != "version" and name not in rules
    )
    if cleared and not yes:
        console.print(
            f"This replaces the {scope} layer. Not passing a flag clears it: "
            f"{', '.join(cleared)} would be removed."
        )
        if not typer.confirm("Go ahead?"):
            raise typer.Exit(0)

    answer = _call(
        lambda: _client().set_mcp_policy_layer(
            scope,
            subject,
            rules,
            expected_version=(current or {}).get("version"),
        )
    )
    if _emit_machine(answer, _context(ctx)):
        return
    console.print(f"The {scope} policy is set. It applies to the next call.")


alerts_app = typer.Typer(name="alerts", help="The alert rules that fired.")
app.add_typer(alerts_app)


@alerts_app.command(name="list")
@mcp_command
def alerts_list(
    ctx: typer.Context,
    org: str | None = typer.Option(None, "--org", help="An organization you own or audit."),
    team: str | None = typer.Option(None, "--team", help="A team of that organization."),
    unacknowledged: bool = typer.Option(False, "--unacknowledged", help="Only what nobody has seen."),
) -> None:
    """What fired, newest first, for an organization's owners and auditors."""
    page = _call(
        lambda: _client().list_mcp_alerts(org=org, team=team, unacknowledged=unacknowledged)
    )
    if _emit_machine(page, _context(ctx)):
        return
    console.print(alerts_table(page.items))


@alerts_app.command(name="ack")
@mcp_command
def alerts_ack(ctx: typer.Context, alert_uid: str = typer.Argument(...)) -> None:
    """Say you have seen one. Idempotent; the first acknowledgement stands."""
    alert = _call(lambda: _client().acknowledge_mcp_alert(alert_uid))
    if _emit_machine(alert, _context(ctx)):
        return
    console.print(f"{alert.uid}: acknowledged by {alert.acknowledged_by or 'you'}")


@alerts_app.command(name="rules")
@mcp_command
def alerts_rules(
    ctx: typer.Context,
    org: str = typer.Argument(..., help="The organization."),
) -> None:
    """The rules an organization asked to be told about, disabled included.

    Switched off is a state, not a reason to hide a row: a rule somebody
    silenced for a migration is one they may want back.
    """
    rules = _call(lambda: _client().list_mcp_alert_rules(org))
    if _emit_machine(rules, _context(ctx)):
        return
    if not rules:
        console.print(
            "Nothing is watched. Runs are recorded either way; a rule is what "
            "turns a number somebody would have to look at into something that "
            "reaches them."
        )
        return
    for rule in rules:
        state = "" if rule.get("enabled", True) else " [red](off)[/red]"
        console.print(
            f"{rule.get('uid')}  {rule.get('condition')} {rule.get('operator')} "
            f"{rule.get('threshold')} over {rule.get('window_seconds')}s "
            f"[{rule.get('severity')}]{state}"
        )


@alerts_app.command(name="watch")
@mcp_command
def alerts_watch(
    ctx: typer.Context,
    org: str = typer.Argument(..., help="The organization."),
    condition: str = typer.Option(..., "--condition", help="e.g. tasks.open"),
    threshold: float = typer.Option(..., "--threshold"),
    operator: str = typer.Option("gt", "--operator", help="gt, gte, lt, lte or eq."),
    window: int = typer.Option(3600, "--window", help="Seconds the reading looks back over."),
    severity: str = typer.Option("warning", "--severity"),
) -> None:
    """Write a rule.

    Refused by name when the evaluator could not evaluate it. That refusal is
    the point: a rule that never fires because of a typo is
    indistinguishable from a condition that never happened, and the second is
    what somebody would believe.
    """
    rule = {
        "condition": condition,
        "threshold": threshold,
        "operator": operator,
        "window_seconds": window,
        "severity": severity,
        "scope_kind": "organization",
        "enabled": True,
    }
    written = _call(lambda: _client().create_mcp_alert_rule(org, rule))
    if _emit_machine(written, _context(ctx)):
        return
    console.print(f"Watching {condition}. Evaluated on the next tick.")


@alerts_app.command(name="unwatch")
@mcp_command
def alerts_unwatch(
    ctx: typer.Context,
    org: str = typer.Argument(..., help="The organization."),
    uid: str = typer.Argument(..., help="From `alerts rules`."),
    yes: bool = typer.Option(False, "--yes", "-y", help="Do not ask for confirmation."),
) -> None:
    """Remove a rule. What it watched is unwatched from the next check."""
    if not yes and not typer.confirm(
        f"Remove {uid}? What it watched becomes unwatched, and nothing will "
        "say so again."
    ):
        raise typer.Exit(0)
    answer = _call(lambda: _client().delete_mcp_alert_rule(org, uid))
    if _emit_machine(answer, _context(ctx)):
        return
    console.print(f"{uid} removed.")


@alerts_app.command(name="test")
@mcp_command
def alerts_test(
    ctx: typer.Context,
    condition: str = typer.Option(..., "--condition"),
    threshold: float = typer.Option(..., "--threshold"),
    operator: str = typer.Option("gt", "--operator"),
    window: int = typer.Option(3600, "--window"),
) -> None:
    """What a rule would see right now. Records nothing, tells nobody.

    The answer worth having is not the number but whether the condition can
    be **read at all**: a rule on something nothing reads never fires, and
    never firing is exactly what a correctly-quiet rule looks like.
    """
    trial = _call(
        lambda: _client().test_mcp_alert_rule(
            {
                "condition": condition,
                "threshold": threshold,
                "operator": operator,
                "window_seconds": window,
            }
        )
    )
    if _emit_machine(trial, _context(ctx)):
        return
    if not trial.get("readable"):
        console.print(
            "[yellow]Cannot be read at the moment[/yellow], so this rule would "
            "not fire — and a rule that never fires looks exactly like a "
            "condition that never happens."
        )
        if trial.get("detail"):
            console.print(f"[dim]{trial['detail']}[/dim]")
        return
    verdict = "would fire" if trial.get("would_fire") else "would not fire"
    console.print(f"Reads {trial.get('value')} now, so this rule {verdict}.")


@app.command(name="forwarding")
@mcp_command
def forwarding(
    ctx: typer.Context,
    org: str | None = typer.Option(None, "--org", help="An organization you own or audit."),
) -> None:
    """Whether the audit is reaching your own system of record.

    Forwarding never fails the call it describes, so a failure is invisible
    unless something reports it. This is that something.
    """
    answer = _call(lambda: _client().get_mcp_audit_forwarding(org=org))
    if _emit_machine(answer, _context(ctx)):
        return
    console.print(forwarding_table(answer))


@app.command(name="jobs")
@mcp_command
def jobs(ctx: typer.Context) -> None:
    """The gateway's periodic work — retention, alerts — on the replica that answers.

    Platform administrators only. The counts belong to whichever replica the
    load balancer picked: only one holds each job's lease at a time, so a high
    `skipped` here is the scheduler working. Ask again to reach another
    replica; every replica skipping is the lease store refusing everybody.
    """
    answer = _call(lambda: _client().get_mcp_job_schedule())
    if _emit_machine(answer, _context(ctx)):
        return
    console.print(jobs_table(answer))


# ---------------------------------------------------------------------------
# audit
# ---------------------------------------------------------------------------


@app.command(name="audit")
@mcp_command
def audit(
    ctx: typer.Context,
    org: str | None = typer.Option(None, "--org", help="An organization you own or audit."),
    team: str | None = typer.Option(None, "--team", help="A team of that organization."),
    agent: str | None = typer.Option(None, "--agent", help="The agent's client id."),
    user: str | None = typer.Option(None, "--user", help="A member's uid."),
    tool: str | None = typer.Option(None, "--tool", help="A tool name."),
    decision: str | None = typer.Option(None, "--decision", help="allowed or refused."),
    outcome: str | None = typer.Option(None, "--outcome", help="ok, error or is_error."),
    since: str | None = typer.Option(None, "--since", help="ISO 8601, UTC."),
    until: str | None = typer.Option(None, "--until", help="ISO 8601, UTC."),
    task_id: str | None = typer.Option(None, "--task", help="The rows of one task."),
    cursor: str | None = typer.Option(None, "--cursor", help="Continue a page."),
    limit: int = typer.Option(50, "--limit", min=1, max=500),
    export: str | None = typer.Option(None, "--export", help="Export everything the filters select: jsonl or csv."),
    file: Path | None = typer.Option(None, "--file", help="Write the export here instead of stdout."),
) -> None:
    """The audit log: every call and decision, for security auditors and owners."""
    if export is not None:
        if export not in ("jsonl", "csv"):
            raise McpCommandError("--export takes jsonl or csv")
        document = _call(
            lambda: _client().export_mcp_audit_events(
                format=export, org=org, team=team, agent=agent, user=user, tool=tool,
                decision=decision, outcome=outcome, since=since, until=until,
            )
        )
        if file is not None:
            file.parent.mkdir(parents=True, exist_ok=True)
            file.write_text(document)
            console.print(f"Wrote {file}")
        else:
            sys.stdout.write(document)
        return
    page = _call(
        lambda: _client().list_mcp_audit_events(
            org=org, team=team, agent=agent, user=user, tool=tool, decision=decision,
            outcome=outcome, since=since, until=until, task_id=task_id, cursor=cursor, limit=limit,
        )
    )
    if _emit_machine(page, _context(ctx)):
        return
    console.print(audit_events_table(page.items))
    if page.next_cursor:
        console.print(f"Next cursor: {page.next_cursor}")


# ---------------------------------------------------------------------------
# trace, metrics, logs
# ---------------------------------------------------------------------------


@app.command(name="trace")
@mcp_command
def trace(ctx: typer.Context, task_uid: str = typer.Argument(..., help="The task (run) uid.")) -> None:
    """The spans of a run — gateway, policy, worker and what they called — as a tree."""
    answer = _call(lambda: _client().get_mcp_run_trace(task_uid))
    if _emit_machine(answer, _context(ctx)):
        return
    if not answer.get("trace_id"):
        console.print(f"Task {task_uid} has no trace yet.")
        return
    console.print(spans_table(span_tree(answer.get("spans", [])), title=f"Trace {answer['trace_id']}"))


@app.command(name="metrics")
@mcp_command
def metrics(
    ctx: typer.Context,
    agent: str | None = typer.Option(None, "--agent", help="The SLIs of one agent (client id), read from its spans."),
    org: str | None = typer.Option(None, "--org", help="The SLIs of one organization, read from its spans."),
    since: str | None = typer.Option(None, "--since", help="ISO 8601, UTC; earlier points are left out."),
) -> None:
    """The four service level indicators and the catalog they are read from."""
    answer = _call(lambda: _client().get_mcp_metrics(agent=agent, org=org, since=since))
    if _emit_machine(answer, _context(ctx)):
        return
    scope = f" for agent {agent}" if agent else f" for organization {org}" if org else ""
    console.print(slis_table(answer.get("slis", {}), title=f"MCP service level indicators{scope}"))
    counts = {name: len(points) for name, points in (answer.get("metrics") or {}).items()}
    console.print("Catalog points read: " + ", ".join(f"{name}={count}" for name, count in counts.items()))


@app.command(name="logs")
@mcp_command
def logs(
    ctx: typer.Context,
    task_uid: str = typer.Argument(..., help="The task (run) uid."),
    limit: int = typer.Option(200, "--limit", min=1, max=2000),
    severity: str | None = typer.Option(None, "--severity", help="INFO, WARN, ERROR…"),
) -> None:
    """The log lines of a run, gateway and worker alike, by the trace they carry."""
    answer = _call(lambda: _client().get_mcp_run_logs(task_uid, limit=limit, severity=severity))
    if _emit_machine(answer, _context(ctx)):
        return
    if not answer.get("trace_id"):
        console.print(f"Task {task_uid} has no trace yet.")
        return
    console.print(logs_table(answer.get("records", []), title=f"Logs of trace {answer['trace_id']}"))


# ---------------------------------------------------------------------------
# setup
# ---------------------------------------------------------------------------


@app.command(name="setup", help=f"Write an MCP client's configuration for the Datalayer endpoint.\n\n{_client_registration_notes()}")
@mcp_command
def setup(
    ctx: typer.Context,
    client: str = typer.Argument(..., help="One of: " + ", ".join(MCP_CLIENT_IDS)),
    url: str | None = typer.Option(None, "--url", help="The MCP endpoint; defaults to the configured Jupyter MCP Server URL."),
    scopes: str | None = typer.Option(None, "--scopes", help="Comma-separated scopes to name in the URL, e.g. notebooks:read."),
    name: str = typer.Option("datalayer", "--name", help="The server entry's name in the client's file."),
    path: Path | None = typer.Option(None, "--path", help="Write here instead of the client's default location."),
    print_only: bool = typer.Option(False, "--print", help="Print the resulting file; write nothing."),
) -> None:
    if client not in MCP_CLIENTS:
        raise McpCommandError(f"Unknown client '{client}'. Choose one of: {', '.join(MCP_CLIENT_IDS)}")
    setup_of = MCP_CLIENTS[client]
    endpoint_base = url or _urls().jupyter_mcp_server_url
    endpoint = mcp_endpoint_url(endpoint_base, scopes.split(",") if scopes else None)
    target = path or default_config_path(client)
    if print_only:
        existing = target.read_text() if target.exists() else ""
        try:
            rendered = render_client_configuration(client, endpoint, existing=existing, server_name=name)
        except ValueError as error:
            raise McpCommandError(f"{target}: {error}") from error
        if _emit_machine({"client": client, "path": str(target), "endpoint": endpoint, "content": rendered}, _context(ctx)):
            return
        console.print(f"[dim]# {target}[/dim]")
        sys.stdout.write(rendered)
        return
    try:
        written = write_client_configuration(client, endpoint, path=target, server_name=name)
    except (ValueError, OSError) as error:
        raise McpCommandError(f"{target}: {error}") from error
    answer = {
        "client": client,
        "path": str(written),
        "endpoint": endpoint,
        "registration": setup_of.registration,
        "note": setup_of.note,
    }
    if _emit_machine(answer, _context(ctx)):
        return
    console.print(f"Wrote {written} for {setup_of.name}: {endpoint}")
    console.print(setup_of.note)
    console.print(
        "Registers by URL (Client ID Metadata Document)."
        if setup_of.registration == "cimd"
        else "Registers with dynamic client registration, the deprecated fallback."
    )


def _urls() -> Any:
    from datalayer_core.utils.urls import DatalayerURLs

    return DatalayerURLs.from_environment()
