# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""User commands for Datalayer CLI."""

import json
from typing import Optional

import requests
import typer
from rich.console import Console
from rich.table import Table

from datalayer_core.client.client import DatalayerClient

# Create a Typer app for user commands
app = typer.Typer(name="users", help="Manage users.", invoke_without_command=True)

console = Console()


@app.callback()
def users_callback(ctx: typer.Context) -> None:
    """Manage users."""
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
    Create an account.

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


def _listed(user: dict[str, object]) -> dict[str, object]:
    """
    The fields of an account that `ls` shows, table and JSON alike.

    Who it is, never how to reach them: an email address is personal data,
    and no listing of this command line prints one.
    """
    roles = user.get("roles_ss") or user.get("roles") or []
    return {
        "handle": str(user.get("handle_s") or user.get("handle") or ""),
        "first_name": str(user.get("first_name_t") or user.get("first_name") or ""),
        "last_name": str(user.get("last_name_t") or user.get("last_name") or ""),
        "uid": str(user.get("uid") or ""),
        "roles": [str(role) for role in roles] if isinstance(roles, list) else [],
    }


@app.command(name="ls")
def users_ls(
    query: str = typer.Argument(
        "",
        help="The start of a handle, a first name or a last name; everyone when omitted.",
    ),
    limit: int = typer.Option(25, "--limit", min=1, help="Maximum users to print."),
    as_json: bool = typer.Option(False, "--json", help="Print the users as JSON."),
    api_key: Optional[str] = typer.Option(None, "--api-key", help="Datalayer API key."),
) -> None:
    """
    List users.

    IAM searches the accounts whose handle, first name or last name starts
    with the query, and answers what the caller may see of them. It has no
    paging: the first `--limit` of its answer are printed, and a query
    narrows it. A refusal is printed as IAM's sentence.
    """
    try:
        client = DatalayerClient(api_key=api_key)
        response = requests.post(
            f"{client.urls.iam_url}/api/iam/v1/users/search",
            headers=_iam_headers(client),
            json={"query": query},
            timeout=30,
        )
        if not response.ok:
            _say_refusal(response)
        body = response.json() or {}
        found = (body.get("data") or {}).get("users") or body.get("users") or []
        users = [_listed(user) for user in found[:limit]]
        if as_json:
            typer.echo(json.dumps(users, indent=2, sort_keys=True))
            return
        if not users:
            console.print("[dim]No users.[/dim]")
            return
        table = Table(title="👤 Users")
        table.add_column("Handle", style="cyan")
        table.add_column("Name")
        table.add_column("UID")
        table.add_column("Roles")
        for user in users:
            table.add_row(
                str(user["handle"]),
                f"{user['first_name']} {user['last_name']}".strip(),
                str(user["uid"]),
                ", ".join(user["roles"]) or "-",  # type: ignore[arg-type]
            )
        console.print(table)
        if len(found) > limit:
            console.print(
                f"[dim]{limit} of {len(found)} shown: raise --limit or give a query.[/dim]"
            )
    except typer.Exit:
        raise
    except requests.exceptions.RequestException as e:
        console.print(f"[red]Request error: {e}[/red]")
        raise typer.Exit(1)


# An account's credits, each its own verb
# (`show`, `add`, `set`), so that no account's handle reads as one (3 November 2026).
credits_app = typer.Typer(
    name="credits",
    help="Show, add to or set an account's credits.",
    no_args_is_help=True,
)
app.add_typer(credits_app, name="credits")

ACCOUNT_ARGUMENT = typer.Argument(..., help="The account's handle or uid.")
API_KEY_OPTION = typer.Option(None, "--api-key", help="Datalayer API key.")


@credits_app.command(name="show")
def credits_show(
    account: str = ACCOUNT_ARGUMENT,
    api_key: Optional[str] = API_KEY_OPTION,
) -> None:
    """
    Print an account's credits.
    """
    _credits(account, None, None, api_key)


@credits_app.command(name="add")
def credits_add(
    account: str = ACCOUNT_ARGUMENT,
    amount: float = typer.Argument(..., help="Credits to add to the balance."),
    api_key: Optional[str] = API_KEY_OPTION,
) -> None:
    """
    Add credits to an account's balance.

    The balance is read and set to the balance plus the amount.
    """
    if amount <= 0:
        console.print("[red]add takes a positive amount of credits.[/red]")
        raise typer.Exit(1)
    _credits(account, amount, None, api_key)


@credits_app.command(name="set")
def credits_set(
    account: str = ACCOUNT_ARGUMENT,
    balance: float = typer.Argument(..., help="The balance to set."),
    api_key: Optional[str] = API_KEY_OPTION,
) -> None:
    """
    Set an account's balance.
    """
    if balance < 0:
        console.print("[red]set takes a balance of zero or more.[/red]")
        raise typer.Exit(1)
    _credits(account, None, balance, api_key)


def _credits(
    account: str,
    add: Optional[float],
    set_to: Optional[float],
    api_key: Optional[str],
) -> None:
    """
    Read an account's balance and, with an amount, write it.

    IAM refuses a caller who is not a platform administrator, in a sentence
    printed as it is.
    """
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
    """Dump the raw JSON response for a user by UID."""
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
