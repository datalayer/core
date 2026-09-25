# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

# Copyright (c) 2023-2026 Datalayer, Inc.
# Datalayer License

"""The Node Mount Gateway wire format, where it now lives.

The Operator writes these annotations through `datalayer_common` and a node
agent in another distribution reads them through `clouder`. Both import this,
so the rules below are the rules once rather than twice — which is why they
are tested here rather than on each side.
"""

from __future__ import annotations

import json

import pytest

from datalayer_core.contents_node_mount_gateway import (
    DATASET_KIND,
    DELIVERY_MATERIALIZE,
    ERROR_INVALID_SOURCE,
    ERROR_INVALID_TARGET,
    ERROR_SECRET_REFUSED,
    GIT_KIND,
    KIND_DELIVERIES,
    STATE_DEGRADED,
    STATE_FAILED,
    STATE_READY,
    NodeMountGatewayError,
    clean_secret,
    clean_source,
    clean_target,
    decode_grants,
    decode_ready,
    encode_grants,
    encode_ready,
    gateway_path,
    grant,
    grants_hash,
    home_link_path,
    is_ready_for,
    normalize_grants,
)


class TestWhatMayBeGranted:
    def test_a_source_is_relative_to_the_shared_filesystem(self) -> None:
        assert clean_source("/home/users/01H/") == "home/users/01H"

    def test_a_source_that_walks_out_is_refused(self) -> None:
        with pytest.raises(NodeMountGatewayError) as raised:
            clean_source("home/../../etc")
        assert raised.value.code == ERROR_INVALID_SOURCE

    def test_a_target_is_a_relative_path_of_clean_segments(self) -> None:
        for bad in (
            "..",
            ".",
            "",
            "-flag",
            "/abs",
            "a//b",
            "a/../b",
            "a/.",
            "a/",
            "a\\b",
            "a/b/c/d",
        ):
            with pytest.raises(NodeMountGatewayError) as raised:
                clean_target(bad)
            assert raised.value.code == ERROR_INVALID_TARGET, bad

    def test_an_environments_content_keeps_its_promised_depth(self) -> None:
        # `datasets/<name>` and `models/<name>` are where the manual says an
        # Environment's contents are; one segment made them unservable from
        # the pool, and every launch that mounted anything got a cold pod.
        assert (
            clean_target("datasets/aws-opendata-genome-browser")
            == "datasets/aws-opendata-genome-browser"
        )
        assert clean_target("models/datalayer-oss") == "models/datalayer-oss"
        assert clean_target("a/b/c") == "a/b/c"

    def test_a_handle_the_home_folder_module_produces_is_a_valid_target(self) -> None:
        # `sanitize_mount_handle` makes names like `datalayer__research`; a
        # name it produces must not be one this refuses.
        for handle in (
            "eric",
            "datalayer__research",
            "datalayer-01JABC",
            "a.b_c-d",
            "_private",
        ):
            assert clean_target(handle) == handle

    def test_a_secret_must_be_a_kubernetes_name(self) -> None:
        assert clean_secret("mount-01h") == "mount-01h"
        for bad in ("../../etc/shadow", "Mount-01H", "a" * 300, "-leading"):
            with pytest.raises(NodeMountGatewayError) as raised:
                clean_secret(bad)
            assert raised.value.code == ERROR_SECRET_REFUSED


class TestADatasetIsMaterialized:
    """A Dataset revision, produced on the node rather than mounted.

    "Mount a Dataset" sounds like a bucket mount and cannot be one. A
    Dataset's bytes are managed objects keyed
    `…/objects/{path}/versions/{version_uid}`, so one revision is a *set* of
    version keys and not a prefix — a filesystem over them would show every
    file as a directory holding a file named after a uid, and there would be
    nothing to scope a session credential to. So it is materialized, the way
    a Git checkout is.
    """

    def test_it_is_produced_on_the_node(self) -> None:
        assert KIND_DELIVERIES[DATASET_KIND] == DELIVERY_MATERIALIZE

    def test_it_is_named_by_uid_and_pinned_by_revision(self) -> None:
        made = grant(
            source="01M27Z7KTZ629XA9H26BJFNJ5H",
            target="titanic",
            mode="ro",
            uid="ca-1",
            kind=DATASET_KIND,
            revision="01M27Z7MP9Y8H1MF5PA2RF6J0H",
            allow_exec=False,
        )
        assert made["source"] == "01M27Z7KTZ629XA9H26BJFNJ5H"
        assert made["revision"] == "01M27Z7MP9Y8H1MF5PA2RF6J0H"

    def test_a_uid_is_not_run_through_the_repository_rule(self) -> None:
        """The rule materialize used to have for everything. A uid is not a
        URL, and refusing every Dataset is what sharing it would do."""
        assert clean_source("01M27Z7KTZ629XA9H26BJFNJ5H", DATASET_KIND) == (
            "01M27Z7KTZ629XA9H26BJFNJ5H"
        )

    def test_an_unpinned_dataset_is_refused(self) -> None:
        """Already true of every materialized grant, asserted for this one
        because it is the whole reason a Dataset attachment exists: a Dataset
        that changes under a running analysis is not a Dataset."""
        with pytest.raises(NodeMountGatewayError) as raised:
            grant(source="01M27Z7KTZ629XA9H26BJFNJ5H", target="t", kind=DATASET_KIND)
        assert raised.value.code == ERROR_INVALID_SOURCE

    def test_a_source_that_is_not_a_uid_is_refused(self) -> None:
        for bad in (
            "../../etc",
            "https://example.com/repo",
            "a/b",
            "",
            "sh ort",
            "x" * 65,
        ):
            with pytest.raises(NodeMountGatewayError) as raised:
                clean_source(bad, DATASET_KIND)
            assert raised.value.code == ERROR_INVALID_SOURCE, bad

    def test_a_git_source_is_still_a_url(self) -> None:
        """The branch is on the kind, not on the delivery, so widening it for
        Datasets must not have widened it for checkouts."""
        with pytest.raises(NodeMountGatewayError):
            clean_source("01M27Z7KTZ629XA9H26BJFNJ5H", GIT_KIND)


