# Copyright (c) 2023-2026 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""What datalayer-core contributes to a host CLI, as a reactor plugin.

The `datalayer` command is itself a reactor *host* — it discovers extensions
under the ``datalayer.cli`` entry-point group and lets them add their command
groups (the sandboxes and agents arrive from agent-runtimes that way). This
module is the symmetric half: the core's own command groups — auth, secrets,
orgs, teams, config and the rest — packaged as an extension, so any *other*
reactor CLI host can carry them. Install this distribution beside the
``reactor`` command and ``reactor login``, ``reactor secrets`` and the others
are simply there.

The plugin is advertised under the reactor's CLI group::

    [project.entry-points."datalayer.reactor.cli"]
    datalayer-core = "datalayer_core.reactor_extension:plugin"

Deliberately *not* under ``datalayer.cli``: the `datalayer` command adds
these groups statically as the host, and discovering itself would register
every command twice.
"""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING

from reactor import PluginManifest

if TYPE_CHECKING:  # pragma: no cover - typing only
    import typer

logger = logging.getLogger(__name__)

#: The identity of the extension, for the reactor.
manifest = PluginManifest(
    name="datalayer-core",
    version="1.0.0",
    description=(
        "The Datalayer platform commands: auth, secrets, organizations, "
        "teams, usage, configuration and the rest."
    ),
    author="Datalayer",
    tags=["cli", "datalayer", "iam"],
)

#: The command groups registered into the host, each by its import path.
#:
#: Named rather than imported: a group is loaded when the CLI starts, and one
#: that cannot load — a missing optional dependency, a broken provider — must
#: cost a warning, not the whole command line.
_COMMAND_GROUPS: tuple[str, ...] = (
    "datalayer_core.cli.commands.about",
    "datalayer_core.cli.commands.authn",
    "datalayer_core.cli.commands.cluster",
    "datalayer_core.cli.commands.config",
    "datalayer_core.cli.commands.contents",
    "datalayer_core.cli.commands.mcp",
    "datalayer_core.cli.commands.memberships",
    "datalayer_core.cli.commands.orgs",
    "datalayer_core.cli.commands.teams",
    "datalayer_core.cli.commands.otel",
    "datalayer_core.cli.commands.secrets",
    "datalayer_core.cli.commands.subscription",
    "datalayer_core.cli.commands.api_keys",
    "datalayer_core.cli.commands.users",
    "datalayer_core.cli.commands.usage",
    "datalayer_core.cli.commands.plans",
    "datalayer_core.cli.commands.web",
)


class DatalayerCoreCliExtension:
    """The plugin: registers every command group into the host CLI."""

    def provide_cli(self, cli: "typer.Typer") -> None:
        from importlib import import_module

        for module_path in _COMMAND_GROUPS:
            try:
                module = import_module(module_path)
                cli.add_typer(module.app)
            except Exception as error:  # noqa: BLE001
                logger.warning(
                    "The command group %s could not be registered: %s",
                    module_path,
                    error,
                )


def plugin() -> tuple[PluginManifest, DatalayerCoreCliExtension]:
    """What the entry point resolves to."""
    return manifest, DatalayerCoreCliExtension()
