# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""Secret commands for Datalayer CLI."""

from typing import Optional

import typer
from rich.console import Console

from datalayer_core.client.client import DatalayerClient
from datalayer_core.displays.secrets import display_secrets
from datalayer_core.models.secret import SecretVariant

# Create a Typer app for secret commands
app = typer.Typer(name="secrets", help="Secret management commands")

console = Console()


@app.command(name="list")
def list_secrets(
    token: Optional[str] = typer.Option(
        None,
        "--token",
        help="Authentication token (Bearer token for API requests).",
    ),
) -> None:
    """List all secrets."""
    try:
        client = DatalayerClient(token=token)
        secrets = client.list_secrets()

        # Convert to dict format for display_secrets
        secret_dicts = []
        for secret in secrets:
            secret_dicts.append(
                {
                    "uid": secret.uid,
                    "name_s": secret.name,
                    "description_t": secret.description,
                    "variant_s": secret.secret_type,
                }
            )

        display_secrets(secret_dicts)

    except Exception as e:
        console.print(f"[red]Error listing secrets: {e}[/red]")
        raise typer.Exit(1)


@app.command(name="ls")
def list_secrets_alias(
    token: Optional[str] = typer.Option(
        None,
        "--token",
        help="Authentication token (Bearer token for API requests).",
    ),
) -> None:
    """List all secrets (alias for list)."""
    list_secrets(token=token)


@app.command(name="create")
def create_secret(
    name: str = typer.Argument(..., help="Name of the secret"),
    description: str = typer.Argument(..., help="Description of the secret"),
    value: str = typer.Argument(..., help="Value of the secret"),
    variant: str = typer.Option(
        SecretVariant.GENERIC,
        "--variant",
        help="Type/variant of the secret (generic, password, key, token)",
    ),
    token: Optional[str] = typer.Option(
        None,
        "--token",
        help="Authentication token (Bearer token for API requests).",
    ),
) -> None:
    """Create a new secret."""
    try:
        client = DatalayerClient(token=token)

        secret = client.create_secret(
            name=name,
            description=description,
            value=value,
            secret_type=variant,
        )

        # Convert to dict format for display_secrets
        secret_dict = {
            "uid": secret.uid,
            "name_s": secret.name,
            "description_t": secret.description,
            "variant_s": secret.secret_type,
        }

        display_secrets([secret_dict])
        console.print(f"[green]Secret '{name}' created successfully![/green]")

    except Exception as e:
        console.print(f"[red]Error creating secret: {e}[/red]")
        raise typer.Exit(1)


@app.command(name="delete")
def delete_secret(
    uid: str = typer.Argument(..., help="UID of the secret to delete"),
    token: Optional[str] = typer.Option(
        None,
        "--token",
        help="Authentication token (Bearer token for API requests).",
    ),
) -> None:
    """Delete a secret."""
    try:
        client = DatalayerClient(token=token)

        result = client.delete_secret(uid)

        if result.get("success", False):
            console.print(f"[green]Secret '{uid}' deleted successfully![/green]")
        else:
            console.print(
                f"[red]Failed to delete secret '{uid}': {result.get('message', 'Unknown error')}[/red]"
            )
            raise typer.Exit(1)

    except Exception as e:
        console.print(f"[red]Error deleting secret: {e}[/red]")
        raise typer.Exit(1)


# Root level commands for convenience
def secrets_list(
    token: Optional[str] = typer.Option(
        None,
        "--token",
        help="Authentication token (Bearer token for API requests).",
    ),
) -> None:
    """List all secrets (root command)."""
    list_secrets(token=token)


def secrets_ls(
    token: Optional[str] = typer.Option(
        None,
        "--token",
        help="Authentication token (Bearer token for API requests).",
    ),
) -> None:
    """List all secrets (root command alias)."""
    list_secrets(token=token)
