# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""Tests for CLI functionality."""

import os
import time
from subprocess import PIPE, Popen
from typing import Any, List

import pytest
from dotenv import load_dotenv

from datalayer_core import DatalayerClient

load_dotenv()


TEST_DATALAYER_API_KEY = os.environ.get("TEST_DATALAYER_API_KEY")


def _delete_all_runtimes(secs: int = 5) -> None:
    """
    Delete all runtimes for testing purposes.

    Parameters
    ----------
    secs : int
        The number of seconds to wait before and after deleting runtimes.
    """
    time.sleep(secs)
    client = DatalayerClient()
    runtimes = client.list_runtimes()
    for runtime in runtimes:
        client.terminate_runtime(runtime)
    time.sleep(secs)


@pytest.mark.parametrize(
    "args,expected_output",
    [
        (["--version"], "1."),
        (["--help"], "The Datalayer CLI application"),
        (["about"], "About"),
    ],
)
def test_cli(args: List[str], expected_output: str) -> None:
    """
    Test the Datalayer CLI application.
    """
    p = Popen(["datalayer"] + args, stdout=PIPE, stderr=PIPE)
    stdout_bytes, stderr_bytes = p.communicate()
    stdout, stderr = stdout_bytes.decode(), stderr_bytes.decode()
    print(stdout)
    print(stderr)
    assert p.returncode == 0
    assert expected_output in stdout


@pytest.mark.parametrize(
    "args,expected_output",
    [
        (
            ["login", "--token", TEST_DATALAYER_API_KEY],
            "Connected as urn:dla:iam:ext::github:226720",
        ),
        (["envs", "list", "--token", TEST_DATALAYER_API_KEY], "Environments"),
        (["envs", "ls", "--token", TEST_DATALAYER_API_KEY], "Environments"),
        (["runtimes", "list", "--token", TEST_DATALAYER_API_KEY], "Runtimes"),
        (["runtimes", "ls", "--token", TEST_DATALAYER_API_KEY], "Runtimes"),
        (["secrets", "list", "--token", TEST_DATALAYER_API_KEY], "Secrets"),
        (["secrets", "ls", "--token", TEST_DATALAYER_API_KEY], "Secrets"),
        (["snapshots", "list", "--token", TEST_DATALAYER_API_KEY], "Snapshots"),
        (["snapshots", "ls", "--token", TEST_DATALAYER_API_KEY], "Snapshots"),
        (["tokens", "list", "--token", TEST_DATALAYER_API_KEY], "Tokens"),
        (["tokens", "ls", "--token", TEST_DATALAYER_API_KEY], "Tokens"),
        (["who", "--token", TEST_DATALAYER_API_KEY], "Profile"),
        (["whoami", "--token", TEST_DATALAYER_API_KEY], "Profile"),
        (["logout"], "\nDatalayer - Version"),
    ],
)
@pytest.mark.skipif(
    not bool(TEST_DATALAYER_API_KEY),
    reason="TEST_DATALAYER_API_KEY is not set, skipping secret tests.",
)
def test_cli_authenticated(args: List[str], expected_output: str) -> None:
    """
    Test the Datalayer CLI application.
    """
    p = Popen(["datalayer"] + args, stdout=PIPE, stderr=PIPE)
    stdout_bytes, stderr_bytes = p.communicate()
    stdout, stderr = stdout_bytes.decode(), stderr_bytes.decode()
    print(stdout)
    print(stderr)
    assert p.returncode == 0
    assert expected_output in stdout


@pytest.mark.skipif(
    not bool(TEST_DATALAYER_API_KEY),
    reason="TEST_DATALAYER_API_KEY is not set, skipping secret tests.",
)
def test_console() -> None:
    """
    Test the Datalayer CLI console.
    """
    # Delete all runtimes before starting the console
    _delete_all_runtimes()

    # Start the console
    p = Popen(["datalayer", "console"], stderr=PIPE, stdout=PIPE, stdin=PIPE)
    stdout_bytes, stderr_bytes = p.communicate(input=b"yes\n")
    stdout, stderr = stdout_bytes.decode(), stderr_bytes.decode()
    print(stdout)
    print(stderr)

    assert p.returncode == 0
    assert "No Runtime running." in stdout
    assert "Do you want to launch a runtime from the environment" in stdout
    _delete_all_runtimes()


@pytest.mark.skipif(
    not bool(TEST_DATALAYER_API_KEY),
    reason="TEST_DATALAYER_API_KEY is not set, skipping secret tests.",
)
def test_runtimes_exec(tmp_path: Any) -> None:
    """
    Test the Datalayer CLI runtimes exec.
    """
    # Delete all runtimes before starting the console
    _delete_all_runtimes()

    # Run exec on temp py script
    pypath = tmp_path / "test_exec.py"
    pypath.write_text(
        'from platform import node;print(f"Hello world! from {node()}.")',
        encoding="utf-8",
    )
    p = Popen(
        ["datalayer", "runtimes", "exec", str(pypath)],
        stderr=PIPE,
        stdout=PIPE,
        stdin=PIPE,
    )
    stdout_bytes, stderr_bytes = p.communicate(input=b"yes\n")
    stdout, stderr = stdout_bytes.decode(), stderr_bytes.decode()
    print(stdout)
    print(stderr)

    assert p.returncode == 0
    assert "No Runtime running." in stdout
    assert "Do you want to launch a runtime from the environment" in stdout
    assert "Hello world! from runtime-" in stdout
    _delete_all_runtimes()
