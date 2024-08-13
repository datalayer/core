from typing import Any, Dict, List

from datalayer_core._version import __version__
from datalayer_core.serverapplication import DatalayerExtensionApp

try:
    from .lab import DatalayerLabApp
except ModuleNotFoundError as e:
#    print("No jupyterlab available here...")
    pass


def _jupyter_server_extension_points() -> List[Dict[str, Any]]:
    return [{
        "module": "datalayer_core",
        "app": DatalayerExtensionApp,
    },
    {
        "module": "datalayer_core",
        "app": DatalayerLabApp,
    }]


def _jupyter_labextension_paths() -> List[Dict[str, str]]:
    return [{
        "src": "labextension",
        "dest": "@datalayer/core"
    }]
