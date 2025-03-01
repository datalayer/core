# Copyright (c) 2023-2024 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

import json

from ..__version__ import __version__


async def test_config(jp_fetch):
    # When
    response = await jp_fetch("datalayer_core", "config")

    # Then
    assert response.code == 200
    payload = json.loads(response.body)
    assert payload == {
        "extension": "datalayer_core",
        "version": __version__,
    }
