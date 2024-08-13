# Copyright (c) Datalayer Development Team.
# Distributed under the terms of the Modified BSD License.

"""Base handler."""

from jupyter_server.base.handlers import JupyterHandler
from jupyter_server.extension.handler import ExtensionHandlerMixin, ExtensionHandlerJinjaMixin


# pylint: disable=W0223
class BaseTemplateHandler(ExtensionHandlerJinjaMixin, ExtensionHandlerMixin, JupyterHandler):
    """The Base handler for the templates."""
    