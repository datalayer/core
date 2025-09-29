# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

from datetime import datetime, timezone


def timestamp_to_local_date(timestamp: str) -> str:
    """
    Convert a timestamp to local date format.

    Parameters
    ----------
    timestamp : str
        Timestamp string to convert.

    Returns
    -------
    str
        Local date in ISO format.
    """
    return (
        datetime.fromtimestamp(float(timestamp), timezone.utc).astimezone().isoformat()
    )
