# Copyright (c) 2023-2026 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""Tests for CLI main argument normalization."""

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
