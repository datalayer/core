"""Datalayer handlers."""

import json

import tornado

from jupyter_server.base.handlers import APIHandler, JupyterHandler
from jupyter_server.extension.handler import (
    ExtensionHandlerMixin,
)

from datalayer_core._version import __version__



class ConfigHandler(ExtensionHandlerMixin, APIHandler):
    """The handler for configuration."""

    @tornado.web.authenticated
    def get(self):
        """Returns the configuration of the server extension."""
        settings = self.settings["datalayer"]
        res = json.dumps(
            {
                "extension": "datalayer",
                "version": __version__,
                "settings": dict(
                    run_url=settings.run_url,
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
