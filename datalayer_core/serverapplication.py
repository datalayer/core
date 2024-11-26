"""The Datalayer Core Server application."""

import os
import typing as t

from traitlets import default, Bool, CInt, Instance, Unicode
from traitlets.config import Configurable

from jupyter_server.utils import url_path_join
from jupyter_server.extension.application import ExtensionApp, ExtensionAppJinjaMixin

from datalayer_core.handlers.index.handler import IndexHandler
from datalayer_core.handlers.config.handler import ConfigHandler
from datalayer_core.handlers.login.handler import LoginHandler
from datalayer_core.handlers.service_worker.handler import ServiceWorkerHandler

from datalayer_core.authn.state import get_server_port

from datalayer_core._version import __version__


DEFAULT_STATIC_FILES_PATH = os.path.join(os.path.dirname(__file__), "./static")

DEFAULT_TEMPLATE_FILES_PATH = os.path.join(os.path.dirname(__file__), "./templates")


class DatalayerExtensionApp(ExtensionAppJinjaMixin, ExtensionApp):
    """The Datalayer Server extension."""

    name = "datalayer"

    extension_url = "/datalayer"

    load_other_extensions = True

    static_paths = [DEFAULT_STATIC_FILES_PATH]
    template_paths = [DEFAULT_TEMPLATE_FILES_PATH]

    # 'run_url' can be set set and None or ' ' (empty string).
    # In that case, the consumer of those settings are free
    # to consider run_url as null.
    run_url = Unicode(
        "https://prod1.datalayer.run",
        config=True,
        allow_none=True,
        help="""URL to connect to the Datalayer RUN APIs.""",
    )

    white_label = Bool(False, config=True, help="""Display white label content.""")

    benchmarks = Bool(False, config=True, help="""Show the benchmarks page.""")
    kernels = Bool(False, config=True, help="""Show the kernels page.""")
    webapp = Bool(False, config=True, help="""Show the webapp page.""")

    class Launcher(Configurable):
        """Datalayer launcher configuration"""

        category = Unicode(
            "Datalayer",
            config=True,
            help=("Application launcher card category."),
        )

        name = Unicode(
            "Jupyter Kernels",
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
        self.serverapp.answer_yes = True
        if self.benchmarks:
            self.serverapp.default_url = "/datalayer/benchmarks"
        if self.kernels:
            self.serverapp.default_url = "/datalayer/kernels"
        if self.webapp:
            self.serverapp.default_url = "/datalayer/web"
        port = get_server_port()
        if port is not None:
            self.serverapp.port = port
        settings = dict(
            run_url=self.run_url,
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
        self.serverapp.jinja_template_vars.update({
            "datalayer_version": __version__,
            "run_url": self.run_url,
        })

    def initialize_handlers(self):
        handlers = [
            ("/", IndexHandler),
            (self.name, IndexHandler),
            (url_path_join(self.name, "config"), ConfigHandler),
            (url_path_join(self.name, "benchmarks"), IndexHandler),
            (url_path_join(self.name, "kernels"), IndexHandler),
            (url_path_join(self.name, "login"), LoginHandler),
            (url_path_join(self.name, "service-worker", r"([^/]+\.js)"), ServiceWorkerHandler),
        ]
        self.handlers.extend(handlers)


# -----------------------------------------------------------------------------
# Main entry point
# -----------------------------------------------------------------------------

main = launch_new_instance = DatalayerExtensionApp.launch_instance
