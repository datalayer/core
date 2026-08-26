# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

# Copyright (c) 2023-2026 Datalayer, Inc.
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

    monkeypatch.setattr(reactor, "PluginPlatform", lambda: fake)

    sentinel = object()
    cli_main._register_extensions(sentinel)

    assert fake.discovered == ["datalayer.cli"]
    assert fake.cli is sentinel


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
