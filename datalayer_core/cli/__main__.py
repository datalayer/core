# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""Command line interface for Datalayer based on Typer."""

import typer

from datalayer_core.cli.commands.about import app as about_app
from datalayer_core.cli.commands.auth import (
    app as auth_app,
    login_root,
    logout_root, 
    whoami_root,
)
from datalayer_core.cli.commands.benchmarks import app as benchmarks_app
from datalayer_core.cli.commands.console import app as console_app
from datalayer_core.cli.commands.envs import app as envs_app, envs_list, envs_ls
from datalayer_core.cli.commands.runtimes import app as runtimes_app, runtimes_list, runtimes_ls
from datalayer_core.cli.commands.secrets import app as secrets_app, secrets_list, secrets_ls
from datalayer_core.cli.commands.runtime_snapshots import app as snapshots_app, snapshots_list, snapshots_ls
from datalayer_core.cli.commands.tokens import app as tokens_app, tokens_list, tokens_ls
from datalayer_core.cli.commands.web import app as web_app
from datalayer_core.cli.exec.exec import main as exec_main

# Create the main Typer app
app = typer.Typer(
    name="dla",
    help="Datalayer CLI - A command line tool for managing Datalayer resources.",
    no_args_is_help=True,
)

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
app.add_typer(web_app)

# Add exec command directly to root level
app.command(name="exec")(exec_main)

# Add individual auth commands at root level for convenience
app.command(name="login")(login_root)
app.command(name="logout")(logout_root)
app.command(name="whoami")(whoami_root)

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

def main():
    """Main entry point for the Datalayer Typer CLI."""
    app()