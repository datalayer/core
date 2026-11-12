# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""About command for Datalayer CLI."""

import os
import textwrap
from pathlib import Path
from typing import Optional
from urllib.parse import urlparse

import typer
from rich.console import Console
from rich.text import Text

from datalayer_core.__version import __version__

# Create a Typer app for the about command
app = typer.Typer()

#: The wordmark, with the mark's three stripes at its left. A raw string: the
#: letters are drawn with backslashes.
WORDMARK = r"""
            ___       __       __
  ───────  / _ \___ _/ /____ _/ /__ ___ _____ ____
 ───────  / // / _ `/ __/ _ `/ / _ `/ // / -_) __/
───────  /____/\_,_/\__/\_,_/_/\_,_/\_, /\__/_/
                                   /___/
""".strip("\n")

#: The mark alone, for a terminal too narrow for the wordmark.
MARK = "☰ DATALAYER"

#: The three greens of the brand, lightest first: one per stripe, top to
#: bottom (`--dla-color-green-light`, `-main` and `-dark` of style/base.css).
STRIPES = ("#2ECC71", "#1ABC9C", "#16A085")

#: Under this many columns the wordmark would wrap: the mark is shown instead.
NARROW = 60

#: Nothing of the page is wider than this.
WIDTH = 80

DOCS_URL = "https://datalayer.ai/docs"
SITE_URL = "https://datalayer.ai"
SOURCE_URL = "https://github.com/datalayer"

ABOUT_FILE = Path(__file__).parent / ".." / ".." / "assets" / "about.md"


def _tagline() -> str:
    """
    What Datalayer is, in one sentence: the paragraph of assets/about.md.
    """
    for line in ABOUT_FILE.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and not line.startswith("Read more"):
            return line
    raise ValueError(f"{ABOUT_FILE} holds no sentence")


def _wordmark() -> Text:
    """
    The wordmark: its three stripes in the brand's greens, its letters bold.
    """
    art = Text()
    stripes = iter(STRIPES)
    for number, line in enumerate(WORDMARK.splitlines()):
        if number:
            art.append("\n")
        start = line.find("─")
        if start < 0:
            art.append(line, style="bold")
            continue
        end = len(line) - len(line[start:].lstrip("─"))
        art.append(line[:start])
        art.append(line[start:end], style=next(stripes))
        art.append(line[end:], style="bold")
    return art


def _mark() -> Text:
    """
    The one-line mark, for a narrow terminal.
    """
    mark = Text()
    mark.append(MARK[0], style=STRIPES[1])
    mark.append(MARK[1:], style="bold")
    return mark


def _handle(token: str) -> Optional[str]:
    """
    The handle a token says it is for, read from the token itself.
    """
    from datalayer_core.cli.commands.authn import _decode_jwt_claims

    claims = _decode_jwt_claims(token) or {}
    user = claims.get("user")
    handle = user.get("handle") if isinstance(user, dict) else None
    return str(handle) if handle else None


def _account() -> str:
    """
    Who is signed in, and where, from what this machine holds.

    No call is made: the token is the one in DATALAYER_API_KEY or the one
    `login` stored, and the handle is the one the token carries. A token
    that names nobody says only where it signs in.
    """
    from datalayer_core.authn.authn import AuthenticationManager
    from datalayer_core.utils.urls import DatalayerURLs

    urls = DatalayerURLs.from_environment()
    token = os.environ.get("DATALAYER_API_KEY")
    if not token:
        try:
            token = AuthenticationManager(urls.iam_url).get_stored_token()
        except Exception:
            token = None
    if not token:
        return "Not signed in — `d login`"
    server = urlparse(urls.iam_url).netloc or urls.iam_url
    handle = _handle(token)
    return f"Signed in as {handle} on {server}" if handle else f"Signed in on {server}"


def render(console: Console) -> None:
    """
    Print the page: the wordmark, what Datalayer is, and where to find it.

    Parameters
    ----------
    console : Console
        Where the page goes. Its width chooses the wordmark or the mark, and
        it drops the colours itself when NO_COLOR is set or it is no terminal.
    """
    width = min(console.width, WIDTH)
    facts = (
        ("Version", __version__),
        ("Docs", DOCS_URL),
        ("Site", SITE_URL),
        ("Source", SOURCE_URL),
        ("Account", _account()),
    )
    label = max(len(name) for name, _ in facts)
    page = Text()
    page.append("\n")
    page.append_text(_wordmark() if console.width >= NARROW else _mark())
    page.append("\n\n")
    page.append("\n".join(textwrap.wrap(_tagline(), width=width)))
    page.append("\n\n")
    for name, value in facts:
        page.append(f"  {name:<{label}}  ", style="dim")
        page.append(f"{value}\n")
    console.print(page, highlight=False, soft_wrap=True)


@app.command()
def about() -> None:
    """Show what Datalayer is and which version is installed."""
    render(Console())
