# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""The descriptor reads what the three sources say, and says what they cannot
(PLAN_ORCHESTRATOR.md, sections 5.1, O0-08).

`datalayer_core/orchestration/fixtures/agent-sources-v1.json` holds three
agent cards and one ACP registry entry:

- `served` is the document `agent-runtimes` publishes today. It is what
  `fasta2a` writes for an `A2AAgentCard` registered by `app.py` and
  `routes/agents.py`, which pass no skills at all — so a card served by the
  platform right now describes an agent with an empty skill catalogue, and
  that is a fact about the platform rather than about this mapping.
- `conformant` is a full A2A card, carrying every field the descriptor has
  nowhere to keep, so the drop report is exercised rather than asserted.
- `singleUrl` is the other shape of the published A2A card, the one that
  names a single `url` instead of an interface list.
- The ACP entry is what `GET /acp/agents` answers: `AgentInfo.model_dump()`,
  in its own snake case, from `agent_runtimes/routes/acp.py`.

The agentspec half of the item runs against the real catalogue in the
sibling checkout rather than a copy of it, so a spec added there is covered
here the day it lands.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pytest
import yaml

from datalayer_core.orchestration import (
    A2A_CARD_CANNOT_STATE,
    ACP_ENTRY_CANNOT_STATE,
    AGENTSPEC_CANNOT_STATE,
    AgentDescriptor,
    AgentProtocol,
    Availability,
    CostHint,
    DescriptorMapping,
    DescriptorSource,
    LatencyHint,
    TrustLevel,
    WorkerOperation,
    from_acp_agent,
    from_agent_card,
    from_agentspec,
    to_agent_card,
)

SOURCES = json.loads(
    (
        Path(__file__).resolve().parents[1]
        / "orchestration"
        / "fixtures"
        / "agent-sources-v1.json"
    ).read_text()
)

#: The catalogue itself, not a copy of it. `agent-runtimes` is not a
#: dependency of `core` and must never become one — it depends on this
#: package — so the specs are read as the YAML data they are, the way the
#: contents service's transfer fixture is read in this suite.
CATALOGUE = (
    Path(__file__).resolve().parents[5]
    / "ai"
    / "agent-runtimes"
    / "agentspecs"
    / "agentspecs"
    / "agents"
)

#: The three descriptor fields a gap names although the mapping still fills
#: them, and why each is honest. Everything else a mapping reports as a gap
#: must be left at its empty default, which is what the invention test
#: below checks.
PARTLY_FILLED = {
    # A card carries no identity; the caller's is used and the gap says so.
    "descriptor.agentId",
    # Delegate, steer and cancel come from the protocols' mandatory methods;
    # the gap names the operations neither protocol has at all.
    "descriptor.supportedOperations",
    # An ACP entry names no URL; the caller supplies one or the gap stands.
    "descriptor.endpoints[].url",
}


def cards() -> dict[str, Any]:
    """
    The agent cards in the fixture.

    Returns
    -------
    dict[str, Any]
        Each card by the name it is filed under.
    """
    return SOURCES["a2aAgentCards"]


def without(card: dict[str, Any], mapping: DescriptorMapping) -> dict[str, Any]:
    """
    The card with everything the mapping reported as dropped taken out.

    Parameters
    ----------
    card : dict[str, Any]
        The card as it was read.
    mapping : DescriptorMapping
        What reading it produced.

    Returns
    -------
    dict[str, Any]
        What a card written back from the descriptor can be expected to be.
    """
    kept = json.loads(json.dumps(card))
    for gap in mapping.gaps:
        if not gap.field.startswith("agentCard."):
            continue
        _remove(kept, gap.field.split(".")[1:])
    return kept


