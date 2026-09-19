# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""
What the ``agents`` and ``executions`` command groups share (ORCHESTRATOR.md, O1-13):
the client, the error boundary, the options every command takes, and the
machine-readable output.
"""

from __future__ import annotations

import json
from functools import wraps
from typing import Any, Callable, TypeVar

import typer
import yaml
from pydantic import ValidationError
from rich.console import Console

from datalayer_core.cli.commands.contents import OutputFormat
from datalayer_core.client.client import DatalayerClient

_Command = TypeVar("_Command", bound=Callable[..., Any])

console = Console()
error_console = Console(stderr=True)


class OrchestrationCommandError(RuntimeError):
    """A safe, user-facing error of an orchestration command."""


def orchestration_command(function: _Command) -> _Command:
    """The error boundary every orchestration command shares."""

    @wraps(function)
    def wrapped(*args: Any, **kwargs: Any) -> Any:
        try:
            return function(*args, **kwargs)
        except OrchestrationCommandError as error:
            error_console.print(str(error), style="red", markup=False, highlight=False)
            raise typer.Exit(1) from None

    return wrapped  # type: ignore[return-value]


def account_option() -> Any:
    """The account a command acts for, as the web application scopes it."""
    return typer.Option(
        None,
        "--account",
        help="The organization or team the executions belong to; your own account when omitted.",
    )


def output_option() -> Any:
    return typer.Option(
        OutputFormat.TABLE,
        "--output",
        "-o",
        case_sensitive=False,
        help="Output format.",
    )


def client() -> DatalayerClient:
    try:
        return DatalayerClient()
    except Exception as error:
        raise OrchestrationCommandError(str(error)) from error


def _validation_words(error: ValidationError) -> str:
    return "; ".join(
        f"{'.'.join(str(part) for part in problem['loc']) or 'value'}: {problem['msg']}"
        for problem in error.errors()
    )


def call(function: Callable[[], Any]) -> Any:
    """Run one step of a command, turning what went wrong into words."""
    try:
        return function()
    except OrchestrationCommandError:
        raise
    except ValidationError as error:
        raise OrchestrationCommandError(_validation_words(error)) from error
    except Exception as error:
        raise OrchestrationCommandError(str(error)) from error


def emit(value: Any, output: OutputFormat) -> bool:
    """Print JSON or YAML when asked; answer whether that was done."""
    if output is OutputFormat.JSON:
        console.print_json(json.dumps(value, default=str))
        return True
    if output is OutputFormat.YAML:
        console.print(yaml.safe_dump(value, sort_keys=False).rstrip(), markup=False, highlight=False)
        return True
    return False


def emit_line(value: Any, output: OutputFormat) -> None:
    """One record of a stream: a JSON line, or a YAML document."""
    if output is OutputFormat.YAML:
        typer.echo(yaml.safe_dump(value, sort_keys=False, explicit_start=True).rstrip())
        return
    typer.echo(json.dumps(value, separators=(",", ":"), default=str))
