# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""User commands for Datalayer CLI."""

import json
from typing import Optional

import requests
import typer
from rich.console import Console

from datalayer_core.client.client import DatalayerClient

# Create a Typer app for user commands
app = typer.Typer(
    name="users", help="User management commands", invoke_without_command=True
)

console = Console()


@app.callback()
def users_callback(ctx: typer.Context) -> None:
    """User management commands."""
    if ctx.invoked_subcommand is None:
        typer.echo(ctx.get_help())


@app.command(name="create")
def create_user(
    handle: str = typer.Option(
        ..., "--handle", help="The account's handle (its unique name)."
    ),
    email: str = typer.Option(..., "--email", help="The account's email address."),
    password: str = typer.Option(
        ...,
        "--password",
        prompt=True,
        confirmation_prompt=True,
        hide_input=True,
        help="The account's password (asked for, hidden, when not given).",
    ),
    first_name: str = typer.Option("", "--first-name", help="The person's first name."),
    last_name: str = typer.Option("", "--last-name", help="The person's last name."),
    api_key: Optional[str] = typer.Option(None, "--api-key", help="Datalayer API key."),
) -> None:
    """
    Create an account: a platform administrator's command.

    The account is created as a verified member, with the handle, email and
    password given; the administrator vouches for it, so no confirmation mail
    is sent. IAM refuses a caller who is not a platform administrator, a
    handle or email already taken, and a password the sign-up would refuse,
    each in a sentence, which is printed as it is. The password is sent to
    IAM once and never printed.
    """
    try:
        client = DatalayerClient(api_key=api_key)
        response = requests.post(
            f"{client.urls.iam_url}/api/iam/v1/users",
            headers={
                "Authorization": f"Bearer {client._get_api_key()}",
                "Content-Type": "application/json",
            },
            json={
                "handle": handle,
                "email": email,
                "password": password,
                "first_name": first_name,
                "last_name": last_name,
            },
            timeout=30,
        )
        try:
            body = response.json()
        except ValueError:
            body = {}
        if not response.ok:
            console.print(
                f"[red]{body.get('detail') or body.get('message') or response.text}[/red]"
            )
            raise typer.Exit(1)
        user = body.get("user") or body.get("data") or {}
        console.print(
            f"[green]Account created:[/green] {user.get('handle_s', handle)} "
            f"({user.get('email_s', email)}), uid {user.get('uid', '?')}"
        )
    except typer.Exit:
        raise
    except requests.exceptions.RequestException as e:
        console.print(f"[red]Request error: {e}[/red]")
        raise typer.Exit(1)


def _iam_headers(client: DatalayerClient) -> dict[str, str]:
    """
    The headers of a call to IAM with the client's key.
    """
    return {
        "Authorization": f"Bearer {client._get_api_key()}",
        "Content-Type": "application/json",
    }


def _say_refusal(response: requests.Response) -> None:
    """
    Print IAM's refusal as it is, and exit 1.
    """
    try:
        body = response.json()
    except ValueError:
        body = {}
    console.print(
        f"[red]{body.get('detail') or body.get('message') or response.text}[/red]"
    )
    raise typer.Exit(1)


def _account_uid(client: DatalayerClient, account: str) -> str:
    """
    The uid of an account named by its handle or its uid.
    """
    if len(account) == 26 and account.isalnum() and account.upper() == account:
        return account
    response = requests.get(
        f"{client.urls.iam_url}/api/iam/v1/users/public/{account}",
        headers=_iam_headers(client),
        timeout=30,
    )
    if not response.ok:
        _say_refusal(response)
    uid = ((response.json() or {}).get("profile") or {}).get("uid")
    if not uid:
        console.print(f"[red]No account has the handle {account}.[/red]")
        raise typer.Exit(1)
    return str(uid)