def _remove(node: Any, steps: list[str]) -> None:
    """
    Take one path out of a document, stepping through lists where it says to.

    Parameters
    ----------
    node : Any
        The document, or a part of it.
    steps : list[str]
        The remaining path.
    """
    step = steps[0]
    if step.endswith("[]"):
        for item in node.get(step[:-2]) or []:
            _remove(item, steps[1:])
        return
    if len(steps) == 1:
        node.pop(step, None)
        return
    if isinstance(node.get(step), dict):
        _remove(node[step], steps[1:])


@pytest.mark.parametrize("name", ["served", "conformant"])
def test_every_agent_card_round_trips_through_the_descriptor(name: str) -> None:
    # Everything the card said and the descriptor kept comes back unchanged,
    # and everything that does not come back was reported as dropped. There
    # is no third category: a field that vanished without a gap record would
    # fail here, which is what makes the gap list trustworthy.
    card = cards()[name]
    mapping = from_agent_card(card, agent_id=f"agent_{name}")
    written = to_agent_card(mapping.descriptor)
    assert written.card == without(card, mapping)


def test_the_card_agent_runtimes_serves_today_has_no_skills() -> None:
    # Not a shortcoming of the mapping: `register_a2a_agent` is called with
    # no skills, so nothing the platform publishes can be discovered by one.
    mapping = from_agent_card(cards()["served"], agent_id="agent_researcher")
    assert mapping.descriptor.skills == []
    assert mapping.descriptor.endpoints[0].url.startswith("https://oss.datalayer.run")
    assert mapping.descriptor.endpoints[0].transport == "JSONRPC"
    assert mapping.descriptor.endpoints[0].protocol_version == "1.0"


def test_a_card_states_none_of_what_the_scheduler_would_like_to_know() -> None:
    mapping = from_agent_card(cards()["conformant"], agent_id="agent_validator")
    reported = {gap.field for gap in mapping.gaps}
    assert {
        "descriptor.capabilities",
        "descriptor.cost",
        "descriptor.latency",
        "descriptor.availability",
        "descriptor.runtime",
        "descriptor.trustLevel",
        "descriptor.dataClassifications",
    } <= reported
    # Reported, and therefore not guessed.
    descriptor = mapping.descriptor
    assert descriptor.capabilities == []
    assert descriptor.cost == CostHint()
    assert descriptor.latency == LatencyHint()
    assert descriptor.availability == Availability()
    assert descriptor.trust_level is TrustLevel.UNTRUSTED
    assert descriptor.data_classifications == []


def test_a_conformant_card_reports_every_field_the_descriptor_drops() -> None:
    mapping = from_agent_card(cards()["conformant"], agent_id="agent_validator")
    reported = {gap.field for gap in mapping.gaps}
    assert {
        "agentCard.provider",
        "agentCard.documentationUrl",
        "agentCard.iconUrl",
        "agentCard.signatures",
        "agentCard.securitySchemes",
        "agentCard.capabilities.pushNotifications",
        "agentCard.capabilities.extendedAgentCard",
        "agentCard.capabilities.extensions",
        "agentCard.supportedInterfaces[].tenant",
        "agentCard.skills[].inputModes",
        "agentCard.skills[].outputModes",
        "agentCard.skills[].securityRequirements",
    } <= reported


def test_the_served_card_reports_only_what_it_actually_carries() -> None:
    # A gap list that names fields the document never had is a gap list
    # nobody reads.
    mapping = from_agent_card(cards()["served"], agent_id="agent_researcher")
    dropped = {gap.field for gap in mapping.gaps if gap.field.startswith("agentCard.")}
    assert dropped == {"agentCard.capabilities.pushNotifications"}


def test_the_scheme_names_are_kept_and_the_definitions_are_not() -> None:
    mapping = from_agent_card(cards()["conformant"], agent_id="agent_validator")
    assert mapping.descriptor.authentication.schemes == ["bearer"]
    assert mapping.descriptor.authentication.scopes == [
        "executions:run",
        "notebooks:read",
    ]
    # A2A never says who the token is for.
    assert mapping.descriptor.authentication.audience is None
    assert "descriptor.authentication.audience" in {gap.field for gap in mapping.gaps}


