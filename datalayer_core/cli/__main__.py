# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""Command line interface for Datalayer based on Typer."""

import typer

from .commands.about import app as about_app

# Create the main Typer app
app = typer.Typer(
    name="dla",
    help="Datalayer CLI - A command line tool for managing Datalayer resources.",
    no_args_is_help=True,
)

# Register commands (without name to add them at the top level)
app.add_typer(about_app)

def main():
    """Main entry point for the Datalayer Typer CLI."""
    app()