from typing import Any, Dict, List

from ._version import __version__
from .serverapplication import DatalayerExtensionApp
from .lab import DatalayerLabApp


def _jupyter_server_extension_points() -> List[Dict[str, Any]]:
    return [{
        "module": "datalayer",
        "app": DatalayerExtensionApp,
    },
    {
        "module": "datalayer",
        "app": DatalayerLabApp,
    }]


def _jupyter_labextension_paths() -> List[Dict[str, str]]:
    return [{
        "src": "labextension",
        "dest": "@datalayer/core"
    }]
