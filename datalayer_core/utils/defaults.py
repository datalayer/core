# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

from typing import Any

from datalayer_core.utils.types import Minutes

DEFAULT_ENVIRONMENT = "python-cpu-env"

DEFAULT_DATALAYER_RUN_URL = "https://prod1.datalayer.run"

DEFAULT_DATALAYER_IAM_URL = "https://prod1.datalayer.run"

DEFAULT_TIME_RESERVATION: Minutes = 10.0


def get_default_credits_limit(
    reservations: list[dict[str, Any]], credits: dict[str, Any]
) -> float:
    """
    Get the default credits limit based on the available credits and reservations.

    Parameters
    ----------
    reservations : list[dict[str, Any]]
        List of current reservations.
    credits : dict[str, Any]
        Current credits information.

    Returns
    -------
    float
        The calculated default credits limit.
    """
    available = (
        credits["credits"]
        if credits.get("quota") is None
        else credits["quota"] - credits["credits"]
    )
    available -= sum(r["credits"] for r in reservations)
    return max(0.0, available * 0.5)
