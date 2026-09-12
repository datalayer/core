# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""The canonical model reads and writes the shared fixture unchanged
(PLAN_ORCHESTRATOR.md, O0-01).

`datalayer_core/orchestration/fixtures/orchestration-v1.json` is one
document held by two languages: this suite validates it and writes it back,
and `src/api/orchestration/__tests__/fixture.unit.test.ts` checks the same
file against the types generated from these models. A field that exists on
one side and not on the other fails in one of the two places, which is the
whole point of generating rather than writing the TypeScript twice."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pytest
from pydantic import ValidationError

from datalayer_core.orchestration import (
    DEFAULT_MAX_CHILDREN_PER_PARENT,
    DEFAULT_MAX_DEPTH,
    DEFAULT_MAX_EXECUTIONS_PER_TREE,
    DEFAULT_MAX_RETRIES,
    Acknowledgement,
    AgentCardMapping,
    AgentDescriptor,
    AgentsDiscover,
    Artifact,
    ArtifactCommit,
    Attempt,
    CanonicalModel,
    ContextKind,
    ContextManifest,
    ContextReference,
    DelegationLimits,
    DescriptorMapping,
    Execution,
    ExecutionEvent,
    ExecutionsDelegate,
    ManifestResolution,
    OrchestrationError,
    RetryPolicy,
    format_context_uri,
    parse_context_uri,
)

FIXTURE = (
    Path(__file__).resolve().parents[1]
    / "orchestration"
    / "fixtures"
    / "orchestration-v1.json"
)

#: Every model the fixture holds a record for, by the name it is filed under.
MODELS: dict[str, type[CanonicalModel]] = {
    "Acknowledgement": Acknowledgement,
    "AgentCardMapping": AgentCardMapping,
    "AgentDescriptor": AgentDescriptor,
    "AgentsDiscover": AgentsDiscover,
    "Artifact": Artifact,
    "ArtifactCommit": ArtifactCommit,
    "Attempt": Attempt,
    "ContextManifest": ContextManifest,
    "DescriptorMapping": DescriptorMapping,
    "Execution": Execution,
    "ExecutionEvent": ExecutionEvent,
    "ExecutionsDelegate": ExecutionsDelegate,
    "ManifestResolution": ManifestResolution,
    "OrchestrationError": OrchestrationError,
}


def fixture() -> dict[str, Any]:
    return json.loads(FIXTURE.read_text())


@pytest.mark.parametrize("name", sorted(MODELS))
def test_every_record_in_the_fixture_round_trips(name: str) -> None:
    record = fixture()[name]
    assert MODELS[name].from_wire(record).to_wire() == record


def test_the_fixture_holds_exactly_the_records_the_suites_agree_on() -> None:
    # A record added to the fixture without a model is a record the
    # TypeScript suite cannot check either, so it is caught here rather than
    # sitting unread.
    assert sorted(fixture()) == sorted(MODELS)


def test_the_wire_is_camel_case_and_python_reads_either_spelling() -> None:
    execution = Execution.from_wire(fixture()["Execution"])
    assert execution.parent_execution_id == "exec_1a0b73"
    assert "parentExecutionId" in execution.to_wire()
    assert "parent_execution_id" not in execution.to_wire()
    # The same record by field name, which is what Python code writes.
    assert Execution(**execution.model_dump()).to_wire() == execution.to_wire()


def test_a_field_the_model_does_not_declare_is_refused() -> None:
    record = {**fixture()["Execution"], "escalatePrivileges": True}
    with pytest.raises(ValidationError, match="escalatePrivileges"):
        Execution.from_wire(record)


def test_a_context_reference_must_name_a_kind_and_a_version() -> None:
    assert parse_context_uri("datalayer:notebook/ntb-7f3a91@rev-42") == (
        ContextKind.NOTEBOOK,
        "ntb-7f3a91",
        "rev-42",
    )
    for refused in (
        "datalayer:widget/w-1@v1",  # not one of the nine kinds
        "datalayer:notebook/ntb-7f3a91",  # no version
        "notebook/ntb-7f3a91@rev-42",  # no scheme
        "datalayer:notebook/@rev-42",  # no uid
    ):
        with pytest.raises(ValidationError):
            ContextReference(uri=refused)


def test_every_kind_of_context_reference_formats_and_parses() -> None:
    for kind in ContextKind:
        uri = format_context_uri(kind, "uid-1", "v1")
        assert ContextReference(uri=uri).kind is kind


def test_the_default_limits_are_the_ones_the_plan_decided() -> None:
    # 19.8, question 7: depth 3, fan-out 8 per parent and 32 per tree, two
    # retries with exponential backoff.
    limits = DelegationLimits()
    assert (limits.max_depth, DEFAULT_MAX_DEPTH) == (3, 3)
    assert (limits.max_children_per_parent, DEFAULT_MAX_CHILDREN_PER_PARENT) == (8, 8)
    assert (limits.max_executions_per_tree, DEFAULT_MAX_EXECUTIONS_PER_TREE) == (32, 32)
    retry = RetryPolicy()
    assert (retry.max_retries, DEFAULT_MAX_RETRIES) == (2, 2)
    assert retry.backoff_multiplier > 1.0
    assert retry.initial_backoff_seconds < retry.max_backoff_seconds


def test_an_artifact_keeps_every_attempt_that_produced_it() -> None:
    # 19.8, question 4: the first attempt to commit wins, and a later one is
    # registered with its provenance rather than overwriting anything.
    artifact = Artifact.from_wire(fixture()["Artifact"])
    attempts = [provenance.attempt_id for provenance in artifact.provenance]
    assert len(attempts) == len(set(attempts)) == 2
    assert artifact.status == "committed"
    assert artifact.superseded_by is None
    # Two provenances cannot say on their own which attempt's version this
    # is, and the earlier one is the answer: the first commit wins (O0-10).
    assert artifact.committed_by == attempts[0]
