# Copyright (c) 2023-2026 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""
The MCP session, call and approval records of the Contents service.

The models are the generated ones, re-exported under this name; what this
module adds is what the contract does not define — the status unions as
standalone types, which call statuses are terminal, and the reading of a
call's artifacts:

- a *session* is the scoped connection Contents opens to an MCP source on a
  caller's behalf — the tools, resources and domains it may reach, the
  policies that apply, and when it ends. The server credential stays with
  Contents; a session is what a sandbox or an agent holds instead;
- a *call* is one tool invocation through a session. Its arguments are kept
  redacted and hashed; a call that moves bytes ends in artifacts, each a
  Transfer, object or version rather than bytes in the answer;
- an *approval* is the decision a call waits on when the source's policy is
  ``explicit``.
"""

from __future__ import annotations

from typing import Literal

from .generated import (
    McpApproval,
    McpApprovalDecision,
    McpApprovalList,
    McpArtifactView,
    McpCall,
    McpCallCreate,
    McpCallError,
    McpCallList,
    McpCallResult,
    McpHealth,
    McpResourceView,
    McpSession,
    McpSessionCreate,
    McpSessionList,
    McpToolManifest,
    McpToolView,
)

McpCallStatus = Literal[
    "pending-approval",
    "approved",
    "denied",
    "running",
    "succeeded",
    "failed",
    "refused",
]
McpApprovalStatus = Literal["pending", "approved", "rejected", "expired", "consumed"]
McpSessionStatus = Literal["active", "revoked", "expired"]

#: A call the service has finished with, one way or another.
TERMINAL_CALL_STATUSES: frozenset[str] = frozenset(
    {"denied", "succeeded", "failed", "refused"}
)


def is_call_terminal(call: McpCall) -> bool:
    return call.status in TERMINAL_CALL_STATUSES


def call_artifacts(call: McpCall) -> list[McpArtifactView]:
    """The artifacts a call produced; none before it has a result."""
    if call.result is None:
        return []
    return list(call.result.artifacts or [])


def call_transfer_uids(call: McpCall) -> list[str]:
    """The Transfers behind the artifacts: a bulk acquisition's handle."""
    return [
        artifact.transfer_uid
        for artifact in call_artifacts(call)
        if artifact.transfer_uid
    ]


__all__ = [
    "TERMINAL_CALL_STATUSES",
    "McpApproval",
    "McpApprovalDecision",
    "McpApprovalList",
    "McpApprovalStatus",
    "McpArtifactView",
    "McpCall",
    "McpCallCreate",
    "McpCallError",
    "McpCallList",
    "McpCallResult",
    "McpCallStatus",
    "McpHealth",
    "McpResourceView",
    "McpSession",
    "McpSessionCreate",
    "McpSessionList",
    "McpSessionStatus",
    "McpToolManifest",
    "McpToolView",
    "call_artifacts",
    "call_transfer_uids",
    "is_call_terminal",
]
