# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""About command for Datalayer CLI."""

from pathlib import Path

import typer
from rich.console import Console
from rich.markdown import Markdown
from rich.text import Text

# Create a Typer app for the about command
app = typer.Typer()

FOOTER_ANSI = (
    "\n"
    "\033[0;32m☷☷☷☷☷☷☷☷☷☷☷☷☷☷☷☷☷☷☷☷☷☷☷☷☷☷☷☷☷☷☷☷☷☷☷☷☷☷\033[0m "
    "\033[1;93m☰ DATA\033[0m\033[1;92mLAYER\033[0m"
)


@app.command()
def about() -> None:
    """Display information about Datalayer."""
    HERE = Path(__file__).parent
    console = Console()
    about_file_path = HERE / ".." / ".." / "assets" / "about.md"

    try:
        with open(about_file_path) as readme:
            markdown = Markdown(readme.read())
        console.print(markdown)
        console.print(Text.from_ansi(FOOTER_ANSI))
    except FileNotFoundError:
        console.print(f"[red]Error: Could not find about.md at {about_file_path}[/red]")
        raise typer.Exit(1)
    except Exception as e:
        console.print(f"[red]Error reading about file: {e}[/red]")
        raise typer.Exit(1)
