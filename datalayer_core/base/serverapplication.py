# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""The Datalayer Core Server application."""

from pathlib import Path

from jupyter_server.extension.application import ExtensionApp, ExtensionAppJinjaMixin
from jupyter_server.utils import url_path_join
from traitlets import Bool, CInt, Instance, Unicode, default
from traitlets.config import Configurable

from datalayer_core.__version import __version__
from datalayer_core.authn.server.state import get_server_port
from datalayer_core.handlers.config.handler import ConfigHandler
from datalayer_core.handlers.index.handler import IndexHandler
from datalayer_core.handlers.login.handler import LoginHandler
from datalayer_core.handlers.service_worker.handler import ServiceWorkerHandler
from datalayer_core.utils.urls import DatalayerURLs

_PACKAGE_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_STATIC_FILES_PATH = str(_PACKAGE_ROOT / "static")
DEFAULT_TEMPLATE_FILES_PATH = str(_PACKAGE_ROOT / "templates")


class DatalayerExtensionApp(ExtensionAppJinjaMixin, ExtensionApp):
    """The Datalayer Server extension."""

    name = "datalayer"

    extension_url = "/datalayer"

    load_other_extensions = True

    static_paths = [DEFAULT_STATIC_FILES_PATH]

    template_paths = [DEFAULT_TEMPLATE_FILES_PATH]

    # One URL per service: there is no single base any more. Each of them can
    # be set and None or ' ' (empty string); the consumer of those settings is
    # then free to consider it as null. What is not configured is resolved from
    # the environment — `DATALAYER_IAM_URL` and friends — and falls back to the
    # default of the service, see `DatalayerURLs`.
    iam_url = Unicode(
        config=True,
        allow_none=True,
        help="""URL to connect to the Datalayer IAM API.""",
    )

    runtimes_url = Unicode(
        config=True,
        allow_none=True,
        help="""URL to connect to the Datalayer Runtimes API.""",
    )

    spacer_url = Unicode(
        config=True,
        allow_none=True,
        help="""URL to connect to the Datalayer Spacer API.""",
    )

    library_url = Unicode(
        config=True,
        allow_none=True,
        help="""URL to connect to the Datalayer Library API.""",
    )

    contents_url = Unicode(
        config=True,
        allow_none=True,
        help="""URL to connect to the Datalayer Contents API.""",
    )

    manager_url = Unicode(
        config=True,
        allow_none=True,
        help="""URL to connect to the Datalayer Manager API.""",
    )

    scheduler_url = Unicode(
        config=True,
        allow_none=True,
        help="""URL to connect to the Datalayer Scheduler API.""",
    )

    ai_agents_url = Unicode(
        config=True,
        allow_none=True,
        help="""URL to connect to the Datalayer AI Agents API.""",
    )

    ai_inference_url = Unicode(
        config=True,
        allow_none=True,
        help="""URL to connect to the Datalayer AI Inference API.""",
    )

    @default("iam_url")
    def _default_iam_url(self) -> str:
        return self._urls.iam_url

    @default("runtimes_url")
    def _default_runtimes_url(self) -> str:
        return self._urls.runtimes_url

    @default("spacer_url")
    def _default_spacer_url(self) -> str:
        return self._urls.spacer_url

    @default("library_url")
    def _default_library_url(self) -> str:
        return self._urls.library_url

    @default("contents_url")
    def _default_contents_url(self) -> str:
        return self._urls.contents_url

    @default("manager_url")
    def _default_manager_url(self) -> str:
        return self._urls.manager_url

    @default("scheduler_url")
    def _default_scheduler_url(self) -> str:
        return self._urls.scheduler_url

    @default("ai_agents_url")
    def _default_ai_agents_url(self) -> str:
        return self._urls.ai_agents_url

    @default("ai_inference_url")
    def _default_ai_inference_url(self) -> str:
        return self._urls.ai_inference_url

    @property
    def _urls(self) -> DatalayerURLs:
        """The URLs of the services, as the environment resolves them."""
        return DatalayerURLs.from_environment()

    @property
    def service_urls(self) -> dict:
        """The URL of every service, as the browser and the templates read them."""
        return {
            "iam_url": self.iam_url,
            "runtimes_url": self.runtimes_url,
            "spacer_url": self.spacer_url,
            "library_url": self.library_url,
            "contents_url": self.contents_url,
            "manager_url": self.manager_url,
            "scheduler_url": self.scheduler_url,
            "ai_agents_url": self.ai_agents_url,
            "ai_inference_url": self.ai_inference_url,
        }

    white_label = Bool(False, config=True, help="""Display white label content.""")

    benchmarks = Bool(False, config=True, help="""Show the benchmarks page.""")

    kernels = Bool(False, config=True, help="""Show the kernels page.""")

    webapp = Bool(False, config=True, help="""Show the webapp page.""")

    class Launcher(Configurable):
        """Datalayer launcher configuration."""

        category = Unicode(
            "Datalayer",
            config=True,
            help=("Application launcher card category."),
        )

        name = Unicode(
            "Datalayer",
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
    def _default_launcher(self) -> "DatalayerExtensionApp.Launcher":
        """
        Get default launcher configuration.

        Returns
        -------
        DatalayerExtensionApp.Launcher
            The default launcher configuration instance.
        """
        return DatalayerExtensionApp.Launcher(parent=self, config=self.config)

    class Brand(Configurable):
        """Datalayer brand configuration."""

        name = Unicode(
            "Datalayer",
            config=True,
            help=("Brand name."),
        )

        logo_url = Unicode(
            "https://assets.datalayer.tech/datalayer-25.svg",
            config=True,
            help=("Logo URL."),
        )

        logo_square_url = Unicode(
            "https://assets.datalayer.tech/datalayer-square.png",
            config=True,
            help=("Logo square URL."),
        )

        about = Unicode(
            "AI Agents for Data Analysis",
            config=True,
            help=("About brand."),
        )

        copyright = Unicode(
            "© 2025 Datalayer, Inc.",
            config=True,
            help=("Copyright."),
        )

        docs_url = Unicode(
            "https://datalayer.ai/docs",
            config=True,
            help=("Documentation URL."),
        )

        support_url = Unicode(
            "https://datalayer.ai/support",
            config=True,
            help=("Support URL."),
        )

        pricing_url = Unicode(
            "https://datalayer.ai/pricing",
            config=True,
            help=("Pricing URL."),
        )

        terms_url = Unicode(
            "https://datalayer.ai/terms",
            config=True,
            help=("Terms URL."),
        )

        privacy_url = Unicode(
            "https://datalayer.ai/privacy",
            config=True,
            help=("Privacy URL."),
        )

    brand = Instance(Brand)

    @default("brand")
    def _default_brand(self) -> "DatalayerExtensionApp.Brand":
        """
        Get default brand configuration.

        Returns
        -------
        DatalayerExtensionApp.Brand
            The default brand configuration instance.
        """
        return DatalayerExtensionApp.Brand(parent=self, config=self.config)

    def initialize_settings(self) -> None:
        """Initialize server settings based on configuration."""

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
            **self.service_urls,
            launcher={
                "category": self.launcher.category,
                "name": self.launcher.name,
                "icon": self.launcher.icon_svg_url,
                "rank": self.launcher.rank,
            },
            brand={
                "name": self.brand.name,
                "about": self.brand.about,
                "docs_url": self.brand.docs_url,
                "support_url": self.brand.support_url,
                "pricing_url": self.brand.pricing_url,
                "terms_url": self.brand.terms_url,
                "privacy_url": self.brand.privacy_url,
            },
            white_label=self.white_label,
        )

        self.settings.update(**settings)

    def initialize_templates(self) -> None:
        """Initialize Jinja templates with Datalayer variables."""
        self.serverapp.jinja_template_vars.update(
            {
                "datalayer_version": __version__,
                **self.service_urls,
            }
        )

    def initialize_handlers(self) -> None:
        """Initialize HTTP request handlers."""
        handlers = [
            ("/", IndexHandler),
            (self.name, IndexHandler),
            (url_path_join(self.name, "config"), ConfigHandler),
            (url_path_join(self.name, "benchmarks"), IndexHandler),
            (url_path_join(self.name, "kernels"), IndexHandler),
            (url_path_join(self.name, "login"), LoginHandler),
            (
                url_path_join(self.name, "service-worker", r"([^/]+\.js)"),
                ServiceWorkerHandler,
            ),
        ]
        self.handlers.extend(handlers)


# -----------------------------------------------------------------------------
# Main entry point
# -----------------------------------------------------------------------------


main = launch_new_instance = DatalayerExtensionApp.launch_instance
