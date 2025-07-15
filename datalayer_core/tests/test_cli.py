# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

from subprocess import run
import os

import pytest
from dotenv import load_dotenv


load_dotenv()


DATALAYER_TEST_TOKEN = os.environ['DATALAYER_TEST_TOKEN']


@pytest.mark.parametrize("args,expected_output", [
    (["--version"], "1.0"),
    (["--help"], "The Datalayer CLI application"),
    (["about"], "About"),
    (["login", '--token', DATALAYER_TEST_TOKEN], "Connected as urn:dla:iam:ext::github:226720"),
    (["envs", 'list', '--token', DATALAYER_TEST_TOKEN], "Environments"),
    (["envs", 'ls', '--token', DATALAYER_TEST_TOKEN], "Environments"),
    (["runtimes", 'list', '--token', DATALAYER_TEST_TOKEN], "Runtimes"),
    (["runtimes", 'ls', '--token', DATALAYER_TEST_TOKEN], "Runtimes"),
    (["who", '--token', DATALAYER_TEST_TOKEN], "Profile"),
    (["whoami", '--token', DATALAYER_TEST_TOKEN], "Profile"),
    (["logout"], "\nDatalayer - Version"),
])
def test_cli(args, expected_output):
    """
    Test the Datalayer CLI application.
    """
    result = run(['datalayer'] + args, capture_output=True, text=True)
    assert result.returncode == 0
    assert expected_output in result.stdout
