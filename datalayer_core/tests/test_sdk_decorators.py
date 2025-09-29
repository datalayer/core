# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""Tests for SDK decorators functionality."""

import os
import time

import pytest
from dotenv import load_dotenv

from datalayer_core.decorators.decorators import datalayer

load_dotenv()


DATALAYER_TEST_TOKEN = os.environ.get("DATALAYER_TEST_TOKEN")


def sum_test(x: float, y: float, z: float = 1) -> float:
    """
    Sum three numbers.

    Parameters
    ----------
    x : float
        The first number.
    y : float
        The second number.
    z : float, optional
        The third number (default is 1).

    Returns
    -------
    float
        The sum of the three numbers.
    """
    return x + y + z


@pytest.mark.parametrize(
    "args,expected_output,decorator",
    [
        ([1, 4.5, 2], 7.5, datalayer),
        ([1, 4.5, 2], 7.5, datalayer(runtime_name="runtime-test")),
        ([1, 4.5, 2], 7.5, datalayer(output="result")),
        ([1, 4.5, 2], 7.5, datalayer(inputs=["a", "b", "c"])),
    ],
)
@pytest.mark.skipif(
    not bool(DATALAYER_TEST_TOKEN),
    reason="DATALAYER_TEST_TOKEN is not set, skipping secret tests.",
)
def test_decorator(args, expected_output, decorator):  # type: ignore
    """
    Test the Datalayer decorator.
    """
    time.sleep(10)
    func = decorator(sum_test)
    assert func(*args) == expected_output
    time.sleep(10)
