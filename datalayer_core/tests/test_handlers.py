import json

from .._version import __version__


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
