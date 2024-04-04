"""The Datalayer Server application."""

import json
import os
import typing as t

from traitlets import default, Bool, CInt, Instance, Unicode
from traitlets.config import Configurable

from jupyter_server.utils import url_path_join
from jupyter_server.extension.application import ExtensionApp, ExtensionAppJinjaMixin

from ._version import __version__
from .handlers import IndexHandler, ConfigHandler


DEFAULT_STATIC_FILES_PATH = os.path.join(os.path.dirname(__file__), "./static")

DEFAULT_TEMPLATE_FILES_PATH = os.path.join(os.path.dirname(__file__), "./templates")


class DatalayerExtensionApp(ExtensionAppJinjaMixin, ExtensionApp):
    """The Datalayer Server extension."""

    name = "datalayer"

    extension_url = "/datalayer"

    load_other_extensions = True

    static_paths = [DEFAULT_STATIC_FILES_PATH]
    template_paths = [DEFAULT_TEMPLATE_FILES_PATH]

    api_server_url = Unicode(
        "https://io.datalayer.run",
        config=True,
        help="""Hostname to connect to the Datalayer APIs.""",
    )

    white_label = Bool(False, config=True, help="""Display white label content.""")

    class Launcher(Configurable):
        """Datalayer launcher configuration"""

        category = Unicode(
            "Datalayer",
            config=True,
            help=("Application launcher card category."),
        )

        name = Unicode(
            "Jupyter kernels",
            config=True,
            help=("Application launcher card name."),
        )

        icon_svg_url = Unicode(
            None,
            allow_none=True,
            config=True,
            help=("Application launcher card icon."),
        )

        rank = CInt(
            0,
            config=True,
            help=("Application launcher card rank."),
        )

    launcher = Instance(Launcher)

    @default("launcher")
    def _default_launcher(self):
        return DatalayerExtensionApp.Launcher(parent=self, config=self.config)

    def initialize_settings(self):
        settings = dict(
            api_server_url=self.api_server_url,
            launcher={
                "category": self.launcher.category,
                "name": self.launcher.name,
                "icon": self.launcher.icon_svg_url,
                "rank": self.launcher.rank,
            },
            white_label=self.white_label,
        )
        self.settings.update(**settings)

    def initialize_templates(self):
        self.serverapp.jinja_template_vars.update({"datalayer_version": __version__})

    def initialize_handlers(self):
        handlers = [
            ("datalayer", IndexHandler),
            (url_path_join("datalayer", "config"), ConfigHandler),
        ]
        self.handlers.extend(handlers)


# -----------------------------------------------------------------------------
# Main entry point
# -----------------------------------------------------------------------------

main = launch_new_instance = DatalayerExtensionApp.launch_instance
