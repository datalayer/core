# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

# Copyright (c) 2023-2026 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.
"""The CLI starts without Jupyter's server.

`datalayer_core` and two CLI commands imported jupyter_server at their top, so
every `datalayer` command paid about 1 s for it (and for the jsonschema format
grammars under it) before its first request, as `sandboxes create` did on
21 November 2026. Only the browser login, `web start` and Jupyter's own
extension loading need it, and they import it when they run.
"""

from __future__ import annotations

import subprocess
import sys


def _loaded_after(statement: str) -> bool:
    """Whether jupyter_server is imported once `statement` has run, in a fresh interpreter."""
    probe = f"import sys\n{statement}\nprint('jupyter_server' in sys.modules)"
    answer = subprocess.run(
        [sys.executable, "-c", probe],
        capture_output=True,
        text=True,
        check=True,
        timeout=120,
    )
    return answer.stdout.strip().splitlines()[-1] == "True"


def test_the_package_and_the_cli_load_without_jupyter_server() -> None:
    assert _loaded_after("import datalayer_core") is False
    assert _loaded_after("import datalayer_core.cli.__main__") is False


def test_jupyter_still_finds_the_extension() -> None:
    import datalayer_core
    from datalayer_core.base.serverapplication import DatalayerExtensionApp

    points = datalayer_core._jupyter_server_extension_points()

    assert points == [{"module": "datalayer_core", "app": DatalayerExtensionApp}]
