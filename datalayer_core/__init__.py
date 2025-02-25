from typing import Any, Dict, List

from datalayer_core.__version__ import __version__
from datalayer_core.serverapplication import DatalayerExtensionApp


def _jupyter_server_extension_points() -> List[Dict[str, Any]]:
    return [{
        "module": "datalayer_core",
        "app": DatalayerExtensionApp,
    }]
