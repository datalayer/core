# Copyright (c) 2023-2026 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""The response envelope, and the one way it used to lose an answer.

`DataResponse` flattens its payload to the top level, which is how every
service answers `{success, message, …the payload…}`. A payload field named
`message` therefore landed on the envelope's own — a sentence for a person to
read, typed `str` — and pydantic refused the dict, so the service answered
`500` while building a perfectly good response. AI Inference's chat completions
did exactly that in production until 2026-09-12.

The envelope now refuses the collision at construction, which is a failure the
first test sees rather than one a customer sees.
"""

from __future__ import annotations

import pytest
from pydantic import BaseModel

from datalayer_core.models.base import RESERVED_RESPONSE_FIELDS, DataResponse
from datalayer_core.models.inference import ChatResponseData


class _Payload(BaseModel):
    kind: str = "payload"


class _Shadowing(BaseModel):
    message: dict | None = None


def test_a_payload_is_flattened_beside_the_envelopes_own_fields():
    answered = DataResponse[_Payload](
        success=True, message="Done", data=_Payload()
    ).model_dump()

    assert answered["success"] is True
    assert answered["message"] == "Done", "the envelope keeps its own sentence"
    assert answered["kind"] == "payload"


def test_a_payload_that_would_shadow_the_envelope_is_refused():
    with pytest.raises(ValueError) as refused:
        DataResponse[_Shadowing](
            success=True, message="Done", data=_Shadowing(message={"content": "hello"})
        )

    said = str(refused.value)
    assert "message" in said
    assert "key=" in said, "the error says how to fix it"


def test_the_same_payload_is_fine_nested_under_a_name_of_its_own():
    answered = DataResponse[_Shadowing](
        success=True,
        message="Done",
        data=_Shadowing(message={"content": "hello"}),
        key="result",
    ).model_dump()

    assert answered["message"] == "Done"
    assert answered["result"]["message"] == {"content": "hello"}


def test_the_reserved_names_are_the_envelopes_own():
    assert RESERVED_RESPONSE_FIELDS == ("success", "message")


def test_a_chat_completion_carries_the_assistant_message_and_the_envelopes_own():
    """What AI Inference answers, as its clients read it."""
    assistant = {"role": "assistant", "content": "OK.", "tool_calls": None}

    answered = DataResponse[ChatResponseData](
        success=True,
        message="Chat completion successful",
        data=ChatResponseData(
            response="OK.",
            assistant_message=assistant,
            choices=[{"index": 0, "message": assistant}],
            model="bedrock/us.anthropic.claude-sonnet-4-6",
            usage={"total_tokens": 8},
        ),
    ).model_dump()

    assert answered["message"] == "Chat completion successful"
    assert answered["response"] == "OK."
    assert answered["assistant_message"] == assistant
    assert answered["choices"][0]["message"] == assistant, (
        "the OpenAI-compatible choices keep their own `message`, nested and safe"
    )


def test_something_with_no_fields_goes_under_data():
    answered = DataResponse[str](success=True, message="Done", data="plain").model_dump()

    assert answered["data"] == "plain" and answered["message"] == "Done"
