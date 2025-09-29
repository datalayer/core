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

# Create the main Typer app
app = typer.Typer(
    name="dla",
    help="Datalayer CLI - A command line tool for managing Datalayer resources.",
    no_args_is_help=True,
)

# Register commands (without name to add them at the top level)
app.add_typer(about_app)
app.add_typer(auth_app)

# Add individual auth commands at root level for convenience
app.command(name="login")(login_root)
app.command(name="logout")(logout_root)
app.command(name="whoami")(whoami_root)

def main():
    """Main entry point for the Datalayer Typer CLI."""
    app()