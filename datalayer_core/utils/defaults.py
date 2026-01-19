# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""Default values and constants for Datalayer Core."""

from typing import Any

from datalayer_core.utils.types import Minutes

DEFAULT_ENVIRONMENT = "python-cpu-env"

DEFAULT_TIME_RESERVATION: Minutes = 10.0


def get_default_credits_limit(
    reservations: list[dict[str, Any]], credits: Any
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
    if isinstance(credits, dict):
        if "available" in credits:
            available = credits["available"]
        elif "credits_available" in credits:
            available = credits["credits_available"]
        elif "remaining" in credits:
            available = credits["remaining"]
        elif credits.get("quota") is None and "credits" in credits:
            available = credits["credits"]
        elif "quota" in credits and "credits" in credits:
            available = credits["quota"] - credits["credits"]
        else:
            available = 0.0
    else:
        available = float(credits)
    available -= sum(r["credits"] for r in reservations)
    return max(0.0, available * 0.5)
