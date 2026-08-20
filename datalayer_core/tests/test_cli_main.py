# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

# Copyright (c) 2023-2026 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""Tests for CLI main argument normalization."""

import datalayer_core.cli.__main__ as cli_main

from datalayer_core.cli.__main__ import _normalize_global_options


def test_normalize_global_options_hoists_runtimes_url_after_subcommands():
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


def test_normalize_global_options_preserves_equals_syntax():
    argv = ["d", "whoami", "--iam-url=https://iam.example"]

    normalized = _normalize_global_options(argv)

    assert normalized == ["d", "--iam-url=https://iam.example", "whoami"]


def test_register_extensions_adds_discovered_cli_groups(monkeypatch):
    """Extensions found through the reactor register into the host app."""

    class FakePlatform:
        def __init__(self):
            self.discovered: list[str] = []
            self.cli = None

        def discover(self, group: str) -> list[str]:
            self.discovered.append(group)
            return ["agent-runtimes"]

        def register_cli(self, cli) -> list[str]:
            self.cli = cli
            return ["agent-runtimes"]

    fake = FakePlatform()
    import reactor

    monkeypatch.setattr(reactor, "PluginPlatform", lambda: fake)

    sentinel = object()
    cli_main._register_extensions(sentinel)

    assert fake.discovered == ["datalayer.cli"]
    assert fake.cli is sentinel
