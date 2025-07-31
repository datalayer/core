# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""Tests for Datalayer server extension functionality."""

from subprocess import PIPE, Popen

from datalayer_core import __version__


def test_server_extension() -> None:
    """
    Test the Datalayer server extension.
    """
    p = Popen(
        ["jupyter", "server", "extension enable", "--py", "datalayer_core"],
        stdout=PIPE,
        stderr=PIPE,
    )
    stdout, stderr = p.communicate()
    p = Popen(["jupyter", "server", "extension", "list"], stdout=PIPE, stderr=PIPE)
    stdout, stderr = p.communicate()
    out, err = stdout.decode(), stderr.decode()
    print(out)
    print(err)
    assert p.returncode == 0
    assert "datalayer_core \x1b[32menabled\x1b[0m\n" in out
    assert f"datalayer_core {__version__} \x1b[32mOK\x1b[0m\n" in out