def test_the_single_url_shape_is_read_and_written_back_as_an_interface() -> None:
    # The published A2A card has had two shapes and both are in the wild, so
    # both are read; only the interface list is written, which is the one
    # `agent-runtimes` serves. The reshaping is reported rather than left
    # for somebody to notice when their card comes back different.
    card = cards()["singleUrl"]
    mapping = from_agent_card(card, agent_id="agent_third_party")
    endpoint = mapping.descriptor.endpoints[0]
    assert endpoint.url == card["url"]
    assert endpoint.transport == card["preferredTransport"]
    assert endpoint.protocol_version == card["protocolVersion"]
    assert "agentCard.url" in {gap.field for gap in mapping.gaps}
    written = to_agent_card(mapping.descriptor).card
    assert written["supportedInterfaces"] == [
        {
            "protocolBinding": card["preferredTransport"],
            "url": card["url"],
            "protocolVersion": card["protocolVersion"],
        }
    ]
    assert "url" not in written


def test_streaming_is_the_only_operation_a_card_declares() -> None:
    streams = from_agent_card(cards()["served"], agent_id="a").descriptor
    silent = from_agent_card(cards()["singleUrl"], agent_id="a").descriptor
    assert WorkerOperation.SUBSCRIBE in streams.supported_operations
    assert WorkerOperation.SUBSCRIBE not in silent.supported_operations
    # Delegate and cancel are A2A's mandatory methods; collect is absent
    # because artifacts are read from the execution store, which is what the
    # A2A adapter refuses the operation for.
    for descriptor in (streams, silent):
        assert WorkerOperation.DELEGATE in descriptor.supported_operations
        assert WorkerOperation.CANCEL in descriptor.supported_operations
        assert WorkerOperation.COLLECT not in descriptor.supported_operations
        assert WorkerOperation.STEER not in descriptor.supported_operations


def test_a_document_that_is_not_an_agent_card_is_refused() -> None:
    for broken in ({"version": "1.0"}, {"name": "x"}):
        with pytest.raises(ValueError, match="is not one"):
            from_agent_card(broken, agent_id="agent_x")
    with pytest.raises(ValueError, match="no identifier"):
        from_agent_card(
            {"name": "x", "version": "1", "skills": [{"name": "unnamed"}]},
            agent_id="agent_x",
        )


def test_a_worker_that_answers_nowhere_has_no_card() -> None:
    # Which is the state every agentspec is in until one is launched.
    descriptor = AgentDescriptor(agent_id="agent_x", name="X")
    with pytest.raises(ValueError, match="answers nowhere"):
        to_agent_card(descriptor)


def test_the_acp_entry_offers_exactly_what_the_acp_adapter_supports() -> None:
    mapping = from_acp_agent(
        SOURCES["acpAgentEntries"]["registered"],
        endpoint="wss://oss.datalayer.run/api/agent-runtimes/v1/acp/ws",
        transport="websocket",
    )
    assert mapping.source is DescriptorSource.ACP_AGENT_ENTRY
    assert set(mapping.descriptor.supported_operations) == {
        WorkerOperation.DELEGATE,
        WorkerOperation.STEER,
        WorkerOperation.CANCEL,
        WorkerOperation.SUBSCRIBE,
    }
    endpoint = mapping.descriptor.endpoints[0]
    assert endpoint.protocol is AgentProtocol.ACP
    assert endpoint.transport == "websocket"
    assert endpoint.protocol_version == "1"


