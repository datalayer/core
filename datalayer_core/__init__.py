# Copyright (c) 2023-2024 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

from typing import Any, Dict, List

from datalayer_core.__version__ import __version__
from datalayer_core.serverapplication import DatalayerExtensionApp


def _jupyter_server_extension_points() -> List[Dict[str, Any]]:
    return [{
        "module": "datalayer_core",
        "app": DatalayerExtensionApp,
    }]
