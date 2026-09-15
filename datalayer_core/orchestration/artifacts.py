# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""
Outputs as typed, versioned references (PLAN_ORCHESTRATOR.md, sections 5.4, O0-01).

A result that arrives as a message blob cannot be opened, compared, rerun or
attributed. An artifact names what it is, where it lives and who made it, so
that a report can render it, an eval can score it and a person can find out
six weeks later which attempt of which execution produced the number they
are looking at.

The conflict rule is 19.8's fourth decision: the first attempt to reach
commit wins. A later attempt's artifacts are registered with their own
provenance and marked ``superseded`` — nothing is overwritten and nothing is
silently dropped, because a retry that quietly replaced a committed result
would make two runs of the same execution indistinguishable.
``commit_artifacts`` is that rule, stated once here (O0-10) so that every
store applies it rather than each having its own opinion, and it is a pure
function of what the execution already holds: no clock, no store, no
identifiers minted, so a Solr store and an in-memory one cannot disagree.

Which artifacts are "the same one" is decided by type and name within one
execution — its **slot**. Identifiers cannot do it: an adapter mints a fresh
``artifact_id`` per attempt, so the report a second attempt produces is a
different record with the same name, which is exactly the pair conformance
scenario 13 is about. Two records in one slot with equal content hashes are
two attempts that reached the same answer, and reading that off afterwards
is what the hash is for.