def test_the_acp_booleans_are_permissions_and_not_capabilities() -> None:
    mapping = from_acp_agent(SOURCES["acpAgentEntries"]["registered"])
    assert mapping.descriptor.capabilities == []
    reported = {gap.field for gap in mapping.gaps}
    assert {
        "acpAgent.capabilities.tool_calling",
        "acpAgent.capabilities.code_execution",
        "acpAgent.capabilities.permissions",
        "acpAgent.protocol",
    } <= reported
    # The entry says `ag-ui`, which is how the agent was built, not how the
    # control plane reaches it. Reading it as the endpoint's protocol would
    # delegate over a transport nothing has an adapter for.
    assert mapping.descriptor.endpoints[0].protocol is AgentProtocol.ACP


def test_an_acp_entry_with_no_endpoint_says_the_agent_answers_nowhere() -> None:
    mapping = from_acp_agent(SOURCES["acpAgentEntries"]["registered"])
    assert mapping.descriptor.endpoints[0].url is None
    assert "descriptor.endpoints[].url" in {gap.field for gap in mapping.gaps}


def test_an_entry_without_an_identity_is_refused() -> None:
    with pytest.raises(ValueError, match="is not one"):
        from_acp_agent({"name": "nameless"})


def catalogue() -> list[tuple[str, dict[str, Any]]]:
    """
    Every agentspec in the sibling checkout.

    Returns
    -------
    list[tuple[str, dict[str, Any]]]
        The file name and the spec, in a stable order.
    """
    return [
        (path.name, yaml.safe_load(path.read_text()) or {})
        for path in sorted(CATALOGUE.glob("*.yaml"))
    ]


catalogued = pytest.mark.skipif(
    not CATALOGUE.exists(), reason="the agent-runtimes checkout is not alongside"
)


@catalogued
def test_every_catalogued_agentspec_produces_a_valid_descriptor() -> None:
    specs = catalogue()
    assert len(specs) > 100, "the catalogue was not read"
    for name, spec in specs:
        mapping = from_agentspec(spec)
        assert mapping.source is DescriptorSource.DATALAYER_AGENTSPEC
        assert mapping.descriptor.agent_id == spec["id"], name
        assert mapping.descriptor.name == spec["name"], name
        # The one skill is the spec: its tags and the suggestions written
        # for its chat box are the whole of its catalogue entry.
        assert [skill.id for skill in mapping.descriptor.skills] == [spec["id"]], name
        # Re-validating the wire form is what "valid descriptor" means: the
        # control plane will read it back from a store, not from here.
        assert AgentDescriptor.from_wire(mapping.descriptor.to_wire()) == (
            mapping.descriptor
        ), name


@catalogued
def test_no_catalogued_agentspec_can_be_found_by_capability() -> None:
    # The finding O0-14 should carry: `agents.discover` matches on the
    # dotted capability contract, and not one spec in the catalogue declares
    # one, so today it would match nothing. It is Datalayer's gap to close.
    for name, spec in catalogue():
        mapping = from_agentspec(spec)
        assert mapping.descriptor.capabilities == [], name
        assert "descriptor.capabilities" in {gap.field for gap in mapping.gaps}, name


@catalogued
def test_only_the_specs_naming_a2a_or_acp_can_be_delegated_to() -> None:
    delegatable, refused = [], []
    for name, spec in catalogue():
        mapping = from_agentspec(spec)
        gaps = {gap.field for gap in mapping.gaps}
        if mapping.descriptor.endpoints:
            delegatable.append(name)
            assert "descriptor.endpoints" not in gaps, name
        else:
            refused.append(name)
            assert "descriptor.endpoints" in gaps, name
    # A spec that says `vercel-ai`, `ag-ui` or nothing at all names no
    # protocol work can be delegated over, and produces a descriptor that
    # says so rather than one that looks delegatable and fails at dispatch.
    assert delegatable, "no spec in the catalogue names an orchestration protocol"
    assert refused, "every spec named one, which the catalogue does not"


@catalogued
def test_the_environment_is_the_only_runtime_the_spec_states() -> None:
    for name, spec in catalogue():
        descriptor = from_agentspec(spec).descriptor
        assert descriptor.runtime.environment == spec.get("environment_name"), name
        assert descriptor.runtime.cpu is None, name
        assert descriptor.runtime.memory_mb is None, name


