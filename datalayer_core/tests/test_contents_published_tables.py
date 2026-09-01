# Copyright (c) 2023-2026 Datalayer, Inc.
# Datalayer License

"""The published-table layout, as Contents and the client see it.

The Data Server implements the same shape independently — it depends on
`httpx` and `pyarrow` and nothing else on purpose — so this side pins what it
produces and `dataservers/tests/test_published_table_layout.py` pins that the
connector accepts exactly that.
"""

from __future__ import annotations

import pytest

from datalayer_core.contents_published_tables import (
    PART_SUFFIX,
    clean_relation,
    is_part_name,
    part_name,
    relation_directory,
)


def test_a_table_is_owner_scoped():
    # Two people may publish `sales` and neither reaches the other's by naming
    # it. The owner is in the path, not in the relation, because a relation is
    # what a query names and a query should not spell somebody's uid.
    mine = relation_directory("/published", "01ME", "sales")
    theirs = relation_directory("/published", "01YOU", "sales")
    assert mine != theirs
    assert mine.endswith("/01ME/sales")


def test_the_root_is_taken_as_given_without_a_trailing_slash():
    assert relation_directory("/published/", "01ME", "sales") == "/published/01ME/sales"


@pytest.mark.parametrize("bad", ["../secrets", "a/b", "", ".", "..", "-rf", "/etc"])
def test_a_name_that_is_not_one_segment_is_refused_where_it_is_written(bad: str):
    # Refused here rather than on the Data Server: a name that only fails
    # there is a table that looked published and never was.
    with pytest.raises(ValueError):
        clean_relation(bad)


def test_parts_sort_in_numeric_order():
    # They are read in sorted order, so `part-10` must not sort before
    # `part-2` — otherwise a query without an ORDER BY returns rows in an
    # order nobody chose.
    names = [part_name(index) for index in (0, 2, 10, 100)]
    assert sorted(names) == names


def test_only_parts_are_data():
    assert is_part_name(part_name(0))
    # A directory may hold a marker or a note somebody left; reading those as
    # data is how a query returns rows nobody wrote.
    assert not is_part_name("_SUCCESS")
    assert not is_part_name("notes.txt")
    assert not is_part_name(".hidden" + PART_SUFFIX)


def test_a_negative_part_is_a_mistake():
    with pytest.raises(ValueError):
        part_name(-1)
