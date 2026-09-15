# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""A manifest is resolved and validated, and nothing is quietly dropped from
it (PLAN_ORCHESTRATOR.md, sections 5.3, O0-09).

Phase 0 resolves references read-only and mints nothing: the scoped grant
that lets a worker actually read one is O1-06. What is decided here is what
a resolver's answers mean — which of them refuse the delegation and which
are recorded and lived with — so that spacer, contents, the Library and a
test double all reach the same verdict from the same facts.

Conformance scenario 12, context permission denial, is
`test_a_required_reference_the_caller_may_not_read_refuses_the_manifest`.
"""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from datalayer_core.orchestration import (
    ContextAccess,
    ContextKind,
    ContextManifest,
    ContextMaterialization,
    ContextReference,
    ContextSharing,
    ErrorCode,
    ManifestResolution,
    ReferenceResolution,
    ReferenceStatus,
    check_rfc3339,
    format_context_uri,
    instant,
    resolve_manifest,
)

NOTEBOOK = "datalayer:notebook/ntb-7f3a91@rev-42"
DATASET = "datalayer:dataset/dst-51ce08@v3"
SANDBOX = "datalayer:sandbox/sbx-0d19aa@snapshot-2"


def manifest(**overrides: object) -> ContextManifest:
    """
    A manifest of one required notebook and one optional dataset.

    Parameters
    ----------
    **overrides : object
        Fields to set on the manifest instead of the defaults.

    Returns
    -------
    ContextManifest
        The manifest.
    """
    return ContextManifest(
        references=[
            ContextReference(uri=NOTEBOOK, sharing=ContextSharing.TREE),
            ContextReference(uri=DATASET, required=False),
        ],
        **overrides,
    )


def found(uri: str, **overrides: object) -> ReferenceResolution:
    """
    A resolver's answer that the reference is there, at the version asked for.

    Parameters
    ----------
    uri : str
        The reference.
    **overrides : object
        Fields to set instead of the defaults.

    Returns
    -------
    ReferenceResolution
        The answer.
    """
    fields: dict[str, object] = {
        "uri": uri,
        "status": ReferenceStatus.RESOLVED,
        "resolved_version": uri.rsplit("@", 1)[1],
        "resolved_at": "2026-09-09T10:00:00Z",
    }
    fields.update(overrides)
    return ReferenceResolution(**fields)


def test_the_four_declarations_of_section_5_3_have_narrow_defaults() -> None:
    # None of the four has a safe default that suits every case, so widening
    # any of them is a decision somebody has to write down.
    reference = ContextReference(uri=NOTEBOOK)
    assert reference.access is ContextAccess.READ_ONLY
    assert reference.required is True
    assert reference.materialization is ContextMaterialization.SNAPSHOT
    assert reference.sharing is ContextSharing.PRIVATE


def test_a_cell_range_is_several_references_and_a_file_is_its_content_hash() -> None:
    # 19.8 fixed the URI form, so section 5.3's "selected ranges" are a list
    # of cell references rather than a second addressing scheme inside the
    # uid that only this platform could parse.
    cells = [
        ContextReference(
            uri=format_context_uri(ContextKind.CELL, f"cell-{n}", "rev-42")
        )
        for n in range(3, 6)
    ]
    assert [reference.uid for reference in cells] == ["cell-3", "cell-4", "cell-5"]
    # A file is versioned by what is in it, which is what makes two workers
    # reading "the same file" provably reading the same bytes.
    digest = "sha256:" + "0" * 64
    reference = ContextReference(
        uri=format_context_uri(ContextKind.FILE, "f-1", digest)
    )
    assert reference.version == digest
    # A prior execution summary is pinned to the attempt it was read at.
    summary = ContextReference(
        uri=format_context_uri(ContextKind.EXECUTION, "exec_8d21c4", "attempt_5f7e02")
    )
    assert summary.kind is ContextKind.EXECUTION


def test_the_same_reference_twice_is_two_answers_and_is_refused() -> None:
    with pytest.raises(ValidationError, match="twice"):
        ContextManifest(
            references=[
                ContextReference(uri=NOTEBOOK),
                ContextReference(uri=NOTEBOOK, access=ContextAccess.WRITABLE),
            ]
        )


def test_the_same_object_at_two_versions_is_two_references() -> None:
    # Comparing a notebook against the revision it was benchmarked at is
    # ordinary, and it is not the duplicate the validator refuses.
    both = ContextManifest(
        references=[
            ContextReference(uri="datalayer:notebook/ntb-7f3a91@rev-41"),
            ContextReference(uri=NOTEBOOK),
        ]
    )
    assert len(both.references) == 2


def test_a_scope_with_no_expiry_is_the_credential_section_9_forbids() -> None:
    with pytest.raises(ValidationError, match="never ends"):
        ContextManifest(references=[], scope="orchestration:exec_8d21c4")


def test_an_expiry_must_be_a_real_instant_with_an_offset() -> None:
    for refused in (
        "2026-09-09T10:00:00",  # no offset: a wall clock in an unnamed place
        "2026-09-09 10:00:00Z",  # not RFC 3339's separator
        "2026-13-09T10:00:00Z",  # no such month
        "2026-09-09T25:00:00Z",  # no such hour
        "tomorrow",
    ):
        with pytest.raises(ValidationError):
            ContextManifest(references=[], scope="s", expires_at=refused)
    for accepted in (
        "2026-09-09T10:00:00Z",
        "2026-09-09T10:00:00+02:00",
        "2026-09-09T10:00:00.123456-05:30",
    ):
        assert check_rfc3339(accepted) == accepted
        assert instant(accepted).tzinfo is not None


def test_a_manifest_everything_answered_is_usable() -> None:
    resolution = resolve_manifest(
        manifest(),
        [found(NOTEBOOK), found(DATASET)],
        at="2026-09-09T10:00:00Z",
    )
    assert resolution.usable is True
    assert resolution.errors == []
    assert [answer.uri for answer in resolution.references] == [NOTEBOOK, DATASET]


def test_a_required_reference_the_caller_may_not_read_refuses_the_manifest() -> None:
    # Conformance scenario 12. The reference is refused, and it is still in
    # the resolution: a manifest that silently shrank would leave a worker
    # running with less context than whoever wrote the objective believed.
    resolution = resolve_manifest(
        manifest(),
        [
            ReferenceResolution(uri=NOTEBOOK, status=ReferenceStatus.DENIED),
            found(DATASET),
        ],
        at="2026-09-09T10:00:00Z",
    )
    assert resolution.usable is False
    assert [error.code for error in resolution.errors] == [ErrorCode.PERMISSION_DENIED]
    assert resolution.errors[0].retryable is False
    assert resolution.errors[0].details == {"uri": NOTEBOOK}
    assert [answer.uri for answer in resolution.references] == [NOTEBOOK, DATASET]


def test_an_optional_reference_that_was_denied_is_kept_and_lived_with() -> None:
    resolution = resolve_manifest(
        manifest(),
        [
            found(NOTEBOOK),
            ReferenceResolution(uri=DATASET, status=ReferenceStatus.DENIED),
        ],
        at="2026-09-09T10:00:00Z",
    )
    assert resolution.usable is True
    assert resolution.references[1].status is ReferenceStatus.DENIED


def test_gone_and_unanswerable_are_told_apart_by_whether_a_retry_could_help() -> None:
    for status, retryable in (
        (ReferenceStatus.MISSING, False),
        (ReferenceStatus.UNAVAILABLE, True),
    ):
        resolution = resolve_manifest(
            manifest(),
            [ReferenceResolution(uri=NOTEBOOK, status=status), found(DATASET)],
            at="2026-09-09T10:00:00Z",
        )
        assert resolution.usable is False
        assert resolution.errors[0].code is ErrorCode.CONTEXT_UNAVAILABLE
        assert resolution.errors[0].retryable is retryable


def test_a_pinned_snapshot_that_moved_underneath_the_execution_is_a_conflict() -> None:
    # The failure the whole reference form exists to make visible: two
    # attempts would otherwise read two documents and the artifact would say
    # nothing about which of them produced it.
    resolution = resolve_manifest(
        manifest(),
        [found(NOTEBOOK, resolved_version="rev-43"), found(DATASET)],
        at="2026-09-09T10:00:00Z",
    )
    assert resolution.usable is False
    assert resolution.errors[0].code is ErrorCode.CONFLICT
    assert resolution.errors[0].details == {
        "uri": NOTEBOOK,
        "pinned": "rev-42",
        "resolved": "rev-43",
    }


def test_a_live_reference_is_allowed_to_have_moved() -> None:
    live = ContextManifest(
        references=[
            ContextReference(
                uri=SANDBOX,
                access=ContextAccess.WRITABLE,
                materialization=ContextMaterialization.LIVE,
            )
        ]
    )
    resolution = resolve_manifest(
        live,
        [found(SANDBOX, resolved_version="snapshot-3")],
        at="2026-09-09T10:00:00Z",
    )
    assert resolution.usable is True
    assert resolution.references[0].resolved_version == "snapshot-3"


def test_a_manifest_whose_window_has_closed_is_refused() -> None:
    scoped = manifest(
        scope="orchestration:exec_8d21c4", expires_at="2026-09-09T11:00:00Z"
    )
    at_the_close = resolve_manifest(
        scoped, [found(NOTEBOOK), found(DATASET)], at="2026-09-09T11:00:00Z"
    )
    assert at_the_close.usable is False
    assert at_the_close.errors[0].code is ErrorCode.CONTEXT_EXPIRED
    # The reference is fine and the caller may read it: what ended is the
    # window this execution was allowed to, which is why the code is not
    # `context_unavailable`.
    assert at_the_close.errors[0].retryable is False
    still_open = resolve_manifest(
        scoped, [found(NOTEBOOK), found(DATASET)], at="2026-09-09T10:59:59Z"
    )
    assert still_open.usable is True


def test_every_reason_is_reported_and_not_only_the_first() -> None:
    scoped = manifest(scope="s", expires_at="2026-09-09T09:00:00Z")
    resolution = resolve_manifest(
        scoped,
        [
            ReferenceResolution(uri=NOTEBOOK, status=ReferenceStatus.DENIED),
            found(DATASET),
        ],
        at="2026-09-09T10:00:00Z",
    )
    assert [error.code for error in resolution.errors] == [
        ErrorCode.CONTEXT_EXPIRED,
        ErrorCode.PERMISSION_DENIED,
    ]


def test_a_resolver_must_answer_about_exactly_the_manifest() -> None:
    # A resolver that skipped a reference or answered about one nobody asked
    # for is a defect, and reading either as a policy outcome would turn a
    # bug into a silently smaller manifest.
    with pytest.raises(ValueError, match="unanswered"):
        resolve_manifest(manifest(), [found(NOTEBOOK)], at="2026-09-09T10:00:00Z")
    with pytest.raises(ValueError, match="not in the manifest"):
        resolve_manifest(
            manifest(),
            [found(NOTEBOOK), found(DATASET), found(SANDBOX)],
            at="2026-09-09T10:00:00Z",
        )
    with pytest.raises(ValueError, match="twice"):
        resolve_manifest(
            manifest(),
            [found(NOTEBOOK), found(DATASET), found(DATASET)],
            at="2026-09-09T10:00:00Z",
        )


def test_the_resolution_round_trips_the_way_every_canonical_record_does() -> None:
    resolution = resolve_manifest(
        manifest(), [found(NOTEBOOK), found(DATASET)], at="2026-09-09T10:00:00Z"
    )
    assert ManifestResolution.from_wire(resolution.to_wire()) == resolution
