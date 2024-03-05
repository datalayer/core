"""The Datalayer Server application."""

import os

from traitlets import (
    Unicode, Bool,
)

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

    launcher_category = Unicode("Datalayer",
        config=True,
        help=("Category to use for the applicaton launcher."), 
        )
    kubernetes_hostname = Unicode("io.datalayer.run",
        config=True,
        help="""Kubernetes hostname to connect."""
        )

    def initialize_settings(self):
        settings = dict(
            launcher_category=self.launcher_category,
            kubernetes_hostname=self.kubernetes_hostname,
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
