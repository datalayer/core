# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""The first attempt to reach commit wins, and the later one is kept
(PLAN_ORCHESTRATOR.md, sections 5.4, 19.8 decision 4, O0-10).

Conformance scenario 13, conflicting artifact commit, is
`test_a_later_attempt_is_superseded_and_keeps_everything_it_knew`, and the
shared fixture carries the same scenario as a document both languages read.

The arbitration is a pure function of what the execution already holds — no
clock, no store, no identifier minted — so the in-memory store of O0-04 and
the Solr store of O1-02 cannot come to different conclusions about the same
two attempts.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pytest
from pydantic import ValidationError

from datalayer_core.orchestration import (
    Artifact,
    ArtifactCommit,
    ArtifactProvenance,
    ArtifactStatus,
    ArtifactType,
    commit_artifacts,
)

FIXTURE = (
    Path(__file__).resolve().parents[1]
    / "orchestration"
    / "fixtures"
    / "orchestration-v1.json"
)

EXECUTION = "exec_8d21c4"
FIRST = "attempt_2c40b8"
SECOND = "attempt_5f7e02"


def produced(
    artifact_id: str,
    attempt_id: str,
    *,
    name: str = "notebook-validation-report",
    kind: ArtifactType = ArtifactType.REPORT,
    content_hash: str | None = None,
    execution_id: str = EXECUTION,
) -> Artifact:
    """
    One artifact, registered by one attempt.

    Parameters
    ----------
    artifact_id : str
        Its identifier, which an adapter mints fresh per attempt.
    attempt_id : str
        The attempt that produced it.
    name : str
        What it is called, which with the type is its slot.
    kind : ArtifactType
        Which of the nine types it is.
    content_hash : str | None
        What is in it, when the producer hashed it.
    execution_id : str
        The execution it belongs to.

    Returns
    -------
    Artifact
        The registered artifact.
    """
    return Artifact(
        artifact_id=artifact_id,
        type=kind,
        name=name,
        media_type="application/json",
        provenance=[
            ArtifactProvenance(
                execution_id=execution_id,
                attempt_id=attempt_id,
                agent_id="agent_notebook_validator",
                produced_at="2026-09-09T10:02:48Z",
                source_references=["datalayer:notebook/ntb-7f3a91@rev-42"],
                content_hash=content_hash,
                trace_id="4bf92f3577b34da6a3ce929d0e0e4736",
            )
        ],
    )


def fixture() -> dict[str, Any]:
    """
    The shared canonical fixture.

    Returns
    -------
    dict[str, Any]
        Every record in it.
    """
    return json.loads(FIXTURE.read_text())


def test_section_5_4_names_nine_types_and_the_model_has_exactly_those() -> None:
    assert {kind.value for kind in ArtifactType} == {
        "notebook",
        "report",
        "dataset",
        "cell-output",
        "file",
        "evaluation",
        "execution-log",
        "sandbox-snapshot",
        "json",
    }


def test_provenance_carries_everything_section_5_4_asks_for() -> None:
    record = produced("art_1", FIRST, content_hash="sha256:" + "0" * 64).provenance[0]
    # Producing execution, agent, source context, timestamp, content hash
    # and trace identifier — the six things that let somebody find out six
    # weeks later which attempt produced the number they are looking at.
    assert record.execution_id == EXECUTION
    assert record.attempt_id == FIRST
    assert record.agent_id == "agent_notebook_validator"
    assert record.source_references == ["datalayer:notebook/ntb-7f3a91@rev-42"]
    assert record.produced_at == "2026-09-09T10:02:48Z"
    assert record.content_hash == "sha256:" + "0" * 64
    assert record.trace_id == "4bf92f3577b34da6a3ce929d0e0e4736"


def test_a_timestamp_that_is_not_an_instant_is_refused() -> None:
    with pytest.raises(ValidationError):
        ArtifactProvenance(
            execution_id=EXECUTION,
            attempt_id=FIRST,
            agent_id="a",
            produced_at="just now",
        )


