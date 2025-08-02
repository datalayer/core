# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""
Typer CLI Example for Datalayer Core.

This file demonstrates how the current Datalayer CLI could be migrated to use Typer
instead of the current traitlets-based approach. It mimics the existing structure
and commands while showcasing Typer's benefits.

Usage:
    python typer_cli_example.py --help
    python typer_cli_example.py runtimes list
    python typer_cli_example.py environments list
    python typer_cli_example.py secrets create --name test --value secret
"""

import os
from enum import Enum
from pathlib import Path
from typing import List, Optional

import typer
from rich import print
from rich.console import Console
from rich.table import Table
from typing_extensions import Annotated

# Console for rich output
console = Console()

# Main app
app = typer.Typer(
    name="datalayer",
    help="Datalayer Core CLI - Python SDK and CLI for the Datalayer AI Platform",
    add_completion=False,
    rich_markup_mode="rich",
)

# Sub-applications for organized command structure
runtimes_app = typer.Typer(name="runtimes", help="Manage compute runtimes")
environments_app = typer.Typer(name="environments", help="Manage environments")
secrets_app = typer.Typer(name="secrets", help="Manage secrets")
snapshots_app = typer.Typer(name="snapshots", help="Manage snapshots")
tokens_app = typer.Typer(name="tokens", help="Manage tokens")

# Add sub-applications to main app
app.add_typer(runtimes_app, name="runtimes")
app.add_typer(environments_app, name="environments")
app.add_typer(environments_app, name="envs")  # Alias
app.add_typer(secrets_app, name="secrets")
app.add_typer(snapshots_app, name="snapshots")
app.add_typer(tokens_app, name="tokens")


# Enums for choices
class EnvironmentType(str, Enum):
    """Available environment types for Datalayer runtimes."""

    python_cpu = "python-cpu-env"
    python_gpu = "python-gpu-env"
    ai_env = "ai-env"
    data_science = "python-datascience-env"


class SecretType(str, Enum):
    """Available secret types for Datalayer secrets."""

    generic = "generic"
    password = "password"
    key = "key"
    token = "token"


# Global options
def get_client() -> str:
    """
    Get a configured Datalayer client.

    Returns
    -------
    str
        Mock client instance (in real implementation would return DatalayerClient).
    """
    # In real implementation, this would return DatalayerClient()
    print("[dim]Initializing Datalayer client...[/dim]")
    return "MockClient"


def common_options(
    token: Annotated[
        Optional[str],
        typer.Option("--token", "-t", help="Datalayer authentication token"),
    ] = None,
    url: Annotated[
        Optional[str], typer.Option("--url", "-u", help="Datalayer server URL")
    ] = None,
    verbose: Annotated[
        bool, typer.Option("--verbose", "-v", help="Enable verbose output")
    ] = False,
) -> None:
    """
    Common options for all commands.

    Parameters
    ----------
    token : Optional[str], optional
        Datalayer authentication token.
    url : Optional[str], optional
        Datalayer server URL.
    verbose : bool, optional
        Enable verbose output, by default False.
    """
    if token:
        os.environ["DATALAYER_TOKEN"] = token
    if url:
        os.environ["DATALAYER_RUN_URL"] = url
    if verbose:
        console.print("[dim]Verbose mode enabled[/dim]")


# Main CLI commands
@app.command()
def whoami(
    token: Annotated[
        Optional[str], typer.Option("--token", "-t", help="Authentication token")
    ] = None,
) -> None:
    """
    Show current user information.

    Parameters
    ----------
    token : Optional[str], optional
        Authentication token.
    """
    common_options(token=token)
    client = get_client()

    console.print("🔍 [bold blue]User Information[/bold blue]")
    console.print("User: john.doe@example.com")
    console.print("Organization: Datalayer")
    console.print("Role: Developer")


@app.command()
def login(
    token: Annotated[
        Optional[str], typer.Option("--token", "-t", help="Authentication token")
    ] = None,
) -> None:
    """
    Authenticate with Datalayer.

    Parameters
    ----------
    token : Optional[str], optional
        Authentication token.
    """
    if not token:
        token = typer.prompt("Enter your Datalayer token", hide_input=True)

    # In real implementation: client.login(token)
    console.print("✅ [bold green]Successfully authenticated![/bold green]")


@app.command()
def logout() -> None:
    """Log out from Datalayer."""
    # In real implementation: client.logout()
    console.print("👋 [bold yellow]Logged out successfully[/bold yellow]")


# Runtime commands
@runtimes_app.command("list")
def list_runtimes(
    token: Annotated[Optional[str], typer.Option("--token", "-t")] = None,
    environment: Annotated[
        Optional[str], typer.Option("--environment", "-e", help="Filter by environment")
    ] = None,
    all: Annotated[
        bool, typer.Option("--all", "-a", help="Show all runtimes including terminated")
    ] = False,
) -> None:
    """
    List running runtimes.

    Parameters
    ----------
    token : Optional[str], optional
        Authentication token.
    environment : Optional[str], optional
        Filter by environment.
    all : bool, optional
        Show all runtimes including terminated, by default False.
    """
    common_options(token=token)
    client = get_client()

    table = Table(title="🚀 Running Runtimes")
    table.add_column("Name", style="cyan")
    table.add_column("Environment", style="green")
    table.add_column("Status", style="yellow")
    table.add_column("Cost/hour", style="red")
    table.add_column("Started", style="blue")

    # Mock data
    runtimes = [
        ("my-runtime-1", "python-cpu-env", "Running", "$0.10", "2 hours ago"),
        (
            "data-analysis",
            "python-datascience-env",
            "Running",
            "$0.25",
            "30 minutes ago",
        ),
        ("ml-training", "ai-env", "Running", "$2.50", "1 hour ago"),
    ]

    for runtime in runtimes:
        if environment and environment not in runtime[1]:
            continue
        table.add_row(*runtime)

    console.print(table)


@runtimes_app.command("create")
def create_runtime(
    name: Annotated[str, typer.Argument(help="Runtime name")],
    environment: Annotated[
        EnvironmentType, typer.Option("--environment", "-e", help="Environment type")
    ] = EnvironmentType.python_cpu,
    time_reservation: Annotated[
        int, typer.Option("--time", "-t", help="Time reservation in minutes")
    ] = 60,
    snapshot: Annotated[
        Optional[str], typer.Option("--snapshot", "-s", help="Create from snapshot")
    ] = None,
    token: Annotated[Optional[str], typer.Option("--token")] = None,
) -> None:
    """
    Create a new runtime.

    Parameters
    ----------
    name : str
        Runtime name.
    environment : EnvironmentType, optional
        Environment type, by default EnvironmentType.python_cpu.
    time_reservation : int, optional
        Time reservation in minutes, by default 60.
    snapshot : Optional[str], optional
        Create from snapshot.
    token : Optional[str], optional
        Authentication token.
    """
    common_options(token=token)
    client = get_client()

    with console.status(f"[bold green]Creating runtime '{name}'..."):
        # In real implementation: runtime = client.create_runtime(...)
        pass

    console.print(f"✅ [bold green]Runtime '{name}' created successfully![/bold green]")
    console.print(f"Environment: {environment.value}")
    console.print(f"Time reservation: {time_reservation} minutes")
    if snapshot:
        console.print(f"Created from snapshot: {snapshot}")


@runtimes_app.command("terminate")
def terminate_runtime(
    name: Annotated[str, typer.Argument(help="Runtime name to terminate")],
    force: Annotated[
        bool, typer.Option("--force", "-f", help="Force termination")
    ] = False,
    token: Annotated[Optional[str], typer.Option("--token")] = None,
) -> None:
    """
    Terminate a runtime.

    Parameters
    ----------
    name : str
        Runtime name to terminate.
    force : bool, optional
        Force termination, by default False.
    token : Optional[str], optional
        Authentication token.
    """
    common_options(token=token)

    if not force:
        confirm = typer.confirm(f"Are you sure you want to terminate runtime '{name}'?")
        if not confirm:
            raise typer.Abort()

    with console.status(f"[bold red]Terminating runtime '{name}'..."):
        # In real implementation: client.terminate_runtime(name)
        pass

    console.print(f"🛑 [bold red]Runtime '{name}' terminated[/bold red]")


@runtimes_app.command("exec")
def exec_runtime(
    name: Annotated[str, typer.Argument(help="Runtime name")],
    code: Annotated[
        Optional[str], typer.Option("--code", "-c", help="Code to execute")
    ] = None,
    file: Annotated[
        Optional[Path], typer.Option("--file", "-f", help="Python file to execute")
    ] = None,
    output: Annotated[
        Optional[str], typer.Option("--output", "-o", help="Output variable to return")
    ] = None,
    token: Annotated[Optional[str], typer.Option("--token")] = None,
) -> None:
    """
    Execute code in a runtime.

    Parameters
    ----------
    name : str
        Runtime name.
    code : Optional[str], optional
        Code to execute.
    file : Optional[Path], optional
        Python file to execute.
    output : Optional[str], optional
        Output variable to return.
    token : Optional[str], optional
        Authentication token.
    """
    common_options(token=token)

    if not code and not file:
        raise typer.BadParameter("Either --code or --file must be provided")

    if file:
        if not file.exists():
            raise typer.BadParameter(f"File {file} does not exist")
        code = file.read_text()

    console.print(f"🔄 [bold blue]Executing code in runtime '{name}'[/bold blue]")
    console.print("[dim]Code:[/dim]")
    console.print(f"[green]{code}[/green]")

    # Mock execution
    console.print("\n[dim]Output:[/dim]")
    console.print("[white]Code executed successfully![/white]")


# Environment commands
@environments_app.command("list")
def list_environments(
    token: Annotated[Optional[str], typer.Option("--token")] = None,
    language: Annotated[
        Optional[str], typer.Option("--language", "-l", help="Filter by language")
    ] = None,
    gpu: Annotated[
        bool, typer.Option("--gpu", help="Show only GPU environments")
    ] = False,
) -> None:
    """
    List available environments.

    Parameters
    ----------
    token : Optional[str], optional
        Authentication token.
    language : Optional[str], optional
        Filter by language.
    gpu : bool, optional
        Show only GPU environments, by default False.
    """
    common_options(token=token)

    table = Table(title="🌍 Available Environments")
    table.add_column("Name", style="cyan")
    table.add_column("Language", style="green")
    table.add_column("Type", style="yellow")
    table.add_column("Cost/hour", style="red")
    table.add_column("Description", style="blue")

    # Mock data
    environments = [
        ("python-cpu-env", "Python", "CPU", "$0.10", "Basic Python environment"),
        ("python-gpu-env", "Python", "GPU", "$1.50", "Python with GPU support"),
        ("ai-env", "Python", "GPU", "$2.50", "AI/ML optimized environment"),
        (
            "python-datascience-env",
            "Python",
            "CPU",
            "$0.25",
            "Data science packages included",
        ),
    ]

    for env in environments:
        if language and language.lower() not in env[1].lower():
            continue
        if gpu and "GPU" not in env[2]:
            continue
        table.add_row(*env)

    console.print(table)


# Secret commands
@secrets_app.command("list")
def list_secrets(
    token: Annotated[Optional[str], typer.Option("--token")] = None,
) -> None:
    """
    List all secrets.

    Parameters
    ----------
    token : Optional[str], optional
        Authentication token.
    """
    common_options(token=token)

    table = Table(title="🔐 Secrets")
    table.add_column("Name", style="cyan")
    table.add_column("Type", style="green")
    table.add_column("Created", style="blue")

    secrets = [
        ("api-key", "key", "2 days ago"),
        ("database-password", "password", "1 week ago"),
        ("auth-token", "token", "3 days ago"),
    ]

    for secret in secrets:
        table.add_row(*secret)

    console.print(table)


@secrets_app.command("create")
def create_secret(
    name: Annotated[str, typer.Argument(help="Secret name")],
    value: Annotated[
        str,
        typer.Option(
            "--value", "-v", help="Secret value", prompt=True, hide_input=True
        ),
    ],
    secret_type: Annotated[
        SecretType, typer.Option("--type", "-t", help="Secret type")
    ] = SecretType.generic,
    description: Annotated[
        Optional[str], typer.Option("--description", "-d", help="Secret description")
    ] = None,
    token: Annotated[Optional[str], typer.Option("--token")] = None,
) -> None:
    """
    Create a new secret.

    Parameters
    ----------
    name : str
        Secret name.
    value : str
        Secret value.
    secret_type : SecretType, optional
        Secret type, by default SecretType.generic.
    description : Optional[str], optional
        Secret description.
    token : Optional[str], optional
        Authentication token.
    """
    common_options(token=token)

    with console.status(f"[bold green]Creating secret '{name}'..."):
        # In real implementation: client.create_secret(...)
        pass

    console.print(f"✅ [bold green]Secret '{name}' created successfully![/bold green]")
    console.print(f"Type: {secret_type.value}")
    if description:
        console.print(f"Description: {description}")


@secrets_app.command("delete")
def delete_secret(
    name: Annotated[str, typer.Argument(help="Secret name to delete")],
    force: Annotated[
        bool, typer.Option("--force", "-f", help="Force deletion")
    ] = False,
    token: Annotated[Optional[str], typer.Option("--token")] = None,
) -> None:
    """
    Delete a secret.

    Parameters
    ----------
    name : str
        Secret name to delete.
    force : bool, optional
        Force deletion, by default False.
    token : Optional[str], optional
        Authentication token.
    """
    common_options(token=token)

    if not force:
        confirm = typer.confirm(f"Are you sure you want to delete secret '{name}'?")
        if not confirm:
            raise typer.Abort()

    with console.status(f"[bold red]Deleting secret '{name}'..."):
        # In real implementation: client.delete_secret(name)
        pass

    console.print(f"🗑️ [bold red]Secret '{name}' deleted[/bold red]")


# Snapshot commands
@snapshots_app.command("list")
def list_snapshots(
    token: Annotated[Optional[str], typer.Option("--token")] = None,
) -> None:
    """
    List all snapshots.

    Parameters
    ----------
    token : Optional[str], optional
        Authentication token.
    """
    common_options(token=token)

    table = Table(title="📸 Snapshots")
    table.add_column("Name", style="cyan")
    table.add_column("Environment", style="green")
    table.add_column("Size", style="yellow")
    table.add_column("Created", style="blue")

    snapshots = [
        ("data-analysis-env", "python-datascience-env", "2.1 GB", "2 days ago"),
        ("ml-model-trained", "ai-env", "5.4 GB", "1 week ago"),
        ("dev-environment", "python-cpu-env", "800 MB", "3 days ago"),
    ]

    for snapshot in snapshots:
        table.add_row(*snapshot)

    console.print(table)


@snapshots_app.command("create")
def create_snapshot(
    name: Annotated[str, typer.Argument(help="Snapshot name")],
    runtime: Annotated[
        Optional[str], typer.Option("--runtime", "-r", help="Runtime to snapshot")
    ] = None,
    description: Annotated[
        Optional[str], typer.Option("--description", "-d", help="Snapshot description")
    ] = None,
    stop: Annotated[
        bool, typer.Option("--stop", help="Stop runtime after snapshot")
    ] = False,
    token: Annotated[Optional[str], typer.Option("--token")] = None,
) -> None:
    """
    Create a snapshot from a runtime.

    Parameters
    ----------
    name : str
        Snapshot name.
    runtime : Optional[str], optional
        Runtime to snapshot.
    description : Optional[str], optional
        Snapshot description.
    stop : bool, optional
        Stop runtime after snapshot, by default False.
    token : Optional[str], optional
        Authentication token.
    """
    common_options(token=token)

    if not runtime:
        runtime = typer.prompt("Enter runtime name to snapshot")

    with console.status(
        f"[bold blue]Creating snapshot '{name}' from runtime '{runtime}'..."
    ):
        # In real implementation: client.create_snapshot(...)
        pass

    console.print(
        f"✅ [bold green]Snapshot '{name}' created successfully![/bold green]"
    )
    console.print(f"Source runtime: {runtime}")
    if description:
        console.print(f"Description: {description}")
    if stop:
        console.print("Runtime has been stopped")


# Token commands
@tokens_app.command("list")
def list_tokens(
    token: Annotated[Optional[str], typer.Option("--token")] = None,
) -> None:
    """
    List all tokens.

    Parameters
    ----------
    token : Optional[str], optional
        Authentication token.
    """
    common_options(token=token)

    table = Table(title="🎫 Tokens")
    table.add_column("ID", style="cyan")
    table.add_column("Name", style="green")
    table.add_column("Type", style="yellow")
    table.add_column("Expires", style="red")

    tokens = [
        ("abc123", "dev-token", "user", "30 days"),
        ("def456", "ci-token", "service", "never"),
        ("ghi789", "temp-token", "user", "7 days"),
    ]

    for token_info in tokens:
        table.add_row(*token_info)

    console.print(table)


@tokens_app.command("create")
def create_token(
    name: Annotated[str, typer.Argument(help="Token name")],
    description: Annotated[
        str, typer.Option("--description", "-d", help="Token description")
    ],
    expires: Annotated[
        Optional[int], typer.Option("--expires", "-e", help="Expiration in days")
    ] = None,
    token: Annotated[Optional[str], typer.Option("--token")] = None,
) -> None:
    """
    Create a new token.

    Parameters
    ----------
    name : str
        Token name.
    description : str
        Token description.
    expires : Optional[int], optional
        Expiration in days.
    token : Optional[str], optional
        Authentication token.
    """
    common_options(token=token)

    with console.status(f"[bold green]Creating token '{name}'..."):
        # In real implementation: client.create_token(...)
        pass

    console.print(f"✅ [bold green]Token '{name}' created successfully![/bold green]")
    console.print(f"Description: {description}")
    if expires:
        console.print(f"Expires in: {expires} days")
    else:
        console.print("Expires: Never")
    console.print("[bold yellow]Token: abc123def456ghi789[/bold yellow]")
    console.print("[dim]Save this token securely - it won't be shown again![/dim]")


# Version and help commands
@app.command()
def version() -> None:
    """Show version information."""
    console.print("🚀 [bold blue]Datalayer Core[/bold blue]")
    console.print("Version: 0.13.0")
    console.print("Python SDK and CLI for the Datalayer AI Platform")


@app.command()
def config(
    show: Annotated[
        bool, typer.Option("--show", help="Show current configuration")
    ] = False,
    set_token: Annotated[
        Optional[str], typer.Option("--set-token", help="Set authentication token")
    ] = None,
    set_url: Annotated[
        Optional[str], typer.Option("--set-url", help="Set server URL")
    ] = None,
) -> None:
    """
    Manage Datalayer configuration.

    Parameters
    ----------
    show : bool, optional
        Show current configuration, by default False.
    set_token : Optional[str], optional
        Set authentication token.
    set_url : Optional[str], optional
        Set server URL.
    """
    if show:
        console.print("📋 [bold blue]Current Configuration[/bold blue]")
        console.print(f"Token: {os.getenv('DATALAYER_TOKEN', 'Not set')}")
        console.print(
            f"Server URL: {os.getenv('DATALAYER_RUN_URL', 'https://api.datalayer.run')}"
        )

    if set_token:
        os.environ["DATALAYER_TOKEN"] = set_token
        console.print("✅ Token updated")

    if set_url:
        os.environ["DATALAYER_RUN_URL"] = set_url
        console.print("✅ Server URL updated")


if __name__ == "__main__":
    app()
