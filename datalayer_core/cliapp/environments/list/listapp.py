# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""Environment listing functionality."""

from datalayer_core.cliapp.base import DatalayerCLIBaseApp
from datalayer_core.mixins.environment import EnvironmentsListMixin
from datalayer_core.display.display import display_environments


class EnvironmentsListApp(DatalayerCLIBaseApp, EnvironmentsListMixin):
    """A Datalayer environments listing application."""

    description = """
      The Datalayer application for Environment.

      List available Environments."""

    def start(self) -> None:
        """Start the environments listing application."""
        if len(self.extra_args) > 0:  # pragma: no cover
            self.log.warn("Too many arguments were provided for kernel create.")
            self.print_help()
            self.exit(1)

        response = self._list_environments()
        if response["success"]:
            environments = response["environments"]
            display_environments(environments)
            if len(environments) > 0:
                print("""
    Create a Runtime with e.g.
        """)
            for environment in environments:
                print(
                    f"datalayer runtimes create --given-name my-runtime --credits-limit 3 {environment['name']}"
                )
            print()
        else:
            self.log.warning("The secret could not be deleted!")
            self.exit(1)
