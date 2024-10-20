# Copyright (c) Datalayer Development Team.
# Distributed under the terms of the Modified BSD License.

import sys

from rich import print_json
from traitlets import Dict, Float, Unicode

from datalayer_core.cli.base import DatalayerCLIBaseApp, datalayer_aliases
from datalayer_core.kernels.utils import display_kernels


create_alias = dict(datalayer_aliases)
create_alias["given-name"] = "KernelsCreateApp.kernel_given_name"
create_alias["credits-limit"] = "KernelsCreateApp.credits_limit"


class KernelsCreateApp(DatalayerCLIBaseApp):
    """An application to create a kernel."""

    description = """
      An application to create the kernel.

      jupyter kernels create ENV_ID [--given-name CUSTOM_NAME]
    """

    aliases = Dict(create_alias)

    kernel_given_name = Unicode(
        "Remote Kernel",
        allow_none=True,
        config=True,
        help="Kernel custom name.",
    )

    credits_limit = Float(
        None,
        allow_none=True,
        config=True,
        help="Maximal amount of credits that can be consumed by the kernels",
    )

    def start(self):
        """Start the app."""
        if len(self.extra_args) > 1:  # pragma: no cover
            self.log.warning("Too many arguments were provided for kernel create.")
            self.print_help()
            self.exit(1)
        environment_name = self.extra_args[0]
        body = {"kernel_type": "notebook"}
        if self.kernel_given_name:
            body["kernel_given_name"] = self.kernel_given_name

        if self.credits_limit is None:
            response = self._fetch(
                "{}/api/iam/v1/usage/credits".format(self.run_url), method="GET"
            )
            raw = response.json()
            credits = raw["credits"]
            reservations = raw["reservations"]
            available = (
                credits["credits"]
                if credits.get("quota") is None
                else credits["quota"] - credits["credits"]
            )
            available -= sum(map(lambda r: r["credits"], reservations))
            self.credits_limit = max(0., available * 0.5)
            self.log.warning(
                "The kernel will be allowed to consumed half of your remaining credits: {:.2f} credit.".format(
                    self.credits_limit
                )
            )

        if self.credits_limit < sys.float_info.epsilon:
            self.log.warning("Credits reservation is not positive. Exiting…")
            self.exit(1)
        body["credits_limit"] = self.credits_limit

        response = self._fetch(
            "{}/api/jupyter/v1/environment/{}".format(
                self.run_url, environment_name
            ),
            method="POST",
            json=body,
        )
        raw = response.json()
        kernel = raw.get("kernel")
        if kernel:
            display_kernels([kernel])
        else:
            print_json(data=raw)