@app.command(name="credits")
def user_credits(
    account: str = typer.Argument(..., help="The account's handle or uid."),
    add: Optional[float] = typer.Option(
        None, "--add", help="Credits to add to the balance."
    ),
    set_to: Optional[float] = typer.Option(None, "--set", help="The balance to set."),
    api_key: Optional[str] = typer.Option(None, "--api-key", help="Datalayer API key."),
) -> None:
    """
    Show an account's credits, or add to them: a platform administrator's command.

    With neither option, prints the balance. `--add` reads the balance and
    sets it to the balance plus the amount; `--set` sets it. IAM refuses a
    caller who is not a platform administrator, in a sentence printed as it
    is.
    """
    if add is not None and set_to is not None:
        console.print("[red]Give --add or --set, not both.[/red]")
        raise typer.Exit(1)
    if add is not None and add <= 0:
        console.print("[red]--add takes a positive amount of credits.[/red]")
        raise typer.Exit(1)
    if set_to is not None and set_to < 0:
        console.print("[red]--set takes a balance of zero or more.[/red]")
        raise typer.Exit(1)
    try:
        client = DatalayerClient(api_key=api_key)
        uid = _account_uid(client, account)
        url = f"{client.urls.iam_url}/api/iam/v1/usage/credits/users/{uid}"
        read = requests.get(url, headers=_iam_headers(client), timeout=30)
        if not read.ok:
            _say_refusal(read)
        balance = float(
            ((read.json() or {}).get("credits") or {}).get("credits") or 0.0
        )
        if add is None and set_to is None:
            console.print(f"{account} ({uid}) has {balance:,.2f} credits.")
            return
        target = balance + add if add is not None else float(set_to)  # type: ignore[arg-type]
        written = requests.put(
            url, headers=_iam_headers(client), json={"credits": target}, timeout=30
        )
        if not written.ok:
            _say_refusal(written)
        console.print(
            f"[green]{account} ({uid}): {balance:,.2f} credits, now {target:,.2f}.[/green]"
        )
    except typer.Exit:
        raise
    except requests.exceptions.RequestException as e:
        console.print(f"[red]Request error: {e}[/red]")
        raise typer.Exit(1)


@app.command(name="dump-user")
def dump_user(
    uid: str = typer.Argument(..., help="User UID to query"),
    api_key: Optional[str] = typer.Option(
        None,
        "--api-key",
        help="Datalayer API key.",
    ),
) -> None:
    """Dump raw JSON response for a user by UID."""
    try:
        client = DatalayerClient(api_key=api_key)

        # Make direct API call to IAM endpoint
        url = f"{client.urls.iam_url}/api/iam/v1/users/{uid}"

        # Get the api_key for authorization
        auth_token = client._get_api_key()

        # Make request directly with requests to get full response details
        headers = {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json",
        }

        console.print(f"[cyan]Requesting:[/cyan] {url}")

        response = requests.get(url, headers=headers, timeout=30)

        # Print response details
        console.print(f"[green]Status Code:[/green] {response.status_code}")
        console.print("[green]Headers:[/green]")
        for key, value in response.headers.items():
            console.print(f"  {key}: {value}")
        console.print()

        # Print the response body
        console.print("[green]Response Body:[/green]")
        try:
            json_response = response.json()
            console.print(json.dumps(json_response, indent=2))
        except ValueError:
            # If response is not JSON, print raw text
            console.print("[yellow]Response is not JSON:[/yellow]")
            console.print(response.text)

        # Exit with error code if status is not 2xx
        if not response.ok:
            raise typer.Exit(1)

    except requests.exceptions.RequestException as e:
        console.print(f"[red]Request error: {e}[/red]")
        if hasattr(e, "response") and e.response is not None:
            console.print(f"[yellow]Status Code:[/yellow] {e.response.status_code}")
            console.print("[yellow]Response:[/yellow]")
            try:
                console.print(json.dumps(e.response.json(), indent=2))
            except (ValueError, TypeError):
                console.print(e.response.text)
        raise typer.Exit(1)
    except Exception as e:
        console.print(f"[red]Error: {e}[/red]")
        raise typer.Exit(1)
