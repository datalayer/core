# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

from typing import Any


def __getattr__(name: str) -> Any:
    """Get a variable from the global scope."""
    global_dict = globals()
    if name in global_dict:
        return global_dict[name]
    raise KeyError(f"Variable '{name}' not found in `Runtime`.")
