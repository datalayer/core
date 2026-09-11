# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""
Server-Sent Events, read from the lines of a response as they arrive.

The framing of the event-stream format and nothing more: an event is the
fields before a blank line, ``data`` lines are joined with a newline, a line
starting with ``:`` is a comment, and a field ends at the first colon with one
space after it dropped. The rules ``readServerSentEvents`` follows in
``src/api/orchestration/events.ts``, so the Python and TypeScript clients read
one stream the same way.
"""

from __future__ import annotations

from collections.abc import Iterable, Iterator
from typing import NamedTuple


class ServerSentEvent(NamedTuple):
    """One event, as it was framed."""

    event: str
    data: str
    id: str | None = None


def read_server_sent_events(lines: Iterable[str]) -> Iterator[ServerSentEvent]:
    """
    Yield each complete event of a stream of lines.

    An event still arriving when the lines end is not yielded: a stream cut in
    the middle of an event has not sent it.

    Parameters
    ----------
    lines : Iterable[str]
        The lines of the stream, without their line endings.

    Yields
    ------
    ServerSentEvent
        Each event, in the order it was sent.
    """
    event = "message"
    data: list[str] = []
    identifier: str | None = None
    started = False
    for raw in lines:
        line = raw.rstrip("\r")
        if line == "":
            if started:
                yield ServerSentEvent(event=event, data="\n".join(data), id=identifier)
            event, data, identifier, started = "message", [], None, False
            continue
        if line.startswith(":"):
            continue
        field, _, value = line.partition(":")
        if value.startswith(" "):
            value = value[1:]
        started = True
        if field == "event":
            event = value
        elif field == "data":
            data.append(value)
        elif field == "id":
            identifier = value