def test_the_first_attempt_to_commit_wins() -> None:
    commit = commit_artifacts(
        [produced("art_1", FIRST)], execution_id=EXECUTION, attempt_id=FIRST
    )
    assert commit.won is True
    assert commit.winning_attempt_id == FIRST
    committed = commit.artifacts[0]
    assert committed.status is ArtifactStatus.COMMITTED
    assert committed.committed_by == FIRST
    assert committed.superseded_by is None


def test_a_later_attempt_is_superseded_and_keeps_everything_it_knew() -> None:
    # Conformance scenario 13. Two attempts, the same slot, different bytes:
    # the first commit stands, the second is kept beside it with its own
    # provenance and its own hash, and it points at what beat it.
    won = commit_artifacts(
        [produced("art_1", FIRST, content_hash="sha256:" + "a" * 64)],
        execution_id=EXECUTION,
        attempt_id=FIRST,
    )
    lost = commit_artifacts(
        [*won.artifacts, produced("art_2", SECOND, content_hash="sha256:" + "b" * 64)],
        execution_id=EXECUTION,
        attempt_id=SECOND,
    )
    assert lost.won is False
    assert lost.winning_attempt_id == FIRST
    winner, loser = lost.artifacts
    assert winner == won.artifacts[0], "the committed artifact was rewritten"
    assert loser.status is ArtifactStatus.SUPERSEDED
    assert loser.superseded_by == "art_1"
    assert loser.committed_by is None
    assert loser.provenance[0].attempt_id == SECOND
    assert loser.provenance[0].content_hash == "sha256:" + "b" * 64


def test_two_attempts_that_agreed_are_readable_as_having_agreed() -> None:
    # Nothing merges them — they are two records — but the equal hashes are
    # what says the retry reached the same answer rather than another one.
    same = "sha256:" + "c" * 64
    won = commit_artifacts(
        [produced("art_1", FIRST, content_hash=same)],
        execution_id=EXECUTION,
        attempt_id=FIRST,
    )
    lost = commit_artifacts(
        [*won.artifacts, produced("art_2", SECOND, content_hash=same)],
        execution_id=EXECUTION,
        attempt_id=SECOND,
    )
    hashes = {
        record.content_hash
        for artifact in lost.artifacts
        for record in artifact.provenance
    }
    assert hashes == {same}
    assert [artifact.status for artifact in lost.artifacts] == [
        ArtifactStatus.COMMITTED,
        ArtifactStatus.SUPERSEDED,
    ]


def test_an_output_the_winner_never_produced_has_nothing_to_point_at() -> None:
    # The commit is what lost, not the individual output, so the record is
    # superseded and names nothing rather than being deleted or committed.
    won = commit_artifacts(
        [produced("art_1", FIRST)], execution_id=EXECUTION, attempt_id=FIRST
    )
    lost = commit_artifacts(
        [
            *won.artifacts,
            produced(
                "art_9", SECOND, name="cell-12-output", kind=ArtifactType.CELL_OUTPUT
            ),
        ],
        execution_id=EXECUTION,
        attempt_id=SECOND,
    )
    extra = lost.artifacts[1]
    assert extra.status is ArtifactStatus.SUPERSEDED
    assert extra.superseded_by is None


def test_a_commit_delivered_twice_finds_the_first_one() -> None:
    # Section 6.4 and conformance scenario 6: duplicate delivery is
    # ordinary, and the second delivery must change nothing at all.
    once = commit_artifacts(
        [produced("art_1", FIRST)], execution_id=EXECUTION, attempt_id=FIRST
    )
    twice = commit_artifacts(once.artifacts, execution_id=EXECUTION, attempt_id=FIRST)
    assert twice.won is True
    assert twice.winning_attempt_id == FIRST
    assert twice.artifacts == once.artifacts


def test_an_attempt_that_never_committed_keeps_its_registrations() -> None:
    # Deleting them would be dropping the only evidence of what the attempt
    # that lost the race actually did.
    settled = commit_artifacts(
        [produced("art_1", FIRST), produced("art_2", SECOND, name="second-report")],
        execution_id=EXECUTION,
        attempt_id=FIRST,
    )
    assert [artifact.status for artifact in settled.artifacts] == [
        ArtifactStatus.COMMITTED,
        ArtifactStatus.REGISTERED,
    ]


