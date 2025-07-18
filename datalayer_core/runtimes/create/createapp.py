# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

import sys

from rich import print_json
from traitlets import Dict, Float, Unicode

from datalayer_core.cli.base import DatalayerCLIBaseApp, datalayer_aliases
from datalayer_core.runtimes.utils import display_kernels, get_default_credits_limit

create_alias = dict(datalayer_aliases)
create_alias["given-name"] = "RuntimesCreateApp.kernel_given_name"
create_alias["credits-limit"] = "RuntimesCreateApp.credits_limit"


class RuntimesCreateMixin:
    def _create_runtime(self, environment_name: str) -> dict[str, str]:
        """Create a Runtime with the given environment name."""
        body = {"type": "notebook"}
        if self.kernel_given_name:
            body["given_name"] = self.kernel_given_name

        if self.credits_limit is None:
            response = self._fetch(
                "{}/api/iam/v1/usage/credits".format(self.run_url), method="GET"
            )

            raw_credits = response.json()
            self.credits_limit = get_default_credits_limit(
                raw_credits["reservations"], raw_credits["credits"]
            )
            self.log.warning(
                "The Runtime will be allowed to consumed half of your remaining credits: {:.2f} credit.".format(
                    self.credits_limit
                )
            )

        if self.credits_limit < sys.float_info.epsilon:
            self.log.warning("Credits reservation is not positive. Exiting…")
            return {}

        body["credits_limit"] = self.credits_limit
        body["environment_name"] = environment_name

        response = self._fetch(
            "{}/api/runtimes/v1/runtimes".format(self.run_url),
            method="POST",
            json=body,
        )
        return response.json()


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

    def start(self):
        """Start the app."""
        if len(self.extra_args) > 1:  # pragma: no cover
            self.log.warning("Too many arguments were provided for Runtime create.")
            self.print_help()
            self.exit(1)

        environment_name = self.extra_args[0]
        raw = self._create_runtime(environment_name)
        if raw is None:
            self.exit(1)

        kernel = raw.get("kernel")
        if kernel:
            display_kernels([kernel])
        else:
            print_json(data=raw)
