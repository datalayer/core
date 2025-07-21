# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

import os
from subprocess import run

import pytest
from dotenv import load_dotenv

load_dotenv()


DATALAYER_TEST_TOKEN = os.environ.get("DATALAYER_TEST_TOKEN")


@pytest.mark.parametrize(
    "args,expected_output",
    [
        (["--version"], "1."),
        (["--help"], "The Datalayer CLI application"),
        (["about"], "About"),
        (["logout"], "\nDatalayer - Version"),
    ],
)
def test_cli(args, expected_output):
    """
    Test the Datalayer CLI application.
    """
    result = run(["datalayer"] + args, capture_output=True, text=True)
    print(result.stdout)
    print(result.stderr)
    assert result.returncode == 0
    assert expected_output in result.stdout


@pytest.mark.parametrize(
    "args,expected_output",
    [
        (
            ["login", "--token", DATALAYER_TEST_TOKEN],
            "Connected as urn:dla:iam:ext::github:226720",
        ),
        (["envs", "list", "--token", DATALAYER_TEST_TOKEN], "Environments"),
        (["envs", "ls", "--token", DATALAYER_TEST_TOKEN], "Environments"),
        (["runtimes", "list", "--token", DATALAYER_TEST_TOKEN], "Runtimes"),
        (["runtimes", "ls", "--token", DATALAYER_TEST_TOKEN], "Runtimes"),
        (["secrets", "list", "--token", DATALAYER_TEST_TOKEN], "Secrets"),
        (["secrets", "ls", "--token", DATALAYER_TEST_TOKEN], "Secrets"),
        (["snapshots", "list", "--token", DATALAYER_TEST_TOKEN], "Snapshots"),
        (["snapshots", "ls", "--token", DATALAYER_TEST_TOKEN], "Snapshots"),
        (["who", "--token", DATALAYER_TEST_TOKEN], "Profile"),
        (["whoami", "--token", DATALAYER_TEST_TOKEN], "Profile"),
        (["logout"], "\nDatalayer - Version"),
    ],
)
@pytest.mark.skipif(
    not bool(DATALAYER_TEST_TOKEN),
    reason="DATALAYER_TEST_TOKEN is not set, skipping secret tests.",
)
def test_cli_authenticated(args, expected_output):
    """
    Test the Datalayer CLI application.
    """
    result = run(["datalayer"] + args, capture_output=True, text=True)
    print(result.stdout)
    print(result.stderr)
    assert result.returncode == 0
    assert expected_output in result.stdout
