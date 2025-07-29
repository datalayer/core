# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""SDK variable management utilities."""

from typing import Any


def __getattr__(name: str) -> Any:
    """
    Get a variable from the global scope.

    Parameters
    ----------
    name : str
        The name of the variable to retrieve.

    Returns
    -------
    Any
        The value of the variable.

    Raises
    ------
    KeyError
        If the variable is not found in the global scope.
    """
    global_dict = globals()
    if name in global_dict:
        return global_dict[name]
    raise KeyError(f"Variable '{name}' not found in `Runtime`.")