class TestTheNameOfAMountSet:
    def test_the_same_set_in_any_order_hashes_the_same(self) -> None:
        one = [
            grant(source="home/users/1", target="a"),
            grant(source="home/teams/2", target="b"),
        ]
        assert grants_hash(one) == grants_hash(list(reversed(one)))

    def test_the_mode_the_exec_bit_and_the_secret_are_all_part_of_it(self) -> None:
        base = [grant(source="s/x", target="a")]
        for other in (
            [grant(source="s/x", target="a", mode="ro")],
            [grant(source="s/x", target="a", allow_exec=False)],
            [grant(source="s/x", target="a", secret="mount-1")],
        ):
            # Each is a different mount, and the agent must be asked to make
            # it again rather than reporting the previous one as applied.
            assert grants_hash(base) != grants_hash(other)

    def test_two_grants_of_one_name_are_one_grant(self) -> None:
        grants = normalize_grants(
            [
                grant(source="home/users/1", target="eric"),
                grant(source="home/users/2", target="eric"),
            ]
        )
        assert len(grants) == 1 and grants[0]["source"] == "home/users/1"

    def test_an_annotation_round_trips(self) -> None:
        grants = [
            grant(source="home/users/1", target="eric", uid="att-1", kind="files")
        ]
        written = encode_grants(grants)
        assert decode_grants(written) == normalize_grants(grants)
        assert json.loads(written)["hash"] == grants_hash(grants)

    def test_an_unreadable_annotation_is_an_empty_set(self) -> None:
        # Not "keep what you had": a pod whose grant cannot be read must not
        # keep mounting what was last understood.
        for value in ("{not json", "", None, "[[", '"a string"'):
            assert decode_grants(value) == []


class TestTheAnswer:
    def test_it_names_the_set_it_answered_for(self) -> None:
        grants = [grant(source="home/users/1", target="eric")]
        assert is_ready_for(
            encode_ready(
                applied_hash=grants_hash(grants), state=STATE_READY, mounted=["eric"]
            ),
            grants,
        )

    def test_an_answer_for_another_set_is_not_an_answer(self) -> None:
        grants = [grant(source="home/users/1", target="eric")]
        other = [grant(source="home/users/1", target="nina")]
        assert not is_ready_for(
            encode_ready(applied_hash=grants_hash(other), state=STATE_READY), grants
        )

    def test_degraded_is_an_answer_and_failed_is_not(self) -> None:
        grants = [grant(source="home/users/1", target="eric")]
        assert is_ready_for(
            encode_ready(applied_hash=grants_hash(grants), state=STATE_DEGRADED), grants
        )
        assert not is_ready_for(
            encode_ready(applied_hash=grants_hash(grants), state=STATE_FAILED), grants
        )

    def test_no_answer_at_all_is_not_ready(self) -> None:
        assert not is_ready_for("", [grant(source="home/users/1", target="eric")])
        assert decode_ready("nonsense") == {
            "hash": "",
            "state": "",
            "mounted": [],
            "failed": {},
        }


class TestThePaths:
    def test_both_names_of_one_folder_are_decided_here(self) -> None:
        # One folder with two names is the failure `home_folders` exists to
        # prevent; the link between them is named in one place.
        assert gateway_path("eric") == "/mnt/datalayer/eric"
        assert home_link_path("eric") == "/home/datalayer/eric"

    def test_a_path_cannot_be_built_from_a_name_that_was_refused(self) -> None:
        with pytest.raises(NodeMountGatewayError):
            home_link_path("../escape")
