# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""Datalayer Core - Python Client and CLI for the Datalayer AI Platform."""

from typing import Any, Dict, List

from datalayer_core.__version__ import __version__
from datalayer_core.base import paths
from datalayer_core.base.serverapplication import DatalayerExtensionApp
from datalayer_core.client import DatalayerClient


def _jupyter_server_extension_points() -> List[Dict[str, Any]]:
    """
    Get Jupyter server extension points for Datalayer.

    Returns
    -------
    List[Dict[str, Any]]
        List of extension point configurations for Jupyter server.
    """
    return [
        {
            "module": "datalayer_core",
            "app": DatalayerExtensionApp,
        }
    ]


__all__ = [
    "__version__",
    "paths",
    "DatalayerClient",
]
