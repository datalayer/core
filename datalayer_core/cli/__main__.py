# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""Command line interface for Datalayer based on Typer."""

import logging
import os
import sys
from typing import Any

import typer

from datalayer_core.__version import __version__
from datalayer_core.cli.commands.about import app as about_app
from datalayer_core.cli.commands.agents import app as agents_app
from datalayer_core.cli.commands.api_keys import api_keys_ls
from datalayer_core.cli.commands.api_keys import app as api_keys_app
from datalayer_core.cli.commands.authn import (
    app as auth_app,
)
from datalayer_core.cli.commands.authn import (
    login_root,
    logout_root,
    whoami_root,
)
from datalayer_core.cli.commands.cluster import app as cluster_app
from datalayer_core.cli.commands.config import app as config_app
from datalayer_core.cli.commands.contents import app as contents_app
from datalayer_core.cli.commands.executions import app as executions_app
from datalayer_core.cli.commands.mcp import app as mcp_app
from datalayer_core.cli.commands.memberships import app as memberships_app
from datalayer_core.cli.commands.orgs import app as orgs_app
from datalayer_core.cli.commands.orgs import orgs_ls
from datalayer_core.cli.commands.otel import app as otel_app
from datalayer_core.cli.commands.plans import app as plans_app
from datalayer_core.cli.commands.plans import plans_root
from datalayer_core.cli.commands.secrets import app as secrets_app
from datalayer_core.cli.commands.secrets import secrets_ls
from datalayer_core.cli.commands.subscription import app as subscription_app
from datalayer_core.cli.commands.subscription import subscription_root
from datalayer_core.cli.commands.teams import app as teams_app
from datalayer_core.cli.commands.teams import teams_ls
from datalayer_core.cli.commands.usage import app as usage_app
from datalayer_core.cli.commands.usage import usage_root
from datalayer_core.cli.commands.users import app as users_app
from datalayer_core.cli.commands.web import app as web_app


def version_callback(value: bool) -> None:
    """Display version information and exit."""
    if value:
        typer.echo(f"datalayer_core: {__version__}")
        raise typer.Exit()


# Create the main Typer app
app = typer.Typer(
    name="dla",
    help="The Datalayer CLI application",
    no_args_is_help=True,
)


