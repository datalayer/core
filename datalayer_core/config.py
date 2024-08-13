# PYTHON_ARGCOMPLETE_OK

import os
import tomllib
from pathlib import Path

from .application import DatalayerApp


class DatalayerConfig(DatalayerApp):
    """A Datalayer Config App."""

    name = "datalayer-config"

    description = """
    Show the configuration
    """

    def start(self):
        """Start the application."""
        with open(Path.home() / ".datalayer/datalayer_core.conf", "rb") as toml:
            config = tomllib.load(toml)
        self.log.info(config)
        self.log.info(config["title"])


main = DatalayerConfig.launch_instance


if __name__ == "__main__":
    main()
