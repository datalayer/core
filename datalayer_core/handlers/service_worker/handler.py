# Copyright (c) 2023-2024 Datalayer, Inc.
#
# Datalayer License

from pathlib import Path
from typing import Optional
from tornado import web

from jupyter_server.base.handlers import JupyterHandler


class ServiceWorkerHandler(web.StaticFileHandler, JupyterHandler):
    """Serve the service worker script."""

    def initialize(self):
        """Initialize the API spec handler."""
        # Must match the folder containing the service worker asset as specified
        # in the webpack.lab-config.js
        extensionStatic = Path(__file__).parent.parent.parent / "labextension" / "static"
        super().initialize(path=str(extensionStatic))

    def validate_absolute_path(self, root: str, absolute_path: str) -> Optional[str]:
        """Only allow to serve the service worker"""
        # Must match the filename name set in webpack.lab-config.js
        if Path(absolute_path).name != 'lite-service-worker.js':
            raise web.HTTPError(404)
        return super().validate_absolute_path(root, absolute_path)

    def get_content_type(self):
        """Get the content type."""
        return "text/javascript"

    def set_extra_headers(self, path: str) -> None:
        """Add extra headers to the response"""
        # Allow a service worker to get a broader scope than
        # its path.
        # See https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerContainer/register#examples
        #     https://medium.com/dev-channel/two-http-headers-related-to-service-workers-you-never-may-have-heard-of-c8862f76cc60
        self.set_header("Service-Worker-Allowed", "/")
