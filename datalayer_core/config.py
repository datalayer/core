# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""Configuration management for Datalayer Core."""

# PYTHON_ARGCOMPLETE_OK

from pathlib import Path

import tomllib

from datalayer_core.application import DatalayerApp


class DatalayerConfig(DatalayerApp):
    """
    A Datalayer Config App.

    Run `datalayer --generate-config` to create the default config.
    """

    name = "datalayer-config"

    description = """
    Show the configuration
    """

    def start(self) -> None:
        """Start the application."""
        with open(Path.home() / ".datalayer/datalayer_core.conf", "rb") as toml:
            config = tomllib.load(toml)
        self.log.info(config)
        self.log.info(config["title"])


main = DatalayerConfig.launch_instance


if __name__ == "__main__":
    main()
