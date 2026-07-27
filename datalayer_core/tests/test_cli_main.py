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


def test_find_root_command_skips_global_options():
    args = [
        "--api-key",
        "token",
        "--runtimes-url=https://runtimes.example",
        "growth",
        "events",
    ]

    command, index = cli_main._find_root_command(args)

    assert command == "growth"
    assert index == 3


def test_try_external_command_runs_datalayer_prefixed_binary(monkeypatch):
    def fake_which(name: str) -> str | None:
        assert name == "datalayer-growth"
        return "/tmp/datalayer-growth"

    captured: dict[str, list[str]] = {}

    class FakeCompleted:
        returncode = 0

    def fake_run(command: list[str], check: bool):
        captured["command"] = command
        captured["check"] = [str(check)]
        return FakeCompleted()

    monkeypatch.setattr(cli_main.shutil, "which", fake_which)
    monkeypatch.setattr(cli_main.subprocess, "run", fake_run)

    exit_code = cli_main._try_external_command(["growth", "events", "ls"])

    assert exit_code == 0
    assert captured["command"] == ["/tmp/datalayer-growth", "events", "ls"]
    assert captured["check"] == ["False"]


def test_try_external_command_ignores_known_root_command(monkeypatch):
    monkeypatch.setattr(cli_main.shutil, "which", lambda _name: "/tmp/not-used")

    exit_code = cli_main._try_external_command(["usage"])

    assert exit_code is None
