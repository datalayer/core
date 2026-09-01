# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

# Copyright (c) 2023-2026 Datalayer, Inc.
# Datalayer License

"""Where a published table lives, and what it is called.

A user publishes a dataframe out of a sandbox; Contents writes it to the
shared filesystem; a Data Server's `table` connector reads it back. Three
processes have to agree on one layout, and only two of them can share code:
the Data Server depends on `httpx` and `pyarrow` and nothing else, on purpose,
because it ships to places where a dependency tree is a liability.

So this is a **contract** rather than a library the third party imports — the
same arrangement as the Node Mount Gateway's wire format, and it carries the
same obligation: a test on each side pins its own implementation to the shape
described here, and the shapes are compared rather than assumed.

The layout::

    <root>/<owner uid>/<relation>/part-00000.parquet
                                  part-00001.parquet
                                  ...

`root` is the publishing area, which Contents owns and a Data Server is
configured with. Nothing else is a path: a caller names an **owner** and a
**relation**, never a directory, so publishing cannot become a way to write
somewhere that was not meant for it.
"""

from __future__ import annotations

import re

__all__ = [
    "PART_SUFFIX",
    "RELATION_PATTERN",
    "clean_relation",
    "is_part_name",
    "part_name",
    "relation_directory",
]

#: A relation is one path segment, and one that cannot be read as anything
#: else: no separator, no `.` or `..`, nothing an argument parser could take
#: for a flag. The same shape the Data Server's `table` connector enforces —
#: deliberately, so a name Contents accepts is never a name the connector
#: refuses, which would be a table published and unservable.
RELATION_PATTERN = r"^[A-Za-z0-9_][A-Za-z0-9._-]{0,126}$"

_RELATION_RE = re.compile(RELATION_PATTERN)

#: What a part file ends with. A published table is a directory of parts, so a
#: republish can be written beside the old ones and swapped, and a large frame
#: can be written in pieces.
PART_SUFFIX = ".parquet"

#: How many digits a part number is padded to. Padded because the parts are
#: read in **sorted** order: `part-10` must not sort before `part-2`, or a
#: query without an `ORDER BY` returns rows in an order nobody chose.
_PART_DIGITS = 5


def clean_relation(value: object) -> str:
    """The relation name, or raise.

    Refused where it is written rather than where it is read: a name that only
    fails on the Data Server is a table that looked published and never was.
    """
    raw = str(value or "").strip()
    if not _RELATION_RE.match(raw):
        raise ValueError(
            f"'{raw}' is not a published table name: one segment of letters, "
            "digits, underscore, dot or dash, starting with a letter, digit "
            "or underscore"
        )
    return raw


def relation_directory(root: str, owner_uid: str, relation: str) -> str:
    """The directory a published table's parts live in.

    Owner-scoped, so two people may publish `sales` and neither can reach the
    other's by naming it. The owner is part of the path rather than part of
    the relation because a relation is what a query names, and a query should
    not have to spell somebody's uid to read their table.
    """
    return f"{root.rstrip('/')}/{owner_uid}/{clean_relation(relation)}"


def part_name(index: int) -> str:
    """The file name of one part, zero-padded so sorted order is numeric."""
    if index < 0:
        raise ValueError("a part index is not negative")
    return f"part-{index:0{_PART_DIGITS}d}{PART_SUFFIX}"


def is_part_name(name: str) -> bool:
    """Whether a file in a published table's directory is one of its parts.

    A directory may hold other things — a `_SUCCESS` marker, a note somebody
    left — and reading them as data is how a query returns rows nobody wrote.
    """
    return name.endswith(PART_SUFFIX) and not name.startswith(".")
