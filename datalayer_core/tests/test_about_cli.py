# Copyright (c) 2023-2026 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""`datalayer about`: the wordmark, what Datalayer is, and where to find it."""

import base64
import io
import json
from typing import Any

import pytest
from rich.console import Console

from datalayer_core.__version import __version__
from datalayer_core.cli.commands import about


def _page(width: int, *, colour: bool = False, monkeypatch: pytest.MonkeyPatch) -> str:
    monkeypatch.setattr(about, "_account", lambda: "Not signed in — `d login`")
    out = io.StringIO()
    console = Console(
        file=out,
        width=width,
        force_terminal=colour,
        color_system="truecolor" if colour else None,
        no_color=not colour,
    )
    about.render(console)
    return out.getvalue()


def _token(claims: dict[str, Any]) -> str:
    body = base64.urlsafe_b64encode(json.dumps(claims).encode()).decode().rstrip("=")
    return f"header.{body}.signature"


def test_the_wordmark_is_whole_at_100_columns(monkeypatch: pytest.MonkeyPatch) -> None:
    page = _page(100, monkeypatch=monkeypatch)

    lines = page.splitlines()
    for line in about.WORDMARK.splitlines():
        assert line in lines
    assert __version__ in page
    assert "https://datalayer.ai/docs" in page
    assert "https://datalayer.ai\n" in page
    assert "https://github.com/datalayer" in page
    assert "Not signed in — `d login`" in page
    assert "☷" not in page


def test_the_page_is_composed(monkeypatch: pytest.MonkeyPatch) -> None:
    lines = _page(100, monkeypatch=monkeypatch).split("\n")

    # One blank line above and below, none doubled, no trailing whitespace,
    # nothing wider than 80 columns.
    assert lines[0] == "" and lines[1] != ""
    assert lines[-1] == "" and lines[-2] == "" and lines[-3] != ""
    assert all(line == line.rstrip() for line in lines)
    assert max(len(line) for line in lines) <= 80
    # The facts are one aligned list: every value starts in the same column.
    names = ("Version", "Docs", "Site", "Source", "Account")
    facts = [line for line in lines if line.split()[:1] and line.split()[0] in names]
    assert [line.split()[0] for line in facts] == list(names)
    assert len({line.index(line.split()[1]) for line in facts}) == 1


def test_a_narrow_terminal_gets_the_mark(monkeypatch: pytest.MonkeyPatch) -> None:
    page = _page(50, monkeypatch=monkeypatch)

    assert "☰ DATALAYER" in page
    assert "/___/" not in page
    assert max(len(line) for line in page.splitlines()) <= 50
    assert __version__ in page and "https://datalayer.ai/docs" in page


def test_no_colour_means_no_escape(monkeypatch: pytest.MonkeyPatch) -> None:
    assert "\x1b[" not in _page(100, monkeypatch=monkeypatch)


def test_the_stripes_are_the_brands_greens(monkeypatch: pytest.MonkeyPatch) -> None:
    page = _page(100, colour=True, monkeypatch=monkeypatch)

    # #2ECC71, #1ABC9C and #16A085, one per stripe, top to bottom.
    stripes = ["38;2;46;204;113", "38;2;26;188;156", "38;2;22;160;133"]
    positions = [page.index(stripe) for stripe in stripes]
    assert positions == sorted(positions)


def test_the_account_is_read_from_the_token_without_a_call(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("DATALAYER_IAM_URL", "https://iam.example.test")
    monkeypatch.setenv(
        "DATALAYER_API_KEY", _token({"sub": "01U", "user": {"handle": "ada"}})
    )
    assert about._account() == "Signed in as ada on iam.example.test"

    # A token that names nobody says only where it signs in.
    monkeypatch.setenv("DATALAYER_API_KEY", "opaque-key")
    assert about._account() == "Signed in on iam.example.test"


def test_nobody_signed_in_says_how_to(monkeypatch: pytest.MonkeyPatch) -> None:
    from datalayer_core.authn.authn import AuthenticationManager

    monkeypatch.delenv("DATALAYER_API_KEY", raising=False)
    monkeypatch.setattr(AuthenticationManager, "get_stored_token", lambda self: None)

    assert about._account() == "Not signed in — `d login`"
