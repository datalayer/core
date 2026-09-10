# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""
The protocol-neutral agent descriptor and its mappings
(PLAN_ORCHESTRATOR.md, sections 5.1, O0-01, O0-08).

What a worker is, said once, so that the scheduler can compare an A2A agent
card, an ACP registry entry and a Datalayer agentspec without knowing which
of the three it is holding. The mappings to those three — ``from_agent_card``,
``to_agent_card``, ``from_acp_agent`` and ``from_agentspec`` — are O0-08 and
land in this module, beside the fields they fill, because a mapping kept
away from its target is a mapping that stops matching it.

They take and return plain documents, never a foreign library's types. This
package may not import fasta2a, the ACP SDK or ``agent_runtimes`` — the
first two are the adapters' business (section 7) and the third depends on
this one — so an agent card is the JSON served at
``/.well-known/agent-card.json``, an ACP registry entry is what
``GET /acp/agents`` answers, and an agentspec is the YAML in
``agent-runtimes/agentspecs``. Those documents are the contract; a Python
class on either side of them is not.

Every mapping says what it could not carry. ``MappingGap`` is the record of
it, and the rule the four functions keep is that **a field a source cannot
express is reported, never guessed**: a descriptor with an invented cost
hint or an invented trust level is worse than one that admits it does not
know, because a scheduler cannot tell the two apart. The gaps are also the
raw material for the protocol gap report of O0-14 — computed from the
mappings rather than written down beside them and left to rot.

