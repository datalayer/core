# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""Command line interface for Datalayer based on Typer."""

import os
import sys

import typer

from datalayer_core.__version__ import __version__
from datalayer_core.cli.commands.about import app as about_app
from datalayer_core.cli.commands.agents import agents_ls
from datalayer_core.cli.commands.agents import app as agents_app
from datalayer_core.cli.commands.agent_nodes import app as agent_nodes_app
from datalayer_core.cli.commands.agent_nodes import agent_nodes_ls
from datalayer_core.cli.commands.authn import (
    app as auth_app,
)
from datalayer_core.cli.commands.authn import (
    login_root,
    logout_root,
    whoami_root,
)
from datalayer_core.cli.commands.benchmarks import app as benchmarks_app
from datalayer_core.cli.commands.cluster import app as cluster_app
from datalayer_core.cli.commands.config import app as config_app
from datalayer_core.cli.commands.console import app as console_app
from datalayer_core.cli.commands.envs import app as envs_app
from datalayer_core.cli.commands.envs import envs_ls
from datalayer_core.cli.commands.evals import app as evals_app
from datalayer_core.cli.commands.exec import main as exec_main
from datalayer_core.cli.commands.memberships import app as memberships_app
from datalayer_core.cli.commands.otel import app as otel_app
from datalayer_core.cli.commands.pools import app as pools_app
from datalayer_core.cli.commands.ray import app as ray_app
from datalayer_core.cli.commands.runtime_checkpoints import app as checkpoints_app
from datalayer_core.cli.commands.runtime_checkpoints import (
    checkpoints_ls,
)
from datalayer_core.cli.commands.sandbox_snapshots import app as snapshots_app
from datalayer_core.cli.commands.sandbox_snapshots import snapshots_ls
from datalayer_core.cli.commands.runtimes import app as runtimes_app
from datalayer_core.cli.commands.runtimes import runtimes_ls
from datalayer_core.cli.commands.schedules import app as schedules_app
from datalayer_core.cli.commands.secrets import app as secrets_app
from datalayer_core.cli.commands.secrets import secrets_ls
from datalayer_core.cli.commands.subscription import app as subscription_app
from datalayer_core.cli.commands.subscription import subscription_root
from datalayer_core.cli.commands.tokens import app as tokens_app
from datalayer_core.cli.commands.tokens import tokens_ls
from datalayer_core.cli.commands.usage import app as usage_app
from datalayer_core.cli.commands.usage import usage_root
from datalayer_core.cli.commands.plans import app as plans_app
from datalayer_core.cli.commands.plans import plans_root
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
    run_url: str | None = typer.Option(
        None,
        "--run-url",
        help="Override DATALAYER_RUN_URL for this CLI invocation.",
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
        "--space-url",
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
    mcp_server_url: str | None = typer.Option(
        None,
        "--mcp-server-url",
        help="Override DATALAYER_MCP_SERVER_URL for this CLI invocation.",
    ),
    scheduler_url: str | None = typer.Option(
        None,
        "--scheduler-url",
        help="Override DATALAYER_SCHEDULER_URL for this CLI invocation.",
    ),
) -> None:
    """Main callback to handle global options."""
    overrides = {
        "DATALAYER_RUN_URL": run_url,
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
        "DATALAYER_MCP_SERVER_URL": mcp_server_url,
        "DATALAYER_SCHEDULER_URL": scheduler_url,
    }
    for env_name, value in overrides.items():
        if value is not None:
            os.environ[env_name] = value.rstrip("/")


# Register commands (without name to add them at the top level)
app.add_typer(about_app)
app.add_typer(agents_app)
app.add_typer(agent_nodes_app)
app.add_typer(auth_app)
app.add_typer(benchmarks_app)
app.add_typer(checkpoints_app)
app.add_typer(cluster_app)
app.add_typer(config_app)
app.add_typer(console_app)
app.add_typer(envs_app)
app.add_typer(evals_app)
app.add_typer(memberships_app)
app.add_typer(otel_app)
app.add_typer(pools_app)
app.add_typer(ray_app)
app.add_typer(runtimes_app)
app.add_typer(schedules_app)
app.add_typer(secrets_app)
app.add_typer(snapshots_app)
app.add_typer(subscription_app)
app.add_typer(tokens_app)
app.add_typer(users_app)
app.add_typer(usage_app)
app.add_typer(plans_app)
app.add_typer(web_app)

# Add exec command directly to root level
app.command(name="exec")(exec_main)

# Add individual auth commands at root level for convenience
app.command(name="login")(login_root)
app.command(name="logout")(logout_root)
app.command(name="whoami")(whoami_root)
app.command(name="usage")(usage_root)
app.command(name="plans")(plans_root)
app.command(name="subscription")(subscription_root)

# Add convenient aliases at root level
app.command(name="envs-ls")(envs_ls)
app.command(name="runtimes-ls")(runtimes_ls)
app.command(name="secrets-ls")(secrets_ls)
app.command(name="snapshots-ls")(snapshots_ls)
app.command(name="checkpoints-ls")(checkpoints_ls)
app.command(name="tokens-ls")(tokens_ls)
app.command(name="agent-nodes-ls")(agent_nodes_ls)
app.command(name="agents-ls")(agents_ls)


_GLOBAL_OPTIONS_WITH_VALUES = {
    "--run-url",
    "--iam-url",
    "--runtimes-url",
    "--spacer-url",
    "--space-url",
    "--library-url",
    "--manager-url",
    "--ai-agents-url",
    "--ai-inference-url",
    "--growth-url",
    "--otel-url",
    "--success-url",
    "--status-url",
    "--support-url",
    "--mcp-server-url",
    "--scheduler-url",
}

_GLOBAL_OPTIONS_NO_VALUES = {
    "--version",
}


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
    app(args=_normalize_global_options(sys.argv)[1:])
