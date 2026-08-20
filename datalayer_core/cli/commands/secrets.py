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
app = typer.Typer(
    name="secrets", help="Secret management commands", invoke_without_command=True
)

console = Console()


@app.callback()
def secrets_callback(ctx: typer.Context) -> None:
    """Secret management commands."""
    if ctx.invoked_subcommand is None:
        typer.echo(ctx.get_help())


@app.command(name="ls")
def list_secrets(
    api_key: Optional[str] = typer.Option(
        None,
        "--api-key",
        help="Datalayer API key.",
    ),
) -> None:
    """List all secrets."""
    try:
        client = DatalayerClient(api_key=api_key)
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


@app.command(name="create")
def create_secret(
    name: str = typer.Argument(..., help="Name of the secret"),
    description: str = typer.Argument(..., help="Description of the secret"),
    value: str = typer.Argument(..., help="Value of the secret"),
    variant: str = typer.Option(
        SecretVariant.GENERIC,
        "--variant",
        help="Type/variant of the secret (generic, password, key, api_key)",
    ),
    api_key: Optional[str] = typer.Option(
        None,
        "--api-key",
        help="Datalayer API key.",
    ),
) -> None:
    """Create a new secret."""
    try:
        client = DatalayerClient(api_key=api_key)

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
    secret: str = typer.Argument(..., help="UID or name of the secret to delete"),
    api_key: Optional[str] = typer.Option(
        None,
        "--api-key",
        help="Datalayer API key.",
    ),
) -> None:
    """Delete a secret, named by its UID or by its name."""
    try:
        client = DatalayerClient(api_key=api_key)

        # A name is what `secrets ls` shows in full — the UID column is
        # truncated — so a name must work here. It resolves through the
        # list; the UID passes straight through.
        uid = secret
        existing = client.list_secrets()
        if not any(s.uid == secret for s in existing):
            matches = [s for s in existing if s.name == secret]
            if len(matches) == 1:
                uid = matches[0].uid
            elif len(matches) > 1:
                console.print(
                    f"[red]Several secrets are named '{secret}' — delete by "
                    "UID instead:[/red]"
                )
                for match in matches:
                    console.print(f"  {match.uid}")
                raise typer.Exit(1)
            else:
                console.print(f"[red]No secret has the UID or name '{secret}'.[/red]")
                raise typer.Exit(1)

        result = client.delete_secret(uid)

        if result.get("success", False):
            console.print(f"[green]Secret '{secret}' deleted successfully![/green]")
        else:
            console.print(
                f"[red]Failed to delete secret '{secret}': {result.get('message', 'Unknown error')}[/red]"
            )
            raise typer.Exit(1)

    except Exception as e:
        console.print(f"[red]Error deleting secret: {e}[/red]")
        raise typer.Exit(1)


# Root level commands for convenience
def secrets_list(
    api_key: Optional[str] = typer.Option(
        None,
        "--api-key",
        help="Datalayer API key.",
    ),
) -> None:
    """List all secrets (root command)."""
    list_secrets(api_key=api_key)


def secrets_ls(
    api_key: Optional[str] = typer.Option(
        None,
        "--api-key",
        help="Datalayer API key.",
    ),
) -> None:
    """List all secrets (root command alias)."""
    list_secrets(api_key=api_key)
