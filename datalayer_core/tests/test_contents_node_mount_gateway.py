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
    ERROR_INVALID_SOURCE,
    ERROR_INVALID_TARGET,
    ERROR_SECRET_REFUSED,
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
    def test_a_source_is_relative_to_the_shared_filesystem(self):
        assert clean_source("/home/users/01H/") == "home/users/01H"

    def test_a_source_that_walks_out_is_refused(self):
        with pytest.raises(NodeMountGatewayError) as raised:
            clean_source("home/../../etc")
        assert raised.value.code == ERROR_INVALID_SOURCE

    def test_a_target_is_a_relative_path_of_clean_segments(self):
        for bad in ("..", ".", "", "-flag", "/abs", "a//b", "a/../b", "a/.", "a/", "a\\b", "a/b/c/d"):
            with pytest.raises(NodeMountGatewayError) as raised:
                clean_target(bad)
            assert raised.value.code == ERROR_INVALID_TARGET, bad

    def test_an_environments_content_keeps_its_promised_depth(self):
        # `datasets/<name>` and `models/<name>` are where the manual says an
        # Environment's contents are; one segment made them unservable from
        # the pool, and every launch that mounted anything got a cold pod.
        assert clean_target("datasets/aws-opendata-genome-browser") == "datasets/aws-opendata-genome-browser"
        assert clean_target("models/datalayer-oss") == "models/datalayer-oss"
        assert clean_target("a/b/c") == "a/b/c"

    def test_a_handle_the_home_folder_module_produces_is_a_valid_target(self):
        # `sanitize_mount_handle` makes names like `datalayer__research`; a
        # name it produces must not be one this refuses.
        for handle in ("eric", "datalayer__research", "datalayer-01JABC", "a.b_c-d", "_private"):
            assert clean_target(handle) == handle

    def test_a_secret_must_be_a_kubernetes_name(self):
        assert clean_secret("mount-01h") == "mount-01h"
        for bad in ("../../etc/shadow", "Mount-01H", "a" * 300, "-leading"):
            with pytest.raises(NodeMountGatewayError) as raised:
                clean_secret(bad)
            assert raised.value.code == ERROR_SECRET_REFUSED


class TestTheNameOfAMountSet:
    def test_the_same_set_in_any_order_hashes_the_same(self):
        one = [grant(source="home/users/1", target="a"), grant(source="home/teams/2", target="b")]
        assert grants_hash(one) == grants_hash(list(reversed(one)))

    def test_the_mode_the_exec_bit_and_the_secret_are_all_part_of_it(self):
        base = [grant(source="s/x", target="a")]
        for other in (
            [grant(source="s/x", target="a", mode="ro")],
            [grant(source="s/x", target="a", allow_exec=False)],
            [grant(source="s/x", target="a", secret="mount-1")],
        ):
            # Each is a different mount, and the agent must be asked to make
            # it again rather than reporting the previous one as applied.
            assert grants_hash(base) != grants_hash(other)

    def test_two_grants_of_one_name_are_one_grant(self):
        grants = normalize_grants(
            [grant(source="home/users/1", target="eric"), grant(source="home/users/2", target="eric")]
        )
        assert len(grants) == 1 and grants[0]["source"] == "home/users/1"

    def test_an_annotation_round_trips(self):
        grants = [grant(source="home/users/1", target="eric", uid="att-1", kind="files")]
        written = encode_grants(grants)
        assert decode_grants(written) == normalize_grants(grants)
        assert json.loads(written)["hash"] == grants_hash(grants)

    def test_an_unreadable_annotation_is_an_empty_set(self):
        # Not "keep what you had": a pod whose grant cannot be read must not
        # keep mounting what was last understood.
        for value in ("{not json", "", None, "[[", '"a string"'):
            assert decode_grants(value) == []


class TestTheAnswer:
    def test_it_names_the_set_it_answered_for(self):
        grants = [grant(source="home/users/1", target="eric")]
        assert is_ready_for(
            encode_ready(applied_hash=grants_hash(grants), state=STATE_READY, mounted=["eric"]),
            grants,
        )

    def test_an_answer_for_another_set_is_not_an_answer(self):
        grants = [grant(source="home/users/1", target="eric")]
        other = [grant(source="home/users/1", target="nina")]
        assert not is_ready_for(
            encode_ready(applied_hash=grants_hash(other), state=STATE_READY), grants
        )

    def test_degraded_is_an_answer_and_failed_is_not(self):
        grants = [grant(source="home/users/1", target="eric")]
        assert is_ready_for(
            encode_ready(applied_hash=grants_hash(grants), state=STATE_DEGRADED), grants
        )
        assert not is_ready_for(
            encode_ready(applied_hash=grants_hash(grants), state=STATE_FAILED), grants
        )

    def test_no_answer_at_all_is_not_ready(self):
        assert not is_ready_for("", [grant(source="home/users/1", target="eric")])
        assert decode_ready("nonsense") == {"hash": "", "state": "", "mounted": [], "failed": {}}


class TestThePaths:
    def test_both_names_of_one_folder_are_decided_here(self):
        # One folder with two names is the failure `home_folders` exists to
        # prevent; the link between them is named in one place.
        assert gateway_path("eric") == "/mnt/datalayer/eric"
        assert home_link_path("eric") == "/home/jovyan/eric"

    def test_a_path_cannot_be_built_from_a_name_that_was_refused(self):
        with pytest.raises(NodeMountGatewayError):
            home_link_path("../escape")
