# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""
What every canonical orchestration record shares (PLAN_ORCHESTRATOR.md, O0-01).

The wire is camel case. Section 5.2 of the plan writes the execution as
``executionId``, ``parentExecutionId``, ``acceptanceCriteria``, and the
browser reads those keys unconverted — unlike the MCP and Contents wires,
which are snake case and need a converter on the TypeScript side. Python
keeps its own snake case names and reaches the wire through aliases, so one
model serves the CLI, the control plane and the generated TypeScript without
a second spelling of any field.

Unknown fields are refused. Section 9 of the plan treats workers, protocol
metadata and artifacts as untrusted, and a field the orchestrator does not
understand is exactly what it must not carry into shared Datalayer
resources; the MCP models allow extras because the gateway is the authority
there, while here the authority is this module.

The shared vocabularies — states, command names, artifact types — are
``Enum`` classes rather than ``Literal`` aliases so that the JSON Schema
names them, which is what lets the generated TypeScript name them too
instead of inlining an anonymous union at every field.

Every instant is a ``Timestamp``: an RFC 3339 string carrying an offset,
checked rather than assumed. A deadline, a lease expiry or a manifest expiry
that is not a real instant is one that never arrives, and the field it sits
on is the one deciding whether a worker's access has ended (O0-09). The
check is a validation, not a conversion — the string is returned exactly as
it was given, so a record read from the wire is written back byte for byte.
"""

from __future__ import annotations

import re
from datetime import date, datetime, timedelta, timezone
from typing import Annotated, Any, TypeVar

from pydantic import AfterValidator, BaseModel, ConfigDict
from pydantic.alias_generators import to_camel

#: RFC 3339 section 5.6, with the offset required. "2026-09-09T10:00:00Z" and
#: "2026-09-09T10:00:00+02:00" are instants; "2026-09-09T10:00:00" is a wall
#: clock in an unnamed place, and two services that disagree about which
#: place is how a lease expires an hour late.
RFC_3339 = re.compile(
    r"^(?P<year>\d{4})-(?P<month>\d{2})-(?P<day>\d{2})"
    r"[Tt](?P<hour>\d{2}):(?P<minute>\d{2}):(?P<second>\d{2})"
    r"(?P<fraction>\.\d+)?"
    r"(?P<offset>[Zz]|[+-]\d{2}:\d{2})$"
)


def _match(value: str) -> "re.Match[str]":
    """
    Read a timestamp's parts, refusing anything that is not an instant.

    Parameters
    ----------
    value : str
        The instant as it was given.

    Returns
    -------
    re.Match[str]
        Its parts, once the shape, the date and the time of day are known
        to be real ones.

    Raises
    ------
    ValueError
        When the string is not an RFC 3339 instant with an offset, or names
        a date or a time that does not exist.
    """
    match = RFC_3339.match(value)
    if match is None:
        raise ValueError(
            f"'{value}' is not an RFC 3339 instant: the form is "
            "2026-09-09T10:00:00Z, and the offset is required."
        )
    try:
        date(int(match["year"]), int(match["month"]), int(match["day"]))
    except ValueError as error:
        raise ValueError(f"'{value}' is not a real date: {error}") from error
    hour = int(match["hour"])
    minute = int(match["minute"])
    second = int(match["second"])
    # A sixty-first second is a leap second, which RFC 3339 allows and which
    # a worker stamping from a leap-smeared clock genuinely produces.
    if hour > 23 or minute > 59 or second > 60:
        raise ValueError(f"'{value}' is not a real time of day.")
    return match


def check_rfc3339(value: str) -> str:
    """
    Return the timestamp unchanged, once it is known to be one.

    Parameters
    ----------
    value : str
        The instant as it was given.

    Returns
    -------
    str
        The same string, so that a record read from the wire is written
        back byte for byte.
    """
    _match(value)
    return value


#: An RFC 3339 instant. Spelled once so that every deadline, expiry and
#: stamp in the package is the same kind of thing.
Timestamp = Annotated[str, AfterValidator(check_rfc3339)]


def instant(value: str) -> datetime:
    """
    Read a timestamp as the moment it names.

    Parsed here rather than with ``datetime.fromisoformat`` because that
    function only learnt to read a trailing ``Z`` in Python 3.11 and still
    refuses a fractional part of any length but three or six digits, both of
    which RFC 3339 allows and a worker's clock can produce. This package
    supports 3.10.

    A leap second is read as the last instant of its minute: ``datetime``
    cannot hold a sixty-first second, and refusing a timestamp a real clock
    stamped would be refusing the truth.

    Parameters
    ----------
    value : str
        The RFC 3339 instant.

    Returns
    -------
    datetime
        The moment, always with a time zone, so that two of them compare.
    """
    match = _match(value)
    offset = match["offset"]
    if offset in {"Z", "z"}:
        zone = timezone.utc
    else:
        sign = -1 if offset[0] == "-" else 1
        zone = timezone(
            sign * timedelta(hours=int(offset[1:3]), minutes=int(offset[4:6]))
        )
    second = int(match["second"])
    microsecond = (
        round(float(match["fraction"]) * 1_000_000) if match["fraction"] else 0
    )
    if second == 60:
        second, microsecond = 59, 999_999
    return datetime(
        int(match["year"]),
        int(match["month"]),
        int(match["day"]),
        int(match["hour"]),
        int(match["minute"]),
        second,
        microsecond,
        tzinfo=zone,
    )


#: A record of this kind or of any kind derived from it. `typing.Self` would
#: say it in one word, and arrives in Python 3.11; this package supports 3.10.
Record = TypeVar("Record", bound="CanonicalModel")


class CanonicalModel(BaseModel):
    """One canonical record: snake case in Python, camel case on the wire."""

    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        extra="forbid",
        validate_default=True,
        use_enum_values=False,
    )

    def to_wire(self) -> dict[str, Any]:
        """
        Return the record as it travels: camel case, JSON scalars, nulls kept.

        Nulls are kept because the absence of a field and a field that is
        explicitly nothing are different things to an orchestrator deciding
        whether a policy was inherited or never set.

        Returns
        -------
        dict[str, Any]
            The JSON form of this record.
        """
        return self.model_dump(mode="json", by_alias=True)

    @classmethod
    def from_wire(cls: type[Record], payload: dict[str, Any]) -> Record:
        """
        Read a wire document, refusing anything this model does not declare.

        Parameters
        ----------
        payload : dict[str, Any]
            The JSON form of the record, camel case or snake case.

        Returns
        -------
        Record
            The validated record.
        """
        return cls.model_validate(payload)
