# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""
Context as references, never as copies (PLAN_ORCHESTRATOR.md, sections 5.3, O0-01).

A worker is handed the identity of a notebook, a dataset or a sandbox
snapshot, not its bytes. Section 2 asks for it and section 16 measures it:
context bytes copied versus referenced. A reference also survives what a
copy cannot — the same document read twice at the same version is the same
document, and a version that moved is visible rather than silent.

The URI form is decided in 19.8: ``datalayer:<kind>/<uid>@<version>`` over
the uids the platform already mints, for the nine kinds below and no others.
A kind this module does not know is refused here rather than carried to a
resolver that would have to guess.

Two readings of section 5.3 are settled here rather than left to whoever
writes the first resolver. A **cell range** is several ``cell`` references,
not a second addressing scheme inside the uid: 19.8 fixed the URI form, and
a range expressed as ``ntb-7f3a91/3-12`` would be a parser nobody else has.
A **file** is versioned by its content hash — ``datalayer:file/f-1@sha256:…``
— which is what section 5.3 asks for and what makes two workers reading "the
same file" provably reading the same bytes. A **prior execution summary** is
``datalayer:execution/exec_…@<attempt or sequence>``, pinned so that a
summary read twice is the same summary.

Resolution is O0-09 and it is here, but only the half of it that is a
decision. ``resolve_manifest`` takes what a resolver found and says whether
the execution may proceed: a required reference that was denied, that is
gone, or whose pinned version has moved underneath it refuses the whole
manifest, and an optional one that was denied stays in the resolution
carrying its status. Nothing is ever quietly dropped, because a manifest
that silently shrinks is a worker running with less context than the person
who wrote the objective believed. The half that talks to spacer, contents,
runtimes and library is a resolver, and a resolver is transport: this module
imports none, exactly as O0-01 requires. Minting the scoped grant that makes
a reference readable is O1-06 — this phase resolves and validates, it does
not hand anything out.
"""

from __future__ import annotations

import re
from enum import Enum
from typing import NamedTuple, Sequence

from pydantic import Field, field_validator, model_validator

from datalayer_core.orchestration.base import CanonicalModel, Timestamp, instant
from datalayer_core.orchestration.errors import ErrorCode, OrchestrationError


class ContextKind(str, Enum):
    """What a context reference points at."""

    NOTEBOOK = "notebook"
    DOCUMENT = "document"
    CELL = "cell"
    DATASET = "dataset"
    ARTIFACT = "artifact"
    SANDBOX = "sandbox"
    SNAPSHOT = "snapshot"
    FILE = "file"
    EXECUTION = "execution"


class ContextAccess(str, Enum):
    """Whether a worker may only read the reference, or also write it."""

    READ_ONLY = "read-only"
    WRITABLE = "writable"


class ContextMaterialization(str, Enum):
    """Whether the reference is frozen at a version, or the live document."""

    SNAPSHOT = "snapshot"
    LIVE = "live"


class ContextSharing(str, Enum):
    """Who else in the execution tree sees the reference."""

    PRIVATE = "private"
    TREE = "tree"


#: ``datalayer:<kind>/<uid>@<version>``. The version is mandatory: an
#: unversioned reference is how two attempts read two different documents and
#: nobody can tell afterwards which one produced the artifact. A live
#: document names the revision it was handed at, and says it is live through
#: `materialization` rather than by leaving the version off.
CONTEXT_URI = re.compile(
    r"^datalayer:(?P<kind>[a-z]+)/(?P<uid>[A-Za-z0-9][A-Za-z0-9._:-]*)@(?P<version>[^@\s]+)$"
)


class ParsedContextUri(NamedTuple):
    """The three parts of a context URI."""

    kind: ContextKind
    uid: str
    version: str


def format_context_uri(kind: ContextKind, uid: str, version: str) -> str:
    """
    Build the canonical URI for one reference.

    Parameters
    ----------
    kind : ContextKind
        What the reference points at.
    uid : str
        The platform uid of the object.
    version : str
        The version, revision or content hash the worker is to read.

    Returns
    -------
    str
        The URI, in the form 19.8 decided.
    """
    uri = f"datalayer:{ContextKind(kind).value}/{uid}@{version}"
    parse_context_uri(uri)
    return uri


def parse_context_uri(uri: str) -> ParsedContextUri:
    """
    Read a context URI, refusing anything that is not one.

    Parameters
    ----------
    uri : str
        The URI to read.

    Returns
    -------
    ParsedContextUri
        Its kind, uid and version.

    Raises
    ------
    ValueError
        When the URI is malformed or names a kind that is not one of the nine.
    """
    match = CONTEXT_URI.match(uri)
    if match is None:
        raise ValueError(
            f"'{uri}' is not a context reference: "
            "the form is datalayer:<kind>/<uid>@<version>."
        )
    kind = match.group("kind")
    if kind not in {member.value for member in ContextKind}:
        raise ValueError(
            f"'{kind}' is not a context kind: "
            f"{', '.join(member.value for member in ContextKind)}."
        )
    return ParsedContextUri(
        ContextKind(kind), match.group("uid"), match.group("version")
    )


class ContextReference(CanonicalModel):
    """
    One thing a worker is given, and what it may do with it.

    The four declarations are the ones section 5.3 asks for, and each of
    them is a decision somebody has to make: read-only or writable, required
    or optional, frozen or live, this worker's or the tree's. None of them
    has a safe default that suits every case, so the defaults here are the
    narrow ones — read-only, required, frozen, private — and widening is
    deliberate.
    """

    uri: str
    access: ContextAccess = ContextAccess.READ_ONLY
    required: bool = True
    materialization: ContextMaterialization = ContextMaterialization.SNAPSHOT
    sharing: ContextSharing = ContextSharing.PRIVATE
    description: str | None = None

    @field_validator("uri")
    @classmethod
    def _check_uri(cls, value: str) -> str:
        """
        Refuse a reference that is not in the canonical form.

        Parameters
        ----------
        value : str
            The URI as given.

        Returns
        -------
        str
            The same URI, once it is known to be one.
        """
        parse_context_uri(value)
        return value

    @property
    def kind(self) -> ContextKind:
        """
        What this reference points at.

        Returns
        -------
        ContextKind
            The kind named in the URI.
        """
        return parse_context_uri(self.uri).kind

    @property
    def uid(self) -> str:
        """
        The platform uid this reference names.

        Returns
        -------
        str
            The uid named in the URI.
        """
        return parse_context_uri(self.uri).uid

    @property
    def version(self) -> str:
        """
        The version this reference is pinned to.

        Returns
        -------
        str
            The version named in the URI.
        """
        return parse_context_uri(self.uri).version


class ContextManifest(CanonicalModel):
    """
    Everything one execution may reach, and for how long.

    The manifest is the whole of a worker's access: section 9 asks for
    short-lived scoped tokens, and the scope they are minted against is this
    list. A reference that is not here is not reachable, which is why a
    reference the caller may not read is refused when the manifest is built
    rather than quietly dropped from it (O0-09).
    """

    references: list[ContextReference] = Field(default_factory=list)
    scope: str | None = Field(
        default=None,
        description="The IAM scope the per-execution credential is narrowed to.",
    )
    expires_at: Timestamp | None = Field(
        default=None,
        description="Access ends here even if the execution has not.",
    )

    @model_validator(mode="after")
    def _check_manifest(self) -> "ContextManifest":
        """
        Refuse a manifest that cannot be turned into a grant.

        Two references to the same URI are two answers to "what may this
        worker do with it", and nothing downstream is entitled to pick one.
        A scope with no expiry is the long-lived credential section 9 exists
        to prevent, and it is refused here rather than at the moment O1-06
        would have minted it — by then the execution is already running.

        Returns
        -------
        ContextManifest
            The same manifest, once it is one.

        Raises
        ------
        ValueError
            When a URI appears twice, or a scope has no expiry.
        """
        seen: set[str] = set()
        for reference in self.references:
            if reference.uri in seen:
                raise ValueError(
                    f"'{reference.uri}' is in the manifest twice, with two "
                    "answers to what the worker may do with it."
                )
            seen.add(reference.uri)
        if self.scope is not None and self.expires_at is None:
            raise ValueError(
                f"The manifest is scoped to '{self.scope}' with no expiry: "
                "a scoped credential that never ends is the one section 9 "
                "asks not to mint."
            )
        return self


class ReferenceStatus(str, Enum):
    """
    What a resolver found when it looked one reference up (O0-09).

    ``denied`` and ``missing`` are kept apart on purpose. A reference the
    caller may not read is conformance scenario 12 and the answer is to
    refuse the delegation; a reference that is not there is a manifest
    written against something that has been deleted, and telling a person
    "you cannot see it" when it is gone is how an afternoon is lost.
    ``unavailable`` is neither: the service could not answer, and trying
    again may work.
    """

    RESOLVED = "resolved"
    DENIED = "denied"
    MISSING = "missing"
    UNAVAILABLE = "unavailable"


class ReferenceResolution(CanonicalModel):
    """
    What one reference turned out to be, as the resolver reports it.

    ``resolved_version`` is what the platform actually served, which is not
    always what was asked for: a live document moves, and a pinned one that
    moved is a fact somebody has to see rather than a difference to
    reconcile silently.
    """

    uri: str
    status: ReferenceStatus
    resolved_version: str | None = Field(
        default=None,
        description="The version served, which a live reference outgrows.",
    )
    content_hash: str | None = None
    media_type: str | None = None
    size_bytes: int | None = None
    resolved_at: Timestamp | None = None
    error: OrchestrationError | None = Field(
        default=None,
        description="Why it is not resolved, from the service that refused.",
    )


class ManifestResolution(CanonicalModel):
    """
    A manifest held against what the platform actually has (O0-09).

    ``usable`` is the verdict and ``errors`` is every reason it is not.
    They are a list because refusing on the first reason found would send a
    person round the loop once per broken reference.
    """

    references: list[ReferenceResolution] = Field(default_factory=list)
    usable: bool = True
    errors: list[OrchestrationError] = Field(default_factory=list)


def resolve_manifest(
    manifest: ContextManifest,
    resolutions: Sequence[ReferenceResolution],
    *,
    at: str,
) -> ManifestResolution:
    """
    Decide whether an execution may proceed on the context it was given.

    The resolver has already looked everything up; this is the part that
    says what the answers mean, and it is here so that every resolver —
    spacer, contents, the Library, a test double — reaches the same verdict
    from the same facts.

    What refuses a manifest:

    - its access window has closed;
    - a required reference the caller may not read (scenario 12);
    - a required reference that is gone, or that no service could answer for;
    - a required snapshot whose pinned version is not what was served. A
      pin that moved is the failure the whole reference form exists to make
      visible: two attempts would otherwise read two documents and the
      artifact would say nothing about which.

    What does not: any of the same on an *optional* reference. It stays in
    the resolution with the status it was given, so the worker's report
    shows what it did not get rather than the manifest quietly shrinking.

    Parameters
    ----------
    manifest : ContextManifest
        What the execution was given.
    resolutions : Sequence[ReferenceResolution]
        One answer per reference, in any order.
    at : str
        The moment the decision is being taken, RFC 3339.

    Returns
    -------
    ManifestResolution
        The answers, the verdict, and every reason against it.

    Raises
    ------
    ValueError
        When the answers are not one per reference. A resolver that skipped
        a reference or answered about one the manifest does not name is a
        defect, not a policy outcome, and it must not be read as either.
    """
    answers = {resolution.uri: resolution for resolution in resolutions}
    if len(answers) != len(resolutions):
        raise ValueError("The resolver answered about one reference twice.")
    asked = {reference.uri for reference in manifest.references}
    if set(answers) != asked:
        unanswered = sorted(asked - set(answers))
        unasked = sorted(set(answers) - asked)
        raise ValueError(
            "The resolver's answers are not the manifest's references: "
            f"unanswered {unanswered}, not in the manifest {unasked}."
        )

    errors: list[OrchestrationError] = []
    if manifest.expires_at is not None and instant(at) >= instant(manifest.expires_at):
        errors.append(
            OrchestrationError(
                code=ErrorCode.CONTEXT_EXPIRED,
                message=(
                    f"The manifest's access ended at {manifest.expires_at}, "
                    f"and it is {at}."
                ),
                retryable=False,
                source="orchestration.context",
                details={"expiresAt": manifest.expires_at, "at": at},
            )
        )
    for reference in manifest.references:
        failure = _refusal(reference, answers[reference.uri])
        if failure is not None and reference.required:
            errors.append(failure)
    return ManifestResolution(
        references=[answers[reference.uri] for reference in manifest.references],
        usable=not errors,
        errors=errors,
    )


def _refusal(
    reference: ContextReference, resolution: ReferenceResolution
) -> OrchestrationError | None:
    """
    Why this reference would refuse the manifest, if it were required.

    Parameters
    ----------
    reference : ContextReference
        What was asked for.
    resolution : ReferenceResolution
        What the resolver found.

    Returns
    -------
    OrchestrationError | None
        The refusal, or None when the reference is what it was meant to be.
    """
    if resolution.status is ReferenceStatus.DENIED:
        return OrchestrationError(
            code=ErrorCode.PERMISSION_DENIED,
            message=f"The caller may not read {reference.uri}.",
            retryable=False,
            source="orchestration.context",
            details={"uri": reference.uri},
        )
    if resolution.status in {ReferenceStatus.MISSING, ReferenceStatus.UNAVAILABLE}:
        return OrchestrationError(
            code=ErrorCode.CONTEXT_UNAVAILABLE,
            message=f"{reference.uri} is {resolution.status.value}.",
            # A service that could not answer may answer next time; a
            # reference that is gone will not come back.
            retryable=resolution.status is ReferenceStatus.UNAVAILABLE,
            source="orchestration.context",
            details={"uri": reference.uri, "status": resolution.status.value},
        )
    moved = (
        reference.materialization is ContextMaterialization.SNAPSHOT
        and resolution.resolved_version is not None
        and resolution.resolved_version != reference.version
    )
    if moved:
        return OrchestrationError(
            code=ErrorCode.CONFLICT,
            message=(
                f"{reference.uri} is pinned to {reference.version} and "
                f"resolved to {resolution.resolved_version}."
            ),
            retryable=False,
            source="orchestration.context",
            details={
                "uri": reference.uri,
                "pinned": reference.version,
                "resolved": resolution.resolved_version,
            },
        )
    return None
