# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""About application for Datalayer Core."""

from pathlib import Path

from rich.console import Console
from rich.markdown import Markdown

from datalayer_core.application import NoStart
from datalayer_core.cli.base import DatalayerCLIBaseApp

HERE = Path(__file__).parent


class DatalayerAboutApp(DatalayerCLIBaseApp):
    """Kernel About application."""

    description = """
      An application to print useful information
      about jupyter kernels.
    """

    _requires_auth = False

    def start(self) -> None:
        """Start the about application and display information."""
        try:
            super().start()
            console = Console()
            with open(HERE / "about.md") as readme:
                markdown = Markdown(readme.read())
            console.print(markdown)
        except NoStart:
            pass
        self.exit(0)
