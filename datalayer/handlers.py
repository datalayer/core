"""Datalayer handlers."""

import json

import tornado

from jupyter_server.base.handlers import APIHandler, JupyterHandler
from jupyter_server.extension.handler import (
    ExtensionHandlerMixin,
    ExtensionHandlerJinjaMixin,
)

from ._version import __version__


# pylint: disable=W0223
class BaseTemplateHandler(
    ExtensionHandlerJinjaMixin, ExtensionHandlerMixin, JupyterHandler
):
    """The Base handler for the templates."""


class IndexHandler(BaseTemplateHandler):
    """The handler for the index."""

    @tornado.web.authenticated
    def get(self):
        """The index page."""
        self.write(self.render_template("index.html"))


class ConfigHandler(ExtensionHandlerMixin, APIHandler):
    """The handler for configuration."""

    @tornado.web.authenticated
    def get(self):
        """Returns the configuration of the server extension."""
        settings = self.settings["datalayer_config"]
        self.log.critical(str(settings))
        res = json.dumps(
            {
                "extension": "datalayer",
                "version": __version__,
                "settings": dict(
                    api_server_url=settings.api_server_url,
                    launcher={
                        "category": settings.launcher.category,
                        "name": settings.launcher.name,
                        "icon": settings.launcher.icon_svg_url,
                        "rank": settings.launcher.rank,
                    },
                    white_label=settings.white_label,
                ),
            }
        )
        self.finish(res)
