# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""Command line interface for Datalayer based on Typer."""

import typer

from datalayer_core.__version__ import __version__
from datalayer_core.cli.commands.about import app as about_app
from datalayer_core.cli.commands.authn import (
    app as auth_app,
)
from datalayer_core.cli.commands.authn import (
    login_root,
    logout_root,
    whoami_root,
)
from datalayer_core.cli.commands.benchmarks import app as benchmarks_app
from datalayer_core.cli.commands.console import app as console_app
from datalayer_core.cli.commands.envs import app as envs_app
from datalayer_core.cli.commands.envs import envs_list, envs_ls
from datalayer_core.cli.commands.exec import main as exec_main
from datalayer_core.cli.commands.runtime_snapshots import app as snapshots_app
from datalayer_core.cli.commands.runtime_snapshots import snapshots_list, snapshots_ls
from datalayer_core.cli.commands.runtimes import app as runtimes_app
from datalayer_core.cli.commands.runtimes import runtimes_list, runtimes_ls
from datalayer_core.cli.commands.secrets import app as secrets_app
from datalayer_core.cli.commands.secrets import secrets_list, secrets_ls
from datalayer_core.cli.commands.tokens import app as tokens_app
from datalayer_core.cli.commands.tokens import tokens_list, tokens_ls
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
) -> None:
    """Main callback to handle global options."""
    pass


# Register commands (without name to add them at the top level)
app.add_typer(about_app)
app.add_typer(auth_app)
app.add_typer(benchmarks_app)
app.add_typer(console_app)
app.add_typer(envs_app)
app.add_typer(runtimes_app)
app.add_typer(secrets_app)
app.add_typer(snapshots_app)
app.add_typer(tokens_app)
app.add_typer(users_app)
app.add_typer(usage_app)
app.add_typer(web_app)

# Add exec command directly to root level
app.command(name="exec")(exec_main)

# Add individual auth commands at root level for convenience
app.command(name="login")(login_root)
app.command(name="logout")(logout_root)
app.command(name="whoami")(whoami_root)
app.command(name="usage")(usage_root)

# Add convenient aliases at root level
app.command(name="envs-list")(envs_list)
app.command(name="envs-ls")(envs_ls)
app.command(name="runtimes-list")(runtimes_list)
app.command(name="runtimes-ls")(runtimes_ls)
app.command(name="secrets-list")(secrets_list)
app.command(name="secrets-ls")(secrets_ls)
app.command(name="snapshots-list")(snapshots_list)
app.command(name="snapshots-ls")(snapshots_ls)
app.command(name="tokens-list")(tokens_list)
app.command(name="tokens-ls")(tokens_ls)


def main() -> None:
    """Main entry point for the Datalayer Typer CLI."""
    app()
