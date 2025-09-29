# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""Runtime creation application."""

from traitlets import Dict, Float, Unicode

from datalayer_core.cliapp.base import DatalayerCLIBaseApp, datalayer_aliases
from datalayer_core.mixins.runtimes import RuntimesCreateMixin
from datalayer_core.utils.display import display_runtimes

create_alias = dict(datalayer_aliases)
create_alias["given-name"] = "RuntimesCreateApp.kernel_given_name"
create_alias["credits-limit"] = "RuntimesCreateApp.credits_limit"


class RuntimesCreateApp(DatalayerCLIBaseApp, RuntimesCreateMixin):
    """An application to create a Runtime."""

    description = """
      An application to create a Runtime.

      jupyter runtimes create ENV_ID [--given-name CUSTOM_NAME]
    """

    aliases = Dict(create_alias)

    kernel_given_name = Unicode(
        "Remote Runtime",
        allow_none=True,
        config=True,
        help="Runtime custom name.",
    )

    credits_limit = Float(
        None,
        allow_none=True,
        config=True,
        help="Maximal amount of credits that can be consumed by the Runtime.",
    )

    def start(self) -> None:
        """Start the app."""
        if len(self.extra_args) > 1:  # pragma: no cover
            self.log.warning("Too many arguments were provided for Runtime create.")
            self.print_help()
            self.exit(1)

        environment_name = self.extra_args[0]
        response = self._create_runtime(
            environment_name,
            given_name=self.kernel_given_name,
            credits_limit=self.credits_limit,
        )

        if response["success"]:
            runtime = response["runtime"]
            display_runtimes([runtime])
        else:
            self.log.warning("Runtime could not be created!")
            self.exit(1)
