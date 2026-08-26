# Copyright (c) 2023-2026 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""What the Contents documentation shows must be what the client offers.

The catalog and Sharing pages are the first thing anybody reads, and every
command and call in them is a promise. A promise that stopped being true — a
renamed command, a method that never landed — is worse than no example: it is
read as fact and typed into a terminal.

So the examples are a contract, checked here rather than proof-read. A block a
page marks `title="planned"` is exempt, because a page may honestly show the
shape of something that is coming; everything else must exist today, and a
planned block that *has* landed fails too, so the marker cannot rot.

The pages live in the web repository. Where that tree is not checked out, this
skips: a test that cannot see its subject must not condemn it.
"""

from __future__ import annotations

import re
from pathlib import Path

import pytest

from datalayer_core.cli.commands.contents import app as contents_app
from datalayer_core.contents import Contents, HomeFolder

#: `src/tech/datalayer/core/datalayer_core/tests` → `src` → the web repository.
DOCS = (
    Path(__file__).resolve().parents[5] / "landings/datalayer/ui/src/views/docs/pages"
)
PAGES = ("ContentsDoc.tsx", "SharingDoc.tsx")

_FENCE = re.compile(r"^(```|~~~)(.*)$")
_CLI = re.compile(r"\bdatalayer contents ([a-z][a-z0-9-]*)(?: ([a-z][a-z0-9-]*))?")
_FACADE = re.compile(r"\bdatalayer\.contents\.([a-z_]+)")
_FOLDER = re.compile(r"\bfolder\.([a-z_]+)\(")


def markdown_of(page: Path) -> str:
    """The documentation itself, out of the module that carries it."""
    text = page.read_text()
    body = text.split("const markdown = `", 1)[1].rsplit("`;", 1)[0]
    # The page escapes backticks so the template literal survives; the reader
    # sees them unescaped, and so does this.
    return body.replace("\\`", "`").replace("\\$", "$")


def blocks(markdown: str) -> list[tuple[str, str]]:
    """Every fenced block as `(info string, body)`."""
    found: list[tuple[str, str]] = []
    info: str | None = None
    marker: str | None = None
    body: list[str] = []
    for line in markdown.splitlines():
        fence = _FENCE.match(line)
        if fence and marker is None:
            marker, info = fence.group(1), fence.group(2).strip()
            body = []
            continue
        if fence and fence.group(1) == marker:
            found.append((info or "", "\n".join(body)))
            marker, info = None, None
            continue
        if marker is not None:
            body.append(line)
    return found


def shipped_and_planned(page: Path) -> tuple[str, str]:
    """The examples a page presents as working, and the ones it does not."""
    shipped: list[str] = []
    planned: list[str] = []
    for info, body in blocks(markdown_of(page)):
        (planned if "planned" in info else shipped).append(body)
    return "\n".join(shipped), "\n".join(planned)


def cli_names() -> set[str]:
    """Every `datalayer contents` command and group, as typed."""
    names = {
        command.name or command.callback.__name__.replace("_", "-")
        for command in contents_app.registered_commands
    }
    for group in contents_app.registered_groups:
        typer_instance = group.typer_instance
        name = group.name or typer_instance.info.name
        names.add(str(name))
        for command in typer_instance.registered_commands:
            names.add(f"{name} {command.name or command.callback.__name__}")
    return names


def pages() -> list[Path]:
    return [DOCS / name for name in PAGES if (DOCS / name).exists()]


@pytest.mark.skipif(not DOCS.exists(), reason="the web repository is not checked out")
def test_the_pages_are_where_they_are_expected() -> None:
    assert pages(), f"no Contents documentation page found under {DOCS}"


@pytest.mark.skipif(not DOCS.exists(), reason="the web repository is not checked out")
def test_every_documented_command_exists() -> None:
    available = cli_names()
    missing: dict[str, set[str]] = {}
    for page in pages():
        shipped, _planned = shipped_and_planned(page)
        used = set()
        for command, subcommand in _CLI.findall(shipped):
            if command.startswith("--"):
                continue
            used.add(f"{command} {subcommand}".strip() if subcommand else command)
        # A group named on its own (`datalayer contents sharing`) is a command
        # too: it prints its own help.
        unknown = {
            name
            for name in used
            if name not in available and name.split(" ")[0] not in available
        }
        unknown.discard("--help")
        if unknown:
            missing[page.name] = unknown
    assert not missing, f"documented commands that do not exist: {missing}"


@pytest.mark.skipif(not DOCS.exists(), reason="the web repository is not checked out")
def test_every_documented_client_call_exists() -> None:
    missing: dict[str, set[str]] = {}
    for page in pages():
        shipped, _planned = shipped_and_planned(page)
        unknown = {
            name for name in _FACADE.findall(shipped) if not hasattr(Contents, name)
        }
        unknown |= {
            name for name in _FOLDER.findall(shipped) if not hasattr(HomeFolder, name)
        }
        if unknown:
            missing[page.name] = unknown
    assert not missing, f"documented calls that do not exist: {missing}"


@pytest.mark.skipif(not DOCS.exists(), reason="the web repository is not checked out")
def test_a_planned_example_that_has_landed_is_no_longer_planned() -> None:
    """The marker is a promise too, and it expires.

    A block kept as `planned` after the thing shipped tells a reader it is not
    available when it is, which is the same failure the other way round.
    """
    arrived: dict[str, set[str]] = {}
    for page in pages():
        _shipped, planned = shipped_and_planned(page)
        landed = {name for name in _FACADE.findall(planned) if hasattr(Contents, name)}
        if landed:
            arrived[page.name] = landed
    assert not arrived, f"planned examples that now work: {arrived}"
