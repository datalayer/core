# Copyright (c) Datalayer Development Team.
# Distributed under the terms of the Modified BSD License.

"""Login handler."""

import json
# import tornado

from jupyter_server.base.handlers import APIHandler
from jupyter_server.extension.handler import ExtensionHandlerMixin

from datalayer_core._version import __version__


# pylint: disable=W0223
class LoginHandler(ExtensionHandlerMixin, APIHandler):
    """The login handler."""

#    @tornado.web.authenticated
    def post(self):
        """Login."""
        data = json.loads(self.request.body)
        print(data)
        self.write("")
        self.finish("")