# Add version option
@app.callback()
def main_callback(
    version: bool = typer.Option(
        False,
        "--version",
        callback=version_callback,
        is_eager=True,
        help="Show version and exit",
    ),
    api_key: str | None = typer.Option(
        None,
        "--api-key",
        help=(
            "API key for backend calls. Falls back to DATALAYER_API_KEY when "
            "omitted; otherwise built-in auth resolution is used."
        ),
    ),
    iam_url: str | None = typer.Option(
        None,
        "--iam-url",
        help="Override DATALAYER_IAM_URL for this CLI invocation.",
    ),
    runtimes_url: str | None = typer.Option(
        None,
        "--runtimes-url",
        help="Override DATALAYER_RUNTIMES_URL for this CLI invocation.",
    ),
    spacer_url: str | None = typer.Option(
        None,
        "--spacer-url",
        help="Override DATALAYER_SPACER_URL for this CLI invocation.",
    ),
    library_url: str | None = typer.Option(
        None,
        "--library-url",
        help="Override DATALAYER_LIBRARY_URL for this CLI invocation.",
    ),
    manager_url: str | None = typer.Option(
        None,
        "--manager-url",
        help="Override DATALAYER_MANAGER_URL for this CLI invocation.",
    ),
    ai_agents_url: str | None = typer.Option(
        None,
        "--ai-agents-url",
        help="Override DATALAYER_AI_AGENTS_URL for this CLI invocation.",
    ),
    ai_inference_url: str | None = typer.Option(
        None,
        "--ai-inference-url",
        help="Override DATALAYER_AI_INFERENCE_URL for this CLI invocation.",
    ),
    growth_url: str | None = typer.Option(
        None,
        "--growth-url",
        help="Override DATALAYER_GROWTH_URL for this CLI invocation.",
    ),
    otel_url: str | None = typer.Option(
        None,
        "--otel-url",
        help="Override DATALAYER_OTEL_URL for this CLI invocation.",
    ),
    success_url: str | None = typer.Option(
        None,
        "--success-url",
        help="Override DATALAYER_SUCCESS_URL for this CLI invocation.",
    ),
    status_url: str | None = typer.Option(
        None,
        "--status-url",
        help="Override DATALAYER_STATUS_URL for this CLI invocation.",
    ),
    support_url: str | None = typer.Option(
        None,
        "--support-url",
        help="Override DATALAYER_SUPPORT_URL for this CLI invocation.",
    ),
    jupyter_mcp_server_url: str | None = typer.Option(
        None,
        "--jupyter-mcp-server-url",
        help="Override DATALAYER_JUPYTER_MCP_SERVER_URL for this CLI invocation.",
    ),
    scheduler_url: str | None = typer.Option(
        None,
        "--scheduler-url",
        help="Override DATALAYER_SCHEDULER_URL for this CLI invocation.",
    ),
    contents_url: str | None = typer.Option(
        None,
        "--contents-url",
        help="Override DATALAYER_CONTENTS_URL for this CLI invocation.",
    ),
) -> None:
    """Main callback to handle global options."""
    overrides = {
        "DATALAYER_IAM_URL": iam_url,
        "DATALAYER_RUNTIMES_URL": runtimes_url,
        "DATALAYER_SPACER_URL": spacer_url,
        "DATALAYER_LIBRARY_URL": library_url,
        "DATALAYER_MANAGER_URL": manager_url,
        "DATALAYER_AI_AGENTS_URL": ai_agents_url,
        "DATALAYER_AI_INFERENCE_URL": ai_inference_url,
        "DATALAYER_GROWTH_URL": growth_url,
        "DATALAYER_OTEL_URL": otel_url,
        "DATALAYER_SUCCESS_URL": success_url,
        "DATALAYER_STATUS_URL": status_url,
        "DATALAYER_SUPPORT_URL": support_url,
        "DATALAYER_JUPYTER_MCP_SERVER_URL": jupyter_mcp_server_url,
        "DATALAYER_SCHEDULER_URL": scheduler_url,
        "DATALAYER_CONTENTS_URL": contents_url,
    }
    for env_name, value in overrides.items():
        if value is not None:
            os.environ[env_name] = value.rstrip("/")

    # Global auth option: explicit flag overrides env; when omitted keep normal
    # command behavior (env var token or stored auth token).
    if api_key is not None:
        normalized_api_key = str(api_key).strip()
        if normalized_api_key:
            os.environ["DATALAYER_API_KEY"] = normalized_api_key


# Register commands (without name to add them at the top level)
app.add_typer(about_app)
app.add_typer(agents_app)
app.add_typer(auth_app)
app.add_typer(cluster_app)
app.add_typer(config_app)
app.add_typer(contents_app)
app.add_typer(executions_app)
app.add_typer(mcp_app)
app.add_typer(memberships_app)
app.add_typer(orgs_app)
app.add_typer(teams_app)
app.add_typer(otel_app)
app.add_typer(secrets_app)
app.add_typer(subscription_app)
app.add_typer(api_keys_app)
app.add_typer(users_app)
app.add_typer(usage_app)
app.add_typer(plans_app)
app.add_typer(web_app)

# Add individual auth commands at root level for convenience
app.command(name="login")(login_root)
app.command(name="logout")(logout_root)
app.command(name="whoami")(whoami_root)
app.command(name="usage")(usage_root)
app.command(name="plans")(plans_root)
app.command(name="subscription")(subscription_root)

# Add convenient aliases at root level
app.command(name="secrets-ls")(secrets_ls)
app.command(name="api-keys-ls")(api_keys_ls)
app.command(name="orgs-ls")(orgs_ls)
app.command(name="teams-ls")(teams_ls)


_GLOBAL_OPTIONS_WITH_VALUES = {
    "--api-key",
    "--iam-url",
    "--runtimes-url",
    "--spacer-url",
    "--library-url",
    "--manager-url",
    "--ai-agents-url",
    "--ai-inference-url",
    "--growth-url",
    "--otel-url",
    "--success-url",
    "--status-url",
    "--support-url",
    "--jupyter-mcp-server-url",
    "--scheduler-url",
    "--contents-url",
}

_GLOBAL_OPTIONS_NO_VALUES = {
    "--version",
}


logger = logging.getLogger(__name__)


def _placeholder_value(value: Any) -> Any:
    """What Typer holds, a default it has not resolved yet read as its value."""
    from typer.models import DefaultPlaceholder

    return value.value if isinstance(value, DefaultPlaceholder) else value


def _group_name(info: Any) -> str | None:
    """The name a group is invoked by: its own, else its Typer application's."""
    name = _placeholder_value(info.name)
    if not name and info.typer_instance is not None:
        name = _placeholder_value(info.typer_instance.info.name)
    return str(name) if name else None


def _command_name(info: Any) -> str | None:
    """The name a command is invoked by: its own, else Typer's from its function."""
    from typer.main import get_command_name

    if info.name:
        return str(info.name)
    return get_command_name(info.callback.__name__) if info.callback is not None else None


class _ExtensionHost:
    """
    This application, as an extension registering into it sees it.

    Click keys a group's subcommands by name, so an extension adding a group
    under a name this application already has replaced this application's
    group with its own: agent-runtimes' ``agents`` took ``datalayer agents
    discover`` away the moment it registered. Such a group joins the one
    already here instead — its commands and subgroups are added to it, one
    whose name is taken keeps this application's (and says so), and the
    extension's group callback is not run, the group here having its own.
    Everything else reaches the application unchanged.
    """

    def __init__(self, cli: typer.Typer) -> None:
        self._cli = cli

    def add_typer(self, typer_instance: typer.Typer, **kwargs: Any) -> None:
        name = kwargs.get("name") or _placeholder_value(typer_instance.info.name)
        host = next(
            (
                info.typer_instance
                for info in self._cli.registered_groups
                if info.typer_instance is not None and _group_name(info) == name
            ),
            None,
        )
        if not name or host is None:
            self._cli.add_typer(typer_instance, **kwargs)
            return
        taken = {_command_name(info) for info in host.registered_commands}
        taken |= {_group_name(info) for info in host.registered_groups}
        for command in typer_instance.registered_commands:
            if _command_name(command) in taken:
                logger.warning(
                    "The extension's `%s %s` is not registered: this application has its own.",
                    name,
                    _command_name(command),
                )
                continue
            host.registered_commands.append(command)
        for group in typer_instance.registered_groups:
            if _group_name(group) in taken:
                logger.warning(
                    "The extension's `%s %s` is not registered: this application has its own.",
                    name,
                    _group_name(group),
                )
                continue
            host.registered_groups.append(group)

    def __getattr__(self, attribute: str) -> Any:
        return getattr(self._cli, attribute)


def _register_extensions(cli: typer.Typer) -> None:
    """
    Add the commands of every installed Datalayer CLI extension.

    The commands of the platform are not all implemented here — the
    sandboxes, the agents, the environments live in `agent-runtimes` — and
    typing that name is asking the user to know which distribution a feature
    ships in. This CLI used to SPAWN the other one as a fallback; now the
    extensions register in-process, through the reactor: any distribution
    advertising a plugin under the ``datalayer.cli`` entry-point group adds
    its command groups to this application when it starts. A group under a
    name this application already has joins it (``_ExtensionHost``).

    Without the reactor installed there are simply no extensions — the
    commands of this package all still work.
    """
    try:
        from reactor import PluginPlatform
        from reactor.cli import extend
    except ImportError:
        return
    platform = PluginPlatform()
    platform.discover("datalayer.cli")
    # The reactor CLI's own registration path — skip-on-failure included —
    # rather than a local copy of it, into a view of this application that
    # merges a group it already has rather than letting it be replaced.
    extend(_ExtensionHost(cli), platform)  # type: ignore[arg-type]


def _normalize_global_options(argv: list[str]) -> list[str]:
    """Hoist supported global options so they work at any argument position."""
    if len(argv) <= 1:
        return argv

    extracted: list[str] = []
    remaining: list[str] = []
    i = 1
    while i < len(argv):
        token = argv[i]

        if token == "--":
            remaining.extend(argv[i:])
            break

        if token in _GLOBAL_OPTIONS_NO_VALUES:
            extracted.append(token)
            i += 1
            continue

        matched_equals = next(
            (
                option
                for option in _GLOBAL_OPTIONS_WITH_VALUES
                if token.startswith(f"{option}=")
            ),
            None,
        )
        if matched_equals:
            extracted.append(token)
            i += 1
            continue

        if token in _GLOBAL_OPTIONS_WITH_VALUES:
            extracted.append(token)
            if i + 1 < len(argv):
                extracted.append(argv[i + 1])
                i += 2
            else:
                i += 1
            continue

        remaining.append(token)
        i += 1

    return [argv[0], *extracted, *remaining]


def main() -> None:
    """Main entry point for the Datalayer Typer CLI."""
    _register_extensions(app)
    app(args=_normalize_global_options(sys.argv)[1:])


if __name__ == "__main__":
    main()
