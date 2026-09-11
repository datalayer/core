# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""Tests for CLI main argument normalization."""

import re

import pytest
from typer.testing import CliRunner

import datalayer_core.cli.__main__ as cli_main
from datalayer_core.cli.__main__ import _normalize_global_options


def test_normalize_global_options_hoists_runtimes_url_after_subcommands() -> None:
    argv = [
        "d",
        "ray",
        "clusters",
        "ls",
        "--runtimes-url",
        "http://localhost:9500",
    ]

    normalized = _normalize_global_options(argv)

    assert normalized == [
        "d",
        "--runtimes-url",
        "http://localhost:9500",
        "ray",
        "clusters",
        "ls",
    ]


def test_normalize_global_options_preserves_equals_syntax() -> None:
    argv = ["d", "whoami", "--iam-url=https://iam.example"]

    normalized = _normalize_global_options(argv)

    assert normalized == ["d", "--iam-url=https://iam.example", "whoami"]


def test_register_extensions_adds_discovered_cli_groups(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Extensions found through the reactor register into the host app."""

    class FakePlatform:
        def __init__(self) -> None:
            self.discovered: list[str] = []
            self.cli: object = None

        def discover(self, group: str) -> list[str]:
            self.discovered.append(group)
            return ["agent-runtimes"]

        def register_cli(self, cli: object) -> list[str]:
            self.cli = cli
            return ["agent-runtimes"]

    fake = FakePlatform()
    import reactor
    import typer

    monkeypatch.setattr(reactor, "PluginPlatform", lambda: fake)

    host = typer.Typer()
    cli_main._register_extensions(host)

    assert fake.discovered == ["datalayer.cli"]
    # Through a view of the host that merges a group the host already has.
    assert isinstance(fake.cli, cli_main._ExtensionHost)
    assert fake.cli.registered_groups is host.registered_groups


def test_an_extension_group_the_host_has_joins_it_rather_than_replacing_it() -> None:
    """`agents` is the host's (`discover`) and agent-runtimes' (`ls` and the rest).

    Click keys a group's subcommands by name, so a second group under a name
    the host has replaced the host's own: `datalayer agents discover` was gone
    the moment agent-runtimes registered its `agents`.
    """
    import typer

    host = typer.Typer()
    ours = typer.Typer(name="agents")

    @ours.command("discover")
    def discover() -> None:
        typer.echo("the host's discover")

    host.add_typer(ours)

    theirs = typer.Typer(name="agents")

    @theirs.command("ls")
    def ls() -> None:
        typer.echo("the extension's ls")

    @theirs.command("discover")
    def their_discover() -> None:
        typer.echo("the extension's discover")

    other = typer.Typer(name="sandboxes")

    @other.command("ls")
    def sandboxes_ls() -> None:
        typer.echo("the extension's sandboxes")

    extension = cli_main._ExtensionHost(host)
    extension.add_typer(theirs)
    extension.add_typer(other)

    runner = CliRunner()
    assert runner.invoke(host, ["agents", "ls"]).stdout.strip() == "the extension's ls"
    assert runner.invoke(host, ["agents", "discover"]).stdout.strip() == "the host's discover"
    assert runner.invoke(host, ["sandboxes", "ls"]).stdout.strip() == "the extension's sandboxes"


def test_the_orchestration_commands_are_registered() -> None:
    executions = _plain(CliRunner().invoke(cli_main.app, ["executions", "--help"]).stdout)
    for command in ("run", "watch", "steer", "cancel", "artifacts"):
        assert command in executions
    agents = _plain(CliRunner().invoke(cli_main.app, ["agents", "--help"]).stdout)
    assert "discover" in agents


def _plain(text: str) -> str:
    """
    Return the text without the styling rich puts through it.

    Rich styles the leading dash of an option separately from the rest, so a
    coloured help page holds no literal ``--output`` to search for.

    Parameters
    ----------
    text : str
        Output captured from a command.

    Returns
    -------
    str
        The same text with every ANSI escape removed.
    """
    return re.sub(r"\x1b\[[0-9;]*m", "", text)


def test_contents_group_is_registered_with_shared_output_option() -> None:
    result = CliRunner().invoke(cli_main.app, ["contents", "--help"])
    assert result.exit_code == 0
    help_text = _plain(result.stdout)
    assert "Browse, transfer, attach" in help_text
    assert "--output" in help_text


def test_contents_url_is_a_normalized_global_option() -> None:
    argv = ["datalayer", "contents", "--contents-url", "http://localhost:9400/"]
    assert _normalize_global_options(argv) == [
        "datalayer",
        "--contents-url",
        "http://localhost:9400/",
        "contents",
    ]
