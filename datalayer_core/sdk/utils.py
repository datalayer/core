# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""
Utility functions and constants for the Datalayer SDK.
"""

from typing_extensions import TypeAlias

Seconds: TypeAlias = float
Minutes: TypeAlias = float
CreditsPerSecond: TypeAlias = float
DEFAULT_ENVIRONMENT = "python-cpu-env"
DEFAULT_RUN_URL = "https://prod1.datalayer.run"
DEFAULT_TIME_RESERVATION: Minutes = 10.0
