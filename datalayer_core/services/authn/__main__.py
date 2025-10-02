# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""Datalayer authentication main entry point."""

from __future__ import annotations

import logging
from typing import Optional

from datalayer_core.services.authn.http_server import get_token

logging.basicConfig(level=logging.INFO)

logger = logging.getLogger(__name__)


DATALAYER_RUN_URL = "https://prod1.datalayer.run"


if __name__ == "__main__":
    from sys import argv

    if len(argv) == 2:
        ans = get_token(DATALAYER_RUN_URL, port=int(argv[1]))
    else:
        ans = get_token(DATALAYER_RUN_URL)

    handle: Optional[str] = None
    token: Optional[str] = None

    if ans is not None:
        handle, token = ans

    logger.info(f"Logged as {handle} with token: {token}")