MCP is not an orchestration protocol and is absent from ``AgentProtocol``.
It is how tools, notebooks and data reach an agent, not how work is
delegated to one, and putting it in the same list is how a tool call ends up
being scheduled as if it were a worker.
"""

from __future__ import annotations

from enum import Enum
from typing import Any, Mapping

from pydantic import Field

from datalayer_core.orchestration.base import CanonicalModel


class AgentProtocol(str, Enum):
    """How the control plane speaks to a worker."""

    A2A = "a2a"
    ACP = "acp"
    DATALAYER = "datalayer"


class TrustLevel(str, Enum):
    """How much of what a worker says may be believed."""

    UNTRUSTED = "untrusted"
    VERIFIED = "verified"
    INTERNAL = "internal"


class DataClassification(str, Enum):
    """The sensitivity of the data an execution may touch."""

    PUBLIC = "public"
    INTERNAL = "internal"
    CONFIDENTIAL = "confidential"
    RESTRICTED = "restricted"


class WorkerOperation(str, Enum):
    """A lifecycle operation a worker supports, named as section 6.2 names it.

    The bare verb of an ``executions.*`` command. A worker that does not
    declare an operation is not asked for it, and an adapter that cannot
    perform one reports it unsupported rather than answering as if it had.
    """

    DELEGATE = "delegate"
    STEER = "steer"
    PAUSE = "pause"
    RESUME = "resume"
    CANCEL = "cancel"
    CHECKPOINT = "checkpoint"
    COLLECT = "collect"
    TERMINATE = "terminate"
    SUBSCRIBE = "subscribe"


class AgentSkill(CanonicalModel):
    """One thing a worker can do, in the shape an A2A agent card gives it."""

    id: str
    name: str
    description: str = ""
    tags: list[str] = Field(default_factory=list)
    examples: list[str] = Field(default_factory=list)


class ProtocolEndpoint(CanonicalModel):
    """One way to reach a worker: a protocol and where it answers."""

    protocol: AgentProtocol
    url: str | None = Field(
        default=None,
        description="Absent for a worker the control plane launches itself.",
    )
    transport: str | None = Field(
        default=None,
        description=(
            "How the protocol is carried, as the source names it: stdio, "
            "websocket or http for ACP, a binding such as JSONRPC for A2A."
        ),
    )
    protocol_version: str | None = Field(
        default=None,
        description=(
            "The version of the protocol this endpoint speaks, not of the "
            "agent. Both A2A interfaces and ACP agents declare one."
        ),
    )


class AgentAuthentication(CanonicalModel):
    """What a caller must present to be let in."""

    schemes: list[str] = Field(
        default_factory=list,
        description="bearer, oauth2 or none, as the agent card names them.",
    )
    audience: str | None = None
    scopes: list[str] = Field(default_factory=list)


class RuntimeRequirements(CanonicalModel):
    """What the worker needs to run, when the control plane provisions it."""

    cpu: float | None = None
    gpu: int | None = None
    memory_mb: int | None = None
    region: str | None = None
    environment: str | None = Field(
        default=None,
        description="A Datalayer runtime environment name, when it runs on one.",
    )


class CostHint(CanonicalModel):
    """What the worker is expected to cost, for scheduling, never for billing."""

    currency: str = "USD"
    per_execution: float | None = None
    per_input_token: float | None = None
    per_output_token: float | None = None


class LatencyHint(CanonicalModel):
    """How long the worker is expected to take, in milliseconds."""

    acceptance_p50_ms: int | None = None
    completion_p50_ms: int | None = None
    completion_p95_ms: int | None = None


class Availability(CanonicalModel):
    """How much of the worker there is."""

    max_concurrent_executions: int | None = None
    queue_depth: int | None = None
    available: bool = True


class AgentDescriptor(CanonicalModel):
    """
    One worker, described the same way whatever it speaks.

    ``capabilities`` is what the scheduler matches on — the dotted names of
    section 6.2's ``agents.discover``, such as ``notebook.validate`` — while
    ``skills`` is the human-facing catalogue an agent card carries. They are
    kept apart because a card's skills are written for a person and a
    capability is a contract.
    """

    agent_id: str
    name: str
    description: str = ""
    version: str = "0.0.1"
    skills: list[AgentSkill] = Field(default_factory=list)
    capabilities: list[str] = Field(default_factory=list)
    endpoints: list[ProtocolEndpoint] = Field(default_factory=list)
    input_content_types: list[str] = Field(default_factory=list)
    output_content_types: list[str] = Field(default_factory=list)
    supported_operations: list[WorkerOperation] = Field(default_factory=list)
    authentication: AgentAuthentication = Field(default_factory=AgentAuthentication)
    data_classifications: list[DataClassification] = Field(default_factory=list)
    trust_level: TrustLevel = TrustLevel.UNTRUSTED
    runtime: RuntimeRequirements = Field(default_factory=RuntimeRequirements)
    cost: CostHint = Field(default_factory=CostHint)
    latency: LatencyHint = Field(default_factory=LatencyHint)
    availability: Availability = Field(default_factory=Availability)


class DescriptorSource(str, Enum):
    """Which document a descriptor was read from."""

    A2A_AGENT_CARD = "a2a-agent-card"
    ACP_AGENT_ENTRY = "acp-agent-entry"
    DATALAYER_AGENTSPEC = "datalayer-agentspec"


class MappingGap(CanonicalModel):
    """
    One thing a mapping could not carry, and why (O0-08).

    ``field`` is a dotted path prefixed by the document it belongs to, so
    that the two directions are never confused: ``descriptor.cost`` is a
    descriptor field the source has no way of stating, and
    ``agentCard.provider`` is a source field the descriptor has nowhere to
    keep. ``[]`` marks a step through a list, as in
    ``agentCard.skills[].inputModes``.

    A gap is reported for a descriptor field whenever the source form cannot
    express it at all, and for a source field only when this particular
    document actually carries one — claiming to have dropped something that
    was never there would make the report useless for O0-14.
    """

    field: str
    reason: str


class DescriptorMapping(CanonicalModel):
    """A descriptor read from a foreign document, and what was lost on the way."""

    source: DescriptorSource
    descriptor: AgentDescriptor
    gaps: list[MappingGap] = Field(default_factory=list)


class AgentCardMapping(CanonicalModel):
    """
    A descriptor written out as an A2A agent card, and what A2A cannot hold.

    ``card`` is the JSON document, ready to be served at
    ``/.well-known/agent-card.json``: this package builds the document and
    never the ``fasta2a`` type, because the document is what a third-party
    A2A client reads.
    """

    card: dict[str, Any] = Field(description="The agent card, as it is served.")
    gaps: list[MappingGap] = Field(default_factory=list)


#: Descriptor fields an A2A agent card has no way of stating. Reported on
#: every ``from_agent_card`` call, because the absence is in the form rather
#: than in one document: a card describes what an agent can be asked for,
#: not what it costs, how fast it is, how much of it there is, or whether
#: anybody should believe it.
A2A_CARD_CANNOT_STATE: tuple[tuple[str, str], ...] = (
    (
        "descriptor.agentId",
        "An agent card carries no identifier of its own — it is found at a "
        "URL, and the URL is the identity. The caller's agent_id is used.",
    ),
    (
        "descriptor.capabilities",
        "A card's skills are written for a person to read; the dotted "
        "capability names agents.discover matches on are a contract, and "
        "reading one out of the other would be inventing it.",
    ),
    (
        "descriptor.supportedOperations",
        "A2A declares only streaming. Delegate and cancel are taken from "
        "the protocol's mandatory methods, and steer, pause, resume, "
        "checkpoint and terminate do not exist in A2A at all (19.8, "
        "decision 5).",
    ),
    (
        "descriptor.authentication.audience",
        "A2A names security schemes and their scopes, never the audience a "
        "token has to be minted for.",
    ),
    (
        "descriptor.dataClassifications",
        "A2A has no data classification. A card's signatures say who wrote "
        "it, not what it may be shown.",
    ),
    (
        "descriptor.trustLevel",
        "Trust is the reader's decision, not the card's claim. A signed "
        "card could raise it, and verifying a signature belongs where keys "
        "are held, not here.",
    ),
    (
        "descriptor.runtime",
        "A card describes an agent already answering somewhere; what it "
        "would need to be provisioned is not part of it.",
    ),
    ("descriptor.cost", "A2A states no price."),
    ("descriptor.latency", "A2A states no latency expectation."),
    (
        "descriptor.availability",
        "A2A states no concurrency limit and no queue depth; a worker that "
        "is full answers that it is full, one task at a time.",
    ),
)

#: Card fields the descriptor has nowhere to keep. Reported only when the
#: card in hand actually carries one — a gap list that names what was never
#: there is a gap list nobody reads.
A2A_CARD_NOT_KEPT: tuple[tuple[str, str], ...] = (
    (
        "agentCard.provider",
        "Who publishes an agent is a catalogue question; the descriptor "
        "answers scheduling questions.",
    ),
    (
        "agentCard.documentationUrl",
        "Documentation is for people, not for the scheduler.",
    ),
    ("agentCard.iconUrl", "An icon is for people, not for the scheduler."),
    (
        "agentCard.signatures",
        "A JWS over the card is verified where the keys are, and the result "
        "of verifying it is trustLevel, which A2A cannot state either.",
    ),
    (
        "agentCard.securitySchemes",
        "Only the names of the schemes are kept, not their definitions: the "
        "descriptor says what a caller must present, and the details of how "
        "to obtain it belong to whoever mints the token.",
    ),
    (
        "agentCard.securityRequirements",
        "The scheme names and every scope are kept, but not which scheme "
        "requires which scopes, nor which alternatives satisfy the "
        "requirement. A card cannot be rebuilt from the flattened form "
        "without inventing the structure back.",
    ),
    (
        "agentCard.capabilities.pushNotifications",
        "A2A push notifications are a transport arrangement between a "
        "client and a worker. Datalayer executions stream through the "
        "control plane's own events (6.2, executions.subscribe).",
    ),
    (
        "agentCard.capabilities.extendedAgentCard",
        "The extended card is fetched with credentials and would produce a "
        "second, fuller descriptor rather than a field on this one.",
    ),
    (
        "agentCard.capabilities.extensions",
        "Extension URIs are negotiated per attempt by the adapter (7.2); a "
        "descriptor that carried them would be deciding for it.",
    ),
    (
        "agentCard.supportedInterfaces[].tenant",
        "A tenant identifier is part of the credential the control plane "
        "mints for an execution, not part of what the worker is.",
    ),
    (
        "agentCard.skills[].inputModes",
        "The descriptor's content types are the agent's, not the skill's; "
        "per-skill modes would have to be matched per capability, which "
        "agents.discover does not do.",
    ),
    (
        "agentCard.skills[].outputModes",
        "The descriptor's content types are the agent's, not the skill's.",
    ),
    (
        "agentCard.skills[].securityRequirements",
        "Per-skill security would be a per-capability grant; the manifest "
        "and the per-execution credential are where that is decided (O1-06).",
    ),
)

#: Descriptor fields an ACP registry entry has no way of stating. The entry
#: is what ``GET /acp/agents`` answers: an identity, a few booleans and a
#: protocol version.
ACP_ENTRY_CANNOT_STATE: tuple[tuple[str, str], ...] = (
    (
        "descriptor.skills",
        "An ACP entry has no skill catalogue. What an ACP agent can do is "
        "learnt by asking it, in a session, which is not discovery.",
    ),
    (
        "descriptor.capabilities",
        "The entry's booleans say what an agent may do inside a session; "
        "the dotted capability names are what work can be delegated to it, "
        "and neither can be read out of the other.",
    ),
    (
        "descriptor.inputContentTypes",
        "ACP types each content block as it is sent and declares nothing in advance.",
    ),
    (
        "descriptor.outputContentTypes",
        "ACP types each content block as it is sent and declares nothing in advance.",
    ),
    (
        "descriptor.authentication",
        "ACP declares its auth methods in the initialize response, not in "
        "the registry entry, so a caller cannot know what to present until "
        "it has already connected.",
    ),
    (
        "descriptor.dataClassifications",
        "ACP has no data classification.",
    ),
    (
        "descriptor.trustLevel",
        "An entry is self-reported; nothing in it can raise trust.",
    ),
    (
        "descriptor.runtime",
        "The entry describes an agent already registered, not what it would "
        "need to be provisioned.",
    ),
    ("descriptor.cost", "ACP states no price."),
    ("descriptor.latency", "ACP states no latency expectation."),
    (
        "descriptor.availability",
        "ACP states no concurrency limit; a session runs one turn at a time "
        "and the entry does not say how many sessions there may be.",
    ),
)

#: Entry fields the descriptor has nowhere to keep.
ACP_ENTRY_NOT_KEPT: tuple[tuple[str, str], ...] = (
    (
        "acpAgent.protocol",
        "This names the transport the agent itself was built for — ag-ui, "
        "vercel-ai, a2a — not how the control plane reaches it. It is "
        "reached over ACP because it is in the ACP registry, and mapping "
        "this field onto the endpoint's protocol would delegate over a "
        "transport nothing has an adapter for.",
    ),
    (
        "acpAgent.capabilities.tool_calling",
        "Whether an agent may call tools is a permission the execution's "
        "policy grants (5.2), not a capability the scheduler matches.",
    ),
    (
        "acpAgent.capabilities.code_execution",
        "Whether an agent may run code is a permission, not a capability.",
    ),
    (
        "acpAgent.capabilities.file_access",
        "Whether an agent may read files is a permission, and which files "
        "is the context manifest's answer (5.3), not a boolean's.",
    ),
    (
        "acpAgent.capabilities.permissions",
        "The named permissions belong to Policy.permissions, where they are "
        "granted per execution and can be narrowed for a child.",
    ),
)

#: Descriptor fields a Datalayer agentspec has no way of stating. An
#: agentspec is a template for launching an agent, and most of what a
#: scheduler wants to know is only true once one is running.
AGENTSPEC_CANNOT_STATE: tuple[tuple[str, str], ...] = (
    (
        "descriptor.capabilities",
        "No agentspec declares a capability contract, so no spec in the "
        "catalogue can be found by agents.discover on capability. This is "
        "the gap O0-14 should carry: it is ours to close, not a protocol's.",
    ),
    (
        "descriptor.supportedOperations",
        "A spec names no lifecycle operations. What a worker supports is "
        "the adapter's answer for the protocol it is reached over, and it "
        "is reported on the execution when the attempt is dispatched.",
    ),
    (
        "descriptor.inputContentTypes",
        "A spec states no input media types.",
    ),
    (
        "descriptor.outputContentTypes",
        "A spec's output formats are product names — Dashboard, PDF, "
        "Spreadsheet — not media types, and guessing one from the other is "
        "how a worker is handed something it cannot read.",
    ),
    (
        "descriptor.authentication",
        "A spec is launched by the platform with the caller's own identity; "
        "it declares no scheme for somebody else to present.",
    ),
    (
        "descriptor.dataClassifications",
        "A spec states no data classification.",
    ),
    (
        "descriptor.trustLevel",
        "Being in the catalogue is not a verification. Raising trust for "
        "everything Datalayer ships would make the field mean nothing.",
    ),
    (
        "descriptor.runtime.cpu",
        "The environment name implies a shape; the spec does not state it, "
        "and the environment catalogue is what knows.",
    ),
    (
        "descriptor.runtime.gpu",
        "The environment name implies a shape; the spec does not state it.",
    ),
    (
        "descriptor.runtime.memoryMb",
        "The environment name implies a shape; the spec does not state it.",
    ),
    (
        "descriptor.runtime.region",
        "A spec is not pinned to a region; the runtime it is launched on is.",
    ),
    ("descriptor.cost", "A spec states no price."),
    ("descriptor.latency", "A spec states no latency expectation."),
    (
        "descriptor.availability.maxConcurrentExecutions",
        "A spec is a template: how many runtimes of it may exist at once is "
        "a quota question, and quotas belong to IAM.",
    ),
)

#: Agentspec fields the descriptor has nowhere to keep.
AGENTSPEC_NOT_KEPT: tuple[tuple[str, str], ...] = (
    (
        "agentspec.skills",
        "These are Datalayer skill identifiers — prompt fragments the "
        "runtime loads into the agent — not units of capability a caller "
        "can ask for. The descriptor's skills are the card's kind.",
    ),
    (
        "agentspec.tools",
        "Tools are what the agent may reach, which is Policy.permissions "
        "per execution, not part of what the agent is.",
    ),
    (
        "agentspec.mcp_servers",
        "MCP is how tools and data reach an agent, not how work is "
        "delegated to one; it is deliberately absent from AgentProtocol.",
    ),
    (
        "agentspec.model",
        "Which model runs the loop is the agent's own business and changes "
        "under it; a scheduler that matched on it would pin a worker to a "
        "model version nobody meant to promise.",
    ),
    (
        "agentspec.output",
        "The formats are product names rather than media types; see "
        "descriptor.outputContentTypes.",
    ),
    (
        "agentspec.advanced",
        "cost_limit and time_limit are budgets — Policy.budget on the "
        "execution (5.2) — and a budget read as a cost hint would tell the "
        "scheduler the worker costs exactly what it is allowed to spend.",
    ),
    (
        "agentspec.authorization_policy",
        "A policy name is enforced by IAM against the caller, not presented "
        "by the caller as a credential.",
    ),
    (
        "agentspec.subagents",
        "A spec's subagents are its own delegation, configured in the "
        "runtime. An orchestration tree is the control plane's, and 19.8 "
        "decision 2 is that a worker does not create children itself.",
    ),
)


def _gaps(entries: tuple[tuple[str, str], ...]) -> list[MappingGap]:
    """
    Turn a gap table into records.

    Parameters
    ----------
    entries : tuple[tuple[str, str], ...]
        Field and reason, in the order they are declared.

    Returns
    -------
    list[MappingGap]
        One record per entry.
    """
    return [MappingGap(field=field, reason=reason) for field, reason in entries]


def _reached(document: Mapping[str, Any], path: str) -> list[Any]:
    """
    Every value a dotted path reaches in a document.

    The first segment names the document and is skipped; ``[]`` steps
    through a list. Absent and null are the same thing here: a key the
    document does not carry and a key it carries as null are both nothing to
    keep.

    Parameters
    ----------
    document : Mapping[str, Any]
        The document to walk.
    path : str
        The path, as a gap record spells it.

    Returns
    -------
    list[Any]
        The values found, which is empty when the path reaches nothing.
    """
    found: list[Any] = [document]
    for step in path.split(".")[1:]:
        listed = step.endswith("[]")
        key = step[:-2] if listed else step
        reached: list[Any] = []
        for node in found:
            if not isinstance(node, Mapping):
                continue
            value = node.get(key)
            if value is None:
                continue
            if listed and isinstance(value, list):
                reached.extend(value)
            elif not listed:
                reached.append(value)
        found = reached
    return found


def _not_kept(
    document: Mapping[str, Any], table: tuple[tuple[str, str], ...]
) -> list[MappingGap]:
    """
    The gaps for the source fields this document actually carries.

    Parameters
    ----------
    document : Mapping[str, Any]
        The source document.
    table : tuple[tuple[str, str], ...]
        Every field of that form the descriptor has nowhere to keep.

    Returns
    -------
    list[MappingGap]
        One record per field the document carries.
    """
    return [
        MappingGap(field=field, reason=reason)
        for field, reason in table
        if _reached(document, field)
    ]


def from_agent_card(card: Mapping[str, Any], *, agent_id: str) -> DescriptorMapping:
    """
    Read an A2A agent card as a descriptor (section 7.1, O0-08).

    The card is the JSON document served at
    ``/.well-known/agent-card.json``. Two shapes of it are in the wild and
    both are read: an agent that lists ``supportedInterfaces``, which is
    what ``agent-runtimes`` serves today, and one that names a single ``url``
    with a preferred transport. Only the interface list is written back by
    ``to_agent_card``, so a card read in the second shape says so in its
    gaps rather than round-tripping into a different document silently.

    ``delegate`` and ``cancel`` are taken from A2A's mandatory methods —
    ``message/send`` and ``tasks/cancel`` are not optional and so are not
    declared — and ``subscribe`` from the card's streaming capability.
    ``collect`` is deliberately absent although ``tasks/get`` exists:
    artifacts are read from the execution store, where they were registered
    as they arrived, which is the same reason the A2A adapter refuses the
    operation.

    Parameters
    ----------
    card : Mapping[str, Any]
        The agent card document.
    agent_id : str
        The identity the control plane knows this worker by. A card carries
        none of its own, and inventing one from the URL would make the same
        agent two agents the day it moves.

    Returns
    -------
    DescriptorMapping
        The descriptor, and everything the card could not say or the
        descriptor could not keep.

    Raises
    ------
    ValueError
        When the card is missing a field A2A requires, or names a skill
        with no identifier.
    """
    for required in ("name", "version"):
        if not card.get(required):
            raise ValueError(f"An agent card without '{required}' is not one.")
    gaps = _gaps(A2A_CARD_CANNOT_STATE) + _not_kept(card, A2A_CARD_NOT_KEPT)

    skills: list[AgentSkill] = []
    for skill in card.get("skills") or []:
        if not isinstance(skill, Mapping) or not skill.get("id"):
            raise ValueError("A skill in the agent card has no identifier.")
        skills.append(
            AgentSkill(
                id=str(skill["id"]),
                name=str(skill.get("name") or skill["id"]),
                description=str(skill.get("description") or ""),
                tags=[str(tag) for tag in skill.get("tags") or []],
                examples=[str(example) for example in skill.get("examples") or []],
            )
        )

    interfaces = card.get("supportedInterfaces") or []
    endpoints = [
        ProtocolEndpoint(
            protocol=AgentProtocol.A2A,
            url=str(interface["url"]),
            transport=_text(interface.get("protocolBinding")),
            protocol_version=_text(interface.get("protocolVersion")),
        )
        for interface in interfaces
        if isinstance(interface, Mapping) and interface.get("url")
    ]
    if not endpoints and card.get("url"):
        endpoints = [
            ProtocolEndpoint(
                protocol=AgentProtocol.A2A,
                url=str(card["url"]),
                transport=_text(card.get("preferredTransport")),
                protocol_version=_text(card.get("protocolVersion")),
            )
        ]
        gaps.append(
            MappingGap(
                field="agentCard.url",
                reason=(
                    "Read as the agent's one interface. A card written from "
                    "a descriptor names its interfaces in supportedInterfaces, "
                    "so this document does not round-trip key for key."
                ),
            )
        )
    if not endpoints:
        gaps.append(
            MappingGap(
                field="descriptor.endpoints",
                reason=(
                    "This card names nowhere the agent answers: it has "
                    "neither supportedInterfaces nor url, and nothing can be "
                    "delegated to it until it does."
                ),
            )
        )

    capabilities = card.get("capabilities") or {}
    operations = [WorkerOperation.DELEGATE, WorkerOperation.CANCEL]
    if capabilities.get("streaming"):
        operations.append(WorkerOperation.SUBSCRIBE)

    return DescriptorMapping(
        source=DescriptorSource.A2A_AGENT_CARD,
        descriptor=AgentDescriptor(
            agent_id=agent_id,
            name=str(card["name"]),
            description=str(card.get("description") or ""),
            version=str(card["version"]),
            skills=skills,
            endpoints=endpoints,
            input_content_types=[
                str(mode) for mode in card.get("defaultInputModes") or []
            ],
            output_content_types=[
                str(mode) for mode in card.get("defaultOutputModes") or []
            ],
            supported_operations=operations,
            authentication=_card_authentication(card),
        ),
        gaps=gaps,
    )


def _text(value: Any) -> str | None:
    """
    A document's value as a string, or nothing when it holds nothing.

    Parameters
    ----------
    value : Any
        Whatever the document had.

    Returns
    -------
    str | None
        The value as text, or None.
    """
    return None if value is None else str(value)


def _card_authentication(card: Mapping[str, Any]) -> AgentAuthentication:
    """
    What an agent card says a caller must present.

    A card declares its schemes in ``securitySchemes`` and which of them a
    caller has to satisfy, with which scopes, in ``securityRequirements``.
    The descriptor keeps the names and the scopes; the definitions stay in
    the card, which is where a client that has to obtain a token reads them.

    Parameters
    ----------
    card : Mapping[str, Any]
        The agent card document.

    Returns
    -------
    AgentAuthentication
        The schemes and scopes, empty when the card requires nothing.
    """
    schemes = card.get("securitySchemes")
    requirements = card.get("securityRequirements") or []
    named = sorted(schemes) if isinstance(schemes, Mapping) else []
    scopes: set[str] = set()
    for requirement in requirements:
        if not isinstance(requirement, Mapping):
            continue
        if not named:
            named = sorted(set(named) | set(requirement))
        for granted in requirement.values():
            scopes.update(str(scope) for scope in granted or [])
    return AgentAuthentication(schemes=named, scopes=sorted(scopes))


def to_agent_card(descriptor: AgentDescriptor) -> AgentCardMapping:
    """
    Write a descriptor out as an A2A agent card (section 7.1, O0-08).

    The card is the interoperability surface: a third-party A2A client reads
    it and has never heard of Datalayer. So everything the descriptor knows
    that A2A has no field for is dropped here, and the drop is reported
    rather than smuggled into ``metadata`` — a private field in a standard
    document is how a standard stops meaning anything.

    ``tags`` is written on every skill because A2A requires it, even where
    the descriptor has none; ``examples`` is written only when there are
    some, because A2A does not require it and an empty list would claim the
    agent has no example rather than that nobody wrote one.

    Parameters
    ----------
    descriptor : AgentDescriptor
        The worker to describe.

    Returns
    -------
    AgentCardMapping
        The card document, and what A2A could not hold.

    Raises
    ------
    ValueError
        When the descriptor names no A2A endpoint with a URL. A card says
        where an agent answers; a worker the control plane has yet to launch
        has no answer to give, which is exactly the state every agentspec is
        in until one is running.
    """
    interfaces = [
        endpoint
        for endpoint in descriptor.endpoints
        if endpoint.protocol is AgentProtocol.A2A and endpoint.url
    ]
    if not interfaces:
        raise ValueError(
            f"'{descriptor.agent_id}' has no A2A endpoint with a URL, so "
            "there is no agent card to write: a card is where an agent "
            "answers, and this one answers nowhere yet."
        )
    gaps: list[MappingGap] = []
    supported: list[dict[str, Any]] = []
    for endpoint in interfaces:
        interface: dict[str, Any] = {}
        if endpoint.transport is not None:
            interface["protocolBinding"] = endpoint.transport
        else:
            gaps.append(
                MappingGap(
                    field="agentCard.supportedInterfaces[].protocolBinding",
                    reason=(
                        f"The endpoint at {endpoint.url} names no transport, "
                        "and A2A's binding cannot be guessed from a URL."
                    ),
                )
            )
        interface["url"] = endpoint.url
        if endpoint.protocol_version is not None:
            interface["protocolVersion"] = endpoint.protocol_version
        supported.append(interface)

    skills: list[dict[str, Any]] = []
    for skill in descriptor.skills:
        written: dict[str, Any] = {
            "id": skill.id,
            "name": skill.name,
            "description": skill.description,
            "tags": list(skill.tags),
        }
        if skill.examples:
            written["examples"] = list(skill.examples)
        skills.append(written)

    for field, reason in _CARD_CANNOT_HOLD:
        if _held(descriptor, field):
            gaps.append(MappingGap(field=field, reason=reason))

    return AgentCardMapping(
        card={
            "name": descriptor.name,
            "description": descriptor.description,
            "version": descriptor.version,
            "supportedInterfaces": supported,
            "capabilities": {
                "streaming": WorkerOperation.SUBSCRIBE
                in descriptor.supported_operations
            },
            "defaultInputModes": list(descriptor.input_content_types),
            "defaultOutputModes": list(descriptor.output_content_types),
            "skills": skills,
        },
        gaps=gaps,
    )


#: What the descriptor knows and an agent card has no field for. Reported
#: only when the descriptor in hand actually holds it, so the gap list of a
#: card written from a card says nothing was lost.
_CARD_CANNOT_HOLD: tuple[tuple[str, str], ...] = (
    (
        "descriptor.agentId",
        "The card is found at a URL and identifies itself by that; the "
        "Datalayer identity does not travel with it.",
    ),
    (
        "descriptor.capabilities",
        "A2A has no capability contract beside its skills, and writing the "
        "dotted names in as skills would make a scheduling contract look "
        "like something a person asked for.",
    ),
    (
        "descriptor.authentication",
        "The descriptor keeps scheme names and scopes, not the scheme "
        "definitions A2A's securitySchemes requires, so a card cannot be "
        "rebuilt from them without inventing the missing halves.",
    ),
    (
        "descriptor.dataClassifications",
        "A2A has no data classification field.",
    ),
    (
        "descriptor.trustLevel",
        "Trust is the reader's decision; a claim to be trusted in a card "
        "read by a stranger is worth nothing.",
    ),
    ("descriptor.runtime", "A2A has no runtime requirements field."),
    ("descriptor.cost", "A2A has no cost field."),
    ("descriptor.latency", "A2A has no latency field."),
    (
        "descriptor.availability",
        "A2A has no availability field; a worker that is full says so when "
        "it is asked.",
    ),
)


#: A descriptor holding nothing but an identity, to tell a field somebody
#: filled in from one that is only its own default.
_EMPTY_DESCRIPTOR_FIELDS: dict[str, Any] = AgentDescriptor(
    agent_id="", name=""
).to_wire()


def _held(descriptor: AgentDescriptor, field: str) -> bool:
    """
    Whether the descriptor actually carries something under a gap's path.

    Compared against an empty descriptor rather than against emptiness, so
    that a submodel of nothing but its own defaults — the currency on a cost
    hint nobody priced — is not reported as something that was lost.

    Parameters
    ----------
    descriptor : AgentDescriptor
        The descriptor being written out.
    field : str
        The gap path, whose first segment names the descriptor.

    Returns
    -------
    bool
        True when this descriptor says more than an empty one does.
    """
    steps = field.split(".")[1:]
    return _at(descriptor.to_wire(), steps) != _at(_EMPTY_DESCRIPTOR_FIELDS, steps)


def _at(document: Mapping[str, Any], steps: list[str]) -> Any:
    """
    The value a path reaches in a wire document.

    Parameters
    ----------
    document : Mapping[str, Any]
        The document to walk.
    steps : list[str]
        The path, without the leading document name.

    Returns
    -------
    Any
        What is there, or None.
    """
    value: Any = document
    for step in steps:
        if not isinstance(value, Mapping):
            return None
        value = value.get(step)
    return value


def from_acp_agent(
    agent: Mapping[str, Any],
    *,
    endpoint: str | None = None,
    transport: str | None = None,
) -> DescriptorMapping:
    """
    Read an ACP registry entry as a descriptor (section 7.4, O0-08).

    The entry is what ``GET /acp/agents`` answers: the ``AgentInfo`` the ACP
    route keeps for each registered agent, in its own snake case. It says
    who the agent is and what it may do inside a session, and almost nothing
    a scheduler would like to know — which is the finding, not an oversight
    of this mapping.

    ``delegate``, ``steer`` and ``cancel`` come from ACP's mandatory
    methods: ``session/new``, ``session/prompt`` and ``session/cancel`` are
    not optional and so are not declared. ``subscribe`` comes from the
    entry's streaming flag. The four the ACP adapter refuses — pause,
    resume, checkpoint, terminate — are absent here for the same reasons it
    gives, so a descriptor never promises an operation the adapter would
    have to refuse.

    Parameters
    ----------
    agent : Mapping[str, Any]
        The registry entry.
    endpoint : str | None
        Where the agent answers. The entry does not say — it is registered
        in a server, not published at a URL — so the caller, which reached
        the registry, is the one that knows.
    transport : str | None
        stdio, websocket or http: ACP has the choice and the entry does not
        record which one was used.

    Returns
    -------
    DescriptorMapping
        The descriptor, and everything the entry could not say.

    Raises
    ------
    ValueError
        When the entry has no identifier or no name.
    """
    for required in ("id", "name"):
        if not agent.get(required):
            raise ValueError(f"An ACP registry entry without '{required}' is not one.")
    gaps = _gaps(ACP_ENTRY_CANNOT_STATE) + _not_kept(agent, ACP_ENTRY_NOT_KEPT)

    capabilities = agent.get("capabilities") or {}
    operations = [
        WorkerOperation.DELEGATE,
        WorkerOperation.STEER,
        WorkerOperation.CANCEL,
    ]
    if capabilities.get("streaming"):
        operations.append(WorkerOperation.SUBSCRIBE)
    if endpoint is None:
        gaps.append(
            MappingGap(
                field="descriptor.endpoints[].url",
                reason=(
                    "The entry names no URL and none was supplied, so this "
                    "descriptor says the agent exists without saying where. "
                    "Nothing can be delegated to it until the caller says."
                ),
            )
        )

    return DescriptorMapping(
        source=DescriptorSource.ACP_AGENT_ENTRY,
        descriptor=AgentDescriptor(
            agent_id=str(agent["id"]),
            name=str(agent["name"]),
            description=str(agent.get("description") or ""),
            version=str(agent.get("version") or "0.0.1"),
            endpoints=[
                ProtocolEndpoint(
                    protocol=AgentProtocol.ACP,
                    url=endpoint,
                    transport=transport,
                    protocol_version=_text(agent.get("protocol_version")),
                )
            ],
            supported_operations=operations,
        ),
        gaps=gaps,
    )


#: The agentspec fields this mapping reads whose wire spelling differs from
#: the YAML's. The specs are written in snake case and served through
#: pydantic aliases in camel case, and a mapping that read only one of the
#: two would work against the catalogue and fail against the API, or the
#: other way round.
_AGENTSPEC_ALIASES: Mapping[str, str] = {
    "environment_name": "environmentName",
    "authorization_policy": "authorizationPolicy",
    "mcp_servers": "mcpServers",
}


def from_agentspec(spec: Mapping[str, Any]) -> DescriptorMapping:
    """
    Read a Datalayer agentspec as a descriptor (section 5.1, O0-08).

    An agentspec is a template for launching an agent, not an agent
    answering somewhere, and that is what most of its gaps come down to.
    Two of them are worth reading before this mapping is trusted for
    scheduling:

    - No spec in the catalogue declares a capability contract, so
      ``agents.discover`` cannot match any of them on capability. That is
      Datalayer's own gap to close, not a protocol's.
    - A spec's ``protocol`` names how a client talks to the agent, and only
      ``a2a`` and ``acp`` are protocols work can be delegated over. A spec
      that says ``ag-ui`` or ``vercel-ai``, or says nothing, produces a
      descriptor with no endpoint and a gap saying so, rather than one that
      looks delegatable and fails at dispatch.

    The one skill is the spec itself: an agentspec describes a single agent
    and does not enumerate skills the way a card does, so its tags and the
    suggestions written for its chat box are what the catalogue entry is.
    The spec's own ``skills`` field is something else entirely and is
    reported as not kept.

    Parameters
    ----------
    spec : Mapping[str, Any]
        The agentspec, in either spelling.

    Returns
    -------
    DescriptorMapping
        The descriptor, and everything the spec could not say.

    Raises
    ------
    ValueError
        When the spec has no identifier or no name.
    """
    for required in ("id", "name"):
        if not spec.get(required):
            raise ValueError(f"An agentspec without '{required}' is not one.")
    gaps = _gaps(AGENTSPEC_CANNOT_STATE) + [
        MappingGap(field=field, reason=reason)
        for field, reason in AGENTSPEC_NOT_KEPT
        if _spelled(spec, field.split(".", 1)[1])
    ]

    protocol = str(spec.get("protocol") or "").strip().lower()
    endpoints: list[ProtocolEndpoint] = []
    if protocol in {member.value for member in AgentProtocol}:
        endpoints = [ProtocolEndpoint(protocol=AgentProtocol(protocol))]
    else:
        gaps.append(
            MappingGap(
                field="descriptor.endpoints",
                reason=(
                    f"This spec's protocol is {protocol or 'unset'}, which "
                    "names no protocol work can be delegated over. Only a2a "
                    "and acp have adapters (O0-06, O0-07)."
                ),
            )
        )

    examples = [
        str(suggestion.get("text"))
        for suggestion in spec.get("suggestions") or []
        if isinstance(suggestion, Mapping) and suggestion.get("text")
    ]
    identifier = str(spec["id"])
    return DescriptorMapping(
        source=DescriptorSource.DATALAYER_AGENTSPEC,
        descriptor=AgentDescriptor(
            agent_id=identifier,
            name=str(spec["name"]),
            description=str(spec.get("description") or ""),
            version=str(spec.get("version") or "0.0.1"),
            skills=[
                AgentSkill(
                    id=identifier,
                    name=str(spec["name"]),
                    description=str(spec.get("description") or ""),
                    tags=[str(tag) for tag in spec.get("tags") or []],
                    examples=examples,
                )
            ],
            endpoints=endpoints,
            runtime=RuntimeRequirements(
                environment=_text(_spelled(spec, "environment_name"))
            ),
            availability=Availability(available=bool(spec.get("enabled", True))),
        ),
        gaps=gaps,
    )


def _spelled(spec: Mapping[str, Any], field: str) -> Any:
    """
    An agentspec field, in whichever of its two spellings it was written.

    Parameters
    ----------
    spec : Mapping[str, Any]
        The agentspec.
    field : str
        The snake case name.

    Returns
    -------
    Any
        The value, or None when the spec states neither spelling.
    """
    if field in spec:
        return spec[field]
    return spec.get(_AGENTSPEC_ALIASES.get(field, field))
