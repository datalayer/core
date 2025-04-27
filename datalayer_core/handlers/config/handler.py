# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""Datalayer handlers."""

import json

import tornado

from jupyter_server.base.handlers import APIHandler, JupyterHandler
from jupyter_server.extension.handler import (
    ExtensionHandlerMixin,
)

from datalayer_core.__version__ import __version__


class ConfigHandler(ExtensionHandlerMixin, APIHandler):
    """The handler for configuration."""

    @tornado.web.authenticated
    def get(self):
        """Returns the configuration of the server extension."""
        settings = self.settings["datalayer"]
        configuration = dict(
            run_url=settings.run_url,
            launcher={
                "category": settings.launcher.category,
                "name": settings.launcher.name,
                "icon": settings.launcher.icon_svg_url,
                "rank": settings.launcher.rank,
            },
            brand={
                "name": settings.brand.name,
                "logo_url": settings.brand.logo_url,
                "logo_square_url": settings.brand.logo_square_url,
                "about": settings.brand.about,
                "copyright": settings.brand.copyright,
                "docs_url": settings.brand.docs_url,
                "support_url": settings.brand.support_url,
                "pricing_url": settings.brand.pricing_url,
                "terms_url": settings.brand.terms_url,
                "privacy_url": settings.brand.privacy_url,
            },
            white_label=settings.white_label,
        )
        res = json.dumps(
            {
                "extension": "datalayer",
                "version": __version__,
                "settings": configuration, # TODO this is for backwards compatibility, remove at some point...
                "configuration": configuration, # TODO this is for backwards compatibility, remove at some point...
            }
        )
        self.finish(res)
