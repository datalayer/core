# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""
What went wrong, said the same way everywhere (PLAN_ORCHESTRATOR.md, O0-01, O0-03).

An ``OrchestrationError`` is a record, not an exception: it is what an
attempt reports, what an event carries and what a report shows, and it
crosses a protocol boundary. The exceptions this package raises are
``InvalidTransition`` in ``lifecycle`` and pydantic's own validation errors.

The codes are closed and each one exists because something in the plan has
to tell it apart from the others — a worker that refused the work before
accepting it is not a worker that vanished after accepting it (section 13,
scenarios 3 and 4), and a lease that expired is not yet a failure at all
(section 6.4). ``retryable`` is the field the retry policy reads: it says
whether trying again could plausibly do anything.
"""

from __future__ import annotations

from enum import Enum
from typing import Any

from pydantic import Field

from datalayer_core.orchestration.base import CanonicalModel


class ErrorCode(str, Enum):
    """Why an execution, an attempt or a command did not do what was asked."""

    # The worker, and the protocol between it and the control plane.
    WORKER_REJECTED = "worker_rejected"
    WORKER_UNREACHABLE = "worker_unreachable"
    LEASE_EXPIRED = "lease_expired"
    UNSUPPORTED_OPERATION = "unsupported_operation"
    # The canonical model refusing what it was told.
    INVALID_TRANSITION = "invalid_transition"
    INVALID_COMMAND = "invalid_command"
    CONFLICT = "conflict"
    NOT_FOUND = "not_found"
    # Policy: the limits of section 9 and 19.8.
    PERMISSION_DENIED = "permission_denied"
    CONTEXT_UNAVAILABLE = "context_unavailable"
    # Not `context_unavailable`: the reference is fine and the caller may
    # read it — the window in which this execution was allowed to has closed
    # (O0-09), and a worker retried inside it would succeed.
    CONTEXT_EXPIRED = "context_expired"
    BUDGET_EXHAUSTED = "budget_exhausted"
    DEADLINE_EXCEEDED = "deadline_exceeded"
    DEPTH_EXCEEDED = "depth_exceeded"
    FAN_OUT_EXCEEDED = "fan_out_exceeded"
    APPROVAL_DENIED = "approval_denied"
    APPROVAL_TIMED_OUT = "approval_timed_out"
    # Everything that has no better name yet.
    INTERNAL = "internal"


class OrchestrationError(CanonicalModel):
    """One failure, as it is reported and stored."""

    code: ErrorCode
    message: str
    retryable: bool = False
    source: str | None = Field(
        default=None,
        description="Which adapter, worker or service reported it.",
    )
    details: dict[str, Any] | None = None
