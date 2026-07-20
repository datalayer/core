# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""Tests for CLI functionality."""

import os
from subprocess import PIPE, Popen
from typing import List

import pytest
from dotenv import load_dotenv

load_dotenv()


TEST_DATALAYER_API_KEY = os.environ.get("TEST_DATALAYER_API_KEY")


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
            ["login", "--api-key", TEST_DATALAYER_API_KEY],
            "API key saved for future use",
        ),
        (["secrets", "ls", "--api-key", TEST_DATALAYER_API_KEY], "Secrets"),
        # TODO Disabled for now, we need to create a stable test account
        #        (["snapshots", "list", "--api-key", TEST_DATALAYER_API_KEY], "Snapshots"),
        #        (["snapshots", "ls", "--api-key", TEST_DATALAYER_API_KEY], "Snapshots"),
        (["api-keys", "list", "--api-key", TEST_DATALAYER_API_KEY], "API Keys"),
        (["api-keys", "ls", "--api-key", TEST_DATALAYER_API_KEY], "API Keys"),
        (["whoami", "--api-key", TEST_DATALAYER_API_KEY], "User:"),
        (["logout"], "Stored API key cleared"),
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