Provenance is a list, not a field. One artifact can be produced by more than
one attempt — a store merges a repeated registration into the record it
already holds — and ``committed_by`` says which of those attempts the
committed version came from, which a list of provenances cannot say on its
own.
"""

from __future__ import annotations

from enum import Enum
from typing import Sequence

from pydantic import Field, model_validator

from datalayer_core.orchestration.base import CanonicalModel, Timestamp


class ArtifactType(str, Enum):
    """What an artifact is, from the nine kinds of section 5.4."""

    NOTEBOOK = "notebook"
    REPORT = "report"
    DATASET = "dataset"
    CELL_OUTPUT = "cell-output"
    FILE = "file"
    EVALUATION = "evaluation"
    EXECUTION_LOG = "execution-log"
    SANDBOX_SNAPSHOT = "sandbox-snapshot"
    JSON = "json"


class ArtifactStatus(str, Enum):
    """Where an artifact stands against the commit rule of 19.8."""

    REGISTERED = "registered"
    COMMITTED = "committed"
    SUPERSEDED = "superseded"


class ArtifactProvenance(CanonicalModel):
    """
    Who produced this artifact, from what, and when.

    Recorded once per attempt that produced the artifact. The content hash
    is what tells two attempts that reached the same answer from two that
    did not.
    """

    execution_id: str
    attempt_id: str
    agent_id: str
    produced_at: Timestamp = Field(description="From the control plane's clock.")
    source_references: list[str] = Field(
        default_factory=list,
        description="The context URIs the attempt was given to produce it.",
    )
    content_hash: str | None = None
    trace_id: str | None = None


class Artifact(CanonicalModel):
    """
    One registered output of an execution.

    ``reference`` is a context URI, so an artifact is itself context: the
    analyst's report is what the reviewer is handed, by name and version,
    without either of them copying it.
    """

    artifact_id: str
    type: ArtifactType
    name: str
    reference: str | None = Field(
        default=None,
        description=(
            "datalayer:<kind>/<uid>@<version> once committed; absent while the "
            "artifact is only registered against the execution."
        ),
    )
    media_type: str | None = None
    size_bytes: int | None = None
    status: ArtifactStatus = ArtifactStatus.REGISTERED
    committed_by: str | None = Field(
        default=None,
        description=(
            "The attempt whose commit made this the execution's result. A "
            "record carrying two provenances cannot say it any other way."
        ),
    )
    superseded_by: str | None = Field(
        default=None,
        description="The artifact that won the commit, when this one lost it.",
    )
    provenance: list[ArtifactProvenance] = Field(default_factory=list)
    summary: str | None = None

    @model_validator(mode="after")
    def _check_status(self) -> "Artifact":
        """
        Keep the status and its two pointers telling the same story.

        A committed artifact names the attempt that committed it, and that
        attempt is one that actually produced it; a superseded one names no
        committer; and neither pointer is set on an artifact that has only
        been registered. The rule is on the model rather than in
        ``commit_artifacts`` because every store writes these records and
        only one of them goes through that function today.

        Returns
        -------
        Artifact
            The same artifact, once it is consistent.

        Raises
        ------
        ValueError
            When the status and the pointers disagree.
        """
        attempts = {record.attempt_id for record in self.provenance}
        if self.status is ArtifactStatus.COMMITTED:
            if self.committed_by is None:
                raise ValueError(
                    f"'{self.artifact_id}' is committed but names no "
                    "attempt that committed it."
                )
            if attempts and self.committed_by not in attempts:
                raise ValueError(
                    f"'{self.artifact_id}' is committed by "
                    f"'{self.committed_by}', which did not produce it."
                )
            if self.superseded_by is not None:
                raise ValueError(
                    f"'{self.artifact_id}' is committed and superseded at "
                    "once; the first commit wins and is not taken back."
                )
        elif self.committed_by is not None:
            raise ValueError(
                f"'{self.artifact_id}' is {self.status.value} and names a "
                "committing attempt; only a committed artifact has one."
            )
        if (
            self.superseded_by is not None
            and self.status is not ArtifactStatus.SUPERSEDED
        ):
            raise ValueError(
                f"'{self.artifact_id}' is {self.status.value} and names the "
                "artifact that superseded it."
            )
        return self


class ArtifactCommit(CanonicalModel):
    """
    What one attempt's commit did to an execution's artifacts (O0-10).

    ``artifacts`` is the whole set afterwards, in the order it was given, so
    a store writes it back without deciding anything itself. ``won`` says
    whether this attempt's outputs are the execution's result: it is true
    for the attempt that committed first and true again when that same
    attempt commits twice, which is what a duplicate delivery looks like
    (section 6.4, conformance scenario 6).
    """

    execution_id: str
    attempt_id: str = Field(description="The attempt asking to commit.")
    winning_attempt_id: str = Field(
        description="The attempt whose artifacts are the execution's result."
    )
    won: bool
    artifacts: list[Artifact] = Field(default_factory=list)


def commit_artifacts(
    artifacts: Sequence[Artifact], *, execution_id: str, attempt_id: str
) -> ArtifactCommit:
    """
    Arbitrate one attempt's commit against what the execution already holds.

    19.8's fourth decision, applied: the first attempt to reach commit wins,
    and a later attempt's artifacts are registered with their provenance and
    marked superseded. Nothing is overwritten — a committed artifact is
    never rewritten, demoted or pointed elsewhere — and nothing is dropped:
    the loser's records stay, with their own provenance, their own content
    hashes and a pointer to the artifact that beat them, which is what makes
    conformance scenario 13 answerable six weeks later instead of merely
    survivable.

    The three cases:

    - **Nothing committed yet.** Every artifact this attempt produced is
      committed to it. Artifacts of other attempts stay registered: they
      belong to an attempt that never reached commit, and deleting them
      would be dropping evidence.
    - **This attempt already committed.** Nothing changes. A commit
      delivered twice must find the first one rather than start a second.
    - **Another attempt committed first.** Every artifact this attempt
      produced that is still registered is superseded, pointing at the
      committed artifact in the same slot — same type, same name — or at
      nothing when the winner produced nothing there, because the commit it
      belonged to is the thing that lost, not the individual output.

    Parameters
    ----------
    artifacts : Sequence[Artifact]
        Every artifact registered against the execution.
    execution_id : str
        The execution they belong to.
    attempt_id : str
        The attempt asking to commit.

    Returns
    -------
    ArtifactCommit
        The set after arbitration, and who holds the result.

    Raises
    ------
    ValueError
        When an artifact was produced by another execution, or when two
        attempts already hold committed artifacts — which this rule cannot
        produce, so a set that shows it was written by something that does
        not apply the rule.
    """
    for artifact in artifacts:
        for record in artifact.provenance:
            if record.execution_id != execution_id:
                raise ValueError(
                    f"'{artifact.artifact_id}' was produced by "
                    f"'{record.execution_id}', not by '{execution_id}'."
                )
    committed = [
        artifact
        for artifact in artifacts
        if artifact.status is ArtifactStatus.COMMITTED
    ]
    # A committed record always names its committer: the model's own
    # validator refuses one that does not, so nothing here has to wonder.
    holders = {
        artifact.committed_by
        for artifact in committed
        if artifact.committed_by is not None
    }
    if len(holders) > 1:
        raise ValueError(
            f"'{execution_id}' has artifacts committed by {sorted(holders)}: "
            "the first commit wins, so only one attempt can hold the result."
        )
    winner = holders.pop() if holders else attempt_id
    won = winner == attempt_id
    slots = {(artifact.type, artifact.name): artifact for artifact in committed}

    settled: list[Artifact] = []
    for artifact in artifacts:
        produced = any(
            record.attempt_id == attempt_id for record in artifact.provenance
        )
        if not produced or artifact.status is not ArtifactStatus.REGISTERED:
            settled.append(artifact)
        elif won:
            settled.append(
                artifact.model_copy(
                    update={
                        "status": ArtifactStatus.COMMITTED,
                        "committed_by": attempt_id,
                    }
                )
            )
        else:
            beaten = slots.get((artifact.type, artifact.name))
            settled.append(
                artifact.model_copy(
                    update={
                        "status": ArtifactStatus.SUPERSEDED,
                        "superseded_by": beaten.artifact_id if beaten else None,
                    }
                )
            )
    return ArtifactCommit(
        execution_id=execution_id,
        attempt_id=attempt_id,
        winning_attempt_id=winner,
        won=won,
        artifacts=settled,
    )
