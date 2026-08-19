# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""Code sandbox commands for the Datalayer CLI.

A code sandbox is a place code runs, and there is more than one kind of place:
the platform of Datalayer, a Jupyter Server, Kaggle, Modal, a container of this
machine. Each of those is a PROVIDER, each provider ships the environments it
offers — Datalayer ships `ai-agents-env`, Kaggle ships a CPU and a GPU session
— and each needs its own credentials before it can be used at all.

What decides whether a provider is offered is therefore what this machine holds:
a token in the environment, a file its own CLI wrote. These commands report
that, so nothing is offered that would fail on the first call, and what is
missing is named rather than left to be guessed.

The knowledge itself lives in `code_sandboxes.providers`, shared with everything
else that offers sandboxes — the web application and the JupyterLab extension
ask the same question and must get the same answer.
"""

from typing import Optional

import typer
from rich.console import Console
from rich.table import Table

app = typer.Typer(
    name="sandboxes",
    help="Code sandbox providers and their environments.",
    invoke_without_command=True,
)

console = Console()


@app.callback()
def sandboxes_callback(ctx: typer.Context) -> None:
    """Code sandbox commands."""
    if ctx.invoked_subcommand is None:
        typer.echo(ctx.get_help())


def _providers():  # type: ignore[no-untyped-def]
    """The provider registry, or a clear failure when it is not installed."""
    try:
        from code_sandboxes.providers import PROVIDERS

        return PROVIDERS
    except ImportError as error:  # pragma: no cover - depends on the install
        console.print(
            "[red]The code sandboxes are not available: "
            f"{error}[/red]\nInstall them with: pip install code-sandboxes"
        )
        raise typer.Exit(code=1) from error


@app.command(name="providers")
def list_providers(
    all_providers: bool = typer.Option(
        False,
        "--all",
        "-a",
        help="Include the providers this machine has no credentials for.",
    ),
) -> None:
    """List the code sandbox providers, and whether they can be used here."""
    providers = _providers()
    shown = [p for p in providers if all_providers or p.is_available()]
    if not shown:
        console.print(
            "No sandbox provider is available. Run with --all to see what "
            "each of them requires."
        )
        return

    table = Table(title="Code Sandbox Providers")
    table.add_column("Provider", style="bold")
    table.add_column("Available")
    table.add_column("Requires")
    table.add_column("Description")
    for provider in shown:
        if provider.is_available():
            available = "[green]yes[/green]"
            requires = "" if provider.needs_credentials else "nothing"
        else:
            available = "[yellow]no[/yellow]"
            # Every way of satisfying it, since any one of them is enough.
            requires = "\n".join(
                requirement.hint for requirement in provider.missing()
            )
        # Escaped: square brackets are markup to rich, and an extra written
        # plainly came out as `pip install code-sandboxes` with the extra gone.
        extra = (
            f" (pip install code-sandboxes\\[{provider.extra}])"
            if provider.extra
            else ""
        )
        table.add_row(
            provider.name, available, requires, f"{provider.description}{extra}"
        )
    console.print(table)


@app.command(name="environments")
def list_environments(
    provider: Optional[str] = typer.Argument(
        None,
        help="Only the environments of that provider; all of them by default.",
    ),
    all_providers: bool = typer.Option(
        False,
        "--all",
        "-a",
        help="Include providers this machine has no credentials for.",
    ),
) -> None:
    """List the environments the providers ship."""
    providers = _providers()
    if provider:
        from code_sandboxes.providers import get_provider

        found = get_provider(provider)
        if found is None:
            console.print(f"[red]No such sandbox provider: {provider}[/red]")
            raise typer.Exit(code=1)
        selection = [found]
    else:
        selection = [p for p in providers if all_providers or p.is_available()]

    table = Table(title="Code Sandbox Environments")
    table.add_column("Provider", style="bold")
    table.add_column("Environment")
    table.add_column("Title")
    table.add_column("Language")
    rows = 0
    for entry in selection:
        if not entry.is_available() and not all_providers and not provider:
            continue
        for environment in entry.environments():
            table.add_row(
                entry.name,
                environment.name,
                environment.title,
                environment.language,
            )
            rows += 1
    if not rows:
        console.print(
            "No environment to show. A provider lists its environments only "
            "once its credentials are in place — `datalayer sandboxes "
            "providers --all` says what each one needs."
        )
        return
    console.print(table)
