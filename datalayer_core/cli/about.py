# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""About command for Datalayer Core CLI."""

from pathlib import Path
from rich.console import Console
from rich.markdown import Markdown
import typer

HERE = Path(__file__).parent

def about():
    """Display information about Datalayer."""
    console = Console()
    about_file_path = HERE / ".." / "about.md"
    
    try:
        with open(about_file_path) as readme:
            markdown = Markdown(readme.read())
        console.print(markdown)
    except FileNotFoundError:
        console.print(f"[red]Error: Could not find about.md at {about_file_path}[/red]")
        raise typer.Exit(1)
    except Exception as e:
        console.print(f"[red]Error reading about file: {e}[/red]")
        raise typer.Exit(1)