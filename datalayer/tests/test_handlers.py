import json

from .._version import __version__


async def test_get_config(jp_fetch):
    # When
    response = await jp_fetch("datalayer", "get_config")

    # Then
    assert response.code == 200
    payload = json.loads(response.body)
    assert payload == {
        "extension": "datalayer",
        "version": __version__,
    }