def test_a_record_two_attempts_produced_commits_to_the_one_that_asked() -> None:
    # A store merges a repeated registration of the same identifier into the
    # record it already holds, so one record can carry two provenances; only
    # `committed_by` can say whose version was committed.
    both = produced("art_1", FIRST)
    both = both.model_copy(
        update={
            "provenance": [
                *both.provenance,
                produced("art_1", SECOND).provenance[0],
            ]
        }
    )
    commit = commit_artifacts([both], execution_id=EXECUTION, attempt_id=FIRST)
    assert commit.artifacts[0].committed_by == FIRST
    assert [record.attempt_id for record in commit.artifacts[0].provenance] == [
        FIRST,
        SECOND,
    ]


def test_an_artifact_of_another_execution_is_refused() -> None:
    with pytest.raises(ValueError, match="was produced by"):
        commit_artifacts(
            [produced("art_1", FIRST, execution_id="exec_other")],
            execution_id=EXECUTION,
            attempt_id=FIRST,
        )


def test_two_attempts_holding_committed_artifacts_is_a_set_this_rule_cannot_make() -> (
    None
):
    first = commit_artifacts(
        [produced("art_1", FIRST)], execution_id=EXECUTION, attempt_id=FIRST
    ).artifacts[0]
    second = commit_artifacts(
        [produced("art_2", SECOND, name="second-report")],
        execution_id=EXECUTION,
        attempt_id=SECOND,
    ).artifacts[0]
    with pytest.raises(ValueError, match="only one attempt can hold"):
        commit_artifacts(
            [first, second], execution_id=EXECUTION, attempt_id="attempt_3"
        )


def test_a_committed_artifact_names_an_attempt_that_produced_it() -> None:
    artifact = produced("art_1", FIRST)
    with pytest.raises(ValidationError, match="names no attempt"):
        Artifact.from_wire({**artifact.to_wire(), "status": "committed"})
    with pytest.raises(ValidationError, match="did not produce it"):
        Artifact.from_wire(
            {
                **artifact.to_wire(),
                "status": "committed",
                "committedBy": "attempt_nobody",
            }
        )


def test_only_a_committed_artifact_names_a_committer() -> None:
    artifact = produced("art_1", FIRST)
    with pytest.raises(ValidationError, match="only a committed artifact"):
        Artifact.from_wire({**artifact.to_wire(), "committedBy": FIRST})
    with pytest.raises(ValidationError, match="names the artifact that superseded"):
        Artifact.from_wire({**artifact.to_wire(), "supersededBy": "art_2"})


def test_a_commit_is_never_taken_back() -> None:
    artifact = produced("art_1", FIRST)
    with pytest.raises(ValidationError, match="committed and superseded at once"):
        Artifact.from_wire(
            {
                **artifact.to_wire(),
                "status": "committed",
                "committedBy": FIRST,
                "supersededBy": "art_2",
            }
        )


def test_the_shared_fixture_is_scenario_13_in_both_languages() -> None:
    commit = ArtifactCommit.from_wire(fixture()["ArtifactCommit"])
    assert commit.execution_id == EXECUTION
    assert commit.attempt_id == SECOND
    assert commit.winning_attempt_id == FIRST
    assert commit.won is False
    statuses = {artifact.artifact_id: artifact.status for artifact in commit.artifacts}
    assert statuses == {
        "art_9c2f10": ArtifactStatus.COMMITTED,
        "art_4e81b7": ArtifactStatus.SUPERSEDED,
    }
    loser = next(one for one in commit.artifacts if one.artifact_id == "art_4e81b7")
    assert loser.superseded_by == "art_9c2f10"
    # And it is what the function actually produces, not a document that
    # drifted away from it.
    assert (
        commit_artifacts(
            [
                Artifact.from_wire(fixture()["Artifact"]),
                loser.model_copy(
                    update={"status": ArtifactStatus.REGISTERED, "superseded_by": None}
                ),
            ],
            execution_id=EXECUTION,
            attempt_id=SECOND,
        )
        == commit
    )
