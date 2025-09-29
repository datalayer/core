# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""Token commands for Datalayer CLI."""

from typing import Optional

import typer
from rich.console import Console

from datalayer_core.client.client import DatalayerClient
from datalayer_core.displays.tokens import display_tokens
from datalayer_core.models.token import TokenType

# Create a Typer app for token commands
app = typer.Typer(name="tokens", help="Token management commands")

console = Console()


@app.command(name="list")
def list_tokens() -> None:
    """List all tokens."""
    try:
        client = DatalayerClient()
        tokens = client.list_tokens()

        # Convert to dict format for display_tokens
        token_dicts = []
        for token in tokens:
            token_dicts.append(
                {
                    "uid": token.uid,
                    "name_s": token.name,
                    "description_t": token.description,
                    "variant_s": token.token_type,
                }
            )

        display_tokens(token_dicts)

    except Exception as e:
        console.print(f"[red]Error listing tokens: {e}[/red]")
        raise typer.Exit(1)


@app.command(name="ls")
def list_tokens_alias() -> None:
    """List all tokens (alias for list)."""
    list_tokens()


@app.command(name="create")
def create_token(
    name: str = typer.Argument(..., help="Name of the token"),
    description: str = typer.Argument(..., help="Description of the token"),
    expiration_date: Optional[int] = typer.Option(
        0,
        "--expiration-date",
        help="Expiration date in seconds since epoch (0 for no expiration)",
    ),
    token_type: str = typer.Option(
        TokenType.USER,
        "--token-type",
        help="Type of the token (user, admin)",
    ),
) -> None:
    """Create a new token."""
    try:
        client = DatalayerClient()

        result = client.create_token(
            name=name,
            description=description,
            expiration_date=expiration_date,
            token_type=token_type,
        )

        if result.get("success", False):
            token_data = result.get("token", {})
            console.print(f"[green]Token '{name}' created successfully![/green]")
            console.print(
                f"[yellow]Token value: {result.get('access_token', 'N/A')}[/yellow]"
            )
            console.print(
                "[dim]Please save this token value securely - it won't be shown again![/dim]"
            )

            # Display the created token info
            if token_data:
                display_tokens(
                    [
                        {
                            "uid": token_data.get("uid"),
                            "name_s": token_data.get("name_s", name),
                            "description_t": token_data.get(
                                "description_t", description
                            ),
                            "variant_s": token_data.get("variant_s", token_type),
                        }
                    ]
                )
        else:
            console.print(
                f"[red]Failed to create token: {result.get('message', 'Unknown error')}[/red]"
            )
            raise typer.Exit(1)

    except Exception as e:
        console.print(f"[red]Error creating token: {e}[/red]")
        raise typer.Exit(1)


@app.command(name="delete")
def delete_token(
    uid: str = typer.Argument(..., help="UID of the token to delete"),
) -> None:
    """Delete a token."""
    try:
        client = DatalayerClient()

        success = client.delete_token(uid)

        if success:
            console.print(f"[green]Token '{uid}' deleted successfully![/green]")
        else:
            console.print(f"[red]Failed to delete token '{uid}'[/red]")
            raise typer.Exit(1)

    except Exception as e:
        console.print(f"[red]Error deleting token: {e}[/red]")
        raise typer.Exit(1)


# Root level commands for convenience
def tokens_list() -> None:
    """List all tokens (root command)."""
    list_tokens()


def tokens_ls() -> None:
    """List all tokens (root command alias)."""
    list_tokens()
