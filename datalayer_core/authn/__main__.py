# Copyright (c) Datalayer Development Team.
# Distributed under the terms of the Modified BSD License.

from __future__ import annotations

import logging

from datalayer_core.authn.http_server import get_token


logging.basicConfig(level=logging.INFO)

logger = logging.getLogger(__name__)


DATALAYER_RUN_URL = "https://prod1.datalayer.run"


if __name__ == "__main__":
    from sys import argv

    if len(argv) == 2:
        ans = get_token(DATALAYER_RUN_URL, port=int(argv[1]))
    else:
        ans = get_token(DATALAYER_RUN_URL)

    if ans is not None:
        handle, token = ans
    else:
        handle = None
        token = None

    logger.info(f"Logged as {handle} with token: {token}")
