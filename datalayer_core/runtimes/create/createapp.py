# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

import sys
from typing import Any, Optional

from traitlets import Dict, Float, Unicode

from datalayer_core.cli.base import DatalayerCLIBaseApp, datalayer_aliases
from datalayer_core.runtimes.utils import display_runtimes, get_default_credits_limit

create_alias = dict(datalayer_aliases)
create_alias["given-name"] = "RuntimesCreateApp.kernel_given_name"
create_alias["credits-limit"] = "RuntimesCreateApp.credits_limit"


class RuntimesCreateMixin:
    """Mixin for creating a Datalayer Runtime."""

    def _create_runtime(
        self,
        environment_name: str,
        given_name: Optional[str] = None,
        credits_limit: Optional[float] = None,
    ) -> dict[str, Any]:
        """Create a Runtime with the given environment name."""
        body = {
            "type": "notebook",
            "environment_name": environment_name,
        }

        if given_name:
            body["given_name"] = given_name

        try:
            if credits_limit is None:
                response = self._fetch(  # type: ignore
                    "{}/api/iam/v1/usage/credits".format(self.run_url),  # type: ignore
                    method="GET",
                )

                raw_credits = response.json()
                credits_limit = get_default_credits_limit(
                    raw_credits["reservations"], raw_credits["credits"]
                )
                # self.log.warning(
                #     "The Runtime will be allowed to consumed half of your remaining credits: {:.2f} credit.".format(
                #         self.credits_limit
                #     )
                # )

            if credits_limit < sys.float_info.epsilon:
                # self.log.warning("Credits reservation is not positive. Exiting…")
                return {}

            body["credits_limit"] = credits_limit  # type: ignore
            response = self._fetch(  # type: ignore
                "{}/api/runtimes/v1/runtimes".format(self.run_url),  # type: ignore
                method="POST",
                json=body,
            )
            return response.json()
        except RuntimeError as e:
            return {"success": False, "message": str(e)}


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