def test_a_datalayer_skill_is_not_a_card_skill() -> None:
    spec = {
        "id": "example-skilled",
        "name": "Example Skilled",
        "description": "An agent with Datalayer skills loaded.",
        "tags": ["example"],
        "protocol": "a2a",
        "skills": ["notebook-style", "pandas-idioms"],
        "suggestions": [{"text": "Clean this notebook up", "summary": "Clean up"}],
    }
    mapping = from_agentspec(spec)
    assert [skill.id for skill in mapping.descriptor.skills] == ["example-skilled"]
    assert mapping.descriptor.skills[0].examples == ["Clean this notebook up"]
    assert "agentspec.skills" in {gap.field for gap in mapping.gaps}


def test_an_agentspec_is_read_in_either_of_its_two_spellings() -> None:
    yaml_form = from_agentspec(
        {"id": "a", "name": "A", "environment_name": "ai-agents-env"}
    )
    api_form = from_agentspec(
        {"id": "a", "name": "A", "environmentName": "ai-agents-env"}
    )
    assert yaml_form.descriptor == api_form.descriptor


def test_a_disabled_spec_is_not_available() -> None:
    assert (
        from_agentspec(
            {"id": "a", "name": "A", "enabled": False}
        ).descriptor.availability.available
        is False
    )


def test_a_budget_is_never_read_as_a_cost_hint() -> None:
    mapping = from_agentspec(
        {"id": "a", "name": "A", "advanced": {"cost_limit": 5.0, "time_limit": 600}}
    )
    assert mapping.descriptor.cost == CostHint()
    assert {"agentspec.advanced", "descriptor.cost"} <= {
        gap.field for gap in mapping.gaps
    }


@pytest.mark.parametrize(
    "mapping",
    [
        from_agent_card(SOURCES["a2aAgentCards"]["conformant"], agent_id="agent_x"),
        from_acp_agent(SOURCES["acpAgentEntries"]["registered"], endpoint="ws://x"),
        from_agentspec({"id": "a", "name": "A", "protocol": "a2a"}),
    ],
    ids=["agent-card", "acp-entry", "agentspec"],
)
def test_a_reported_gap_is_never_also_a_filled_field(
    mapping: DescriptorMapping,
) -> None:
    # The rule the whole item rests on: where a source cannot express a
    # field, the mapping says so and leaves the field alone. The three
    # exceptions are named, and each of them is a value the caller supplied
    # or a protocol's own mandatory method rather than a guess.
    empty = AgentDescriptor(agent_id="", name="").to_wire()
    written = mapping.descriptor.to_wire()
    for gap in mapping.gaps:
        if not gap.field.startswith("descriptor.") or gap.field in PARTLY_FILLED:
            continue
        steps = gap.field.split(".")[1:]
        assert _at(written, steps) == _at(empty, steps), gap.field


def _at(document: Any, steps: list[str]) -> Any:
    """
    The value a path reaches in a wire document.

    Parameters
    ----------
    document : Any
        The document.
    steps : list[str]
        The path, without the leading document name.

    Returns
    -------
    Any
        What is there, or None.
    """
    value = document
    for step in steps:
        if not isinstance(value, dict):
            return None
        value = value.get(step)
    return value


def test_the_gap_tables_are_the_report_o0_14_will_read() -> None:
    # Every table entry names a field and gives a reason; a gap with no
    # reason is a to-do somebody forgot, and the report is only worth
    # reading if none of them are.
    for table in (
        A2A_CARD_CANNOT_STATE,
        ACP_ENTRY_CANNOT_STATE,
        AGENTSPEC_CANNOT_STATE,
    ):
        fields = [field for field, _ in table]
        assert len(fields) == len(set(fields))
        for field, reason in table:
            assert field.startswith("descriptor.")
            assert reason.endswith(".") and len(reason) > 15
