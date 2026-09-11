# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""
Every operation of the orchestration control plane: its name, method and path.

Generated from the control plane's OpenAPI document by
``scripts/generate-orchestration-types.py``; do not edit. The Python client
takes its paths from here as the TypeScript one takes them from
``ORCHESTRATION_API`` in ``src/api/orchestration/generated.ts``, so
neither spells a route of its own.
"""

from __future__ import annotations

from typing import NamedTuple


class OrchestrationOperation(NamedTuple):
    """One operation of the control plane."""

    operation: str
    method: str
    path: str


ORCHESTRATION_API: tuple[OrchestrationOperation, ...] = (
    OrchestrationOperation("agents.attach", "POST", "/api/ai-agents/v1/orchestration/agents/attach"),
    OrchestrationOperation("agents.create", "POST", "/api/ai-agents/v1/orchestration/agents/create"),
    OrchestrationOperation("agents.discover", "POST", "/api/ai-agents/v1/orchestration/agents/discover"),
    OrchestrationOperation("executions.list", "GET", "/api/ai-agents/v1/orchestration/executions"),
    OrchestrationOperation("executions.cancel", "POST", "/api/ai-agents/v1/orchestration/executions/cancel"),
    OrchestrationOperation("executions.checkpoint", "POST", "/api/ai-agents/v1/orchestration/executions/checkpoint"),
    OrchestrationOperation("executions.collect", "POST", "/api/ai-agents/v1/orchestration/executions/collect"),
    OrchestrationOperation("executions.delegate", "POST", "/api/ai-agents/v1/orchestration/executions/delegate"),
    OrchestrationOperation("executions.pause", "POST", "/api/ai-agents/v1/orchestration/executions/pause"),
    OrchestrationOperation("executions.resume", "POST", "/api/ai-agents/v1/orchestration/executions/resume"),
    OrchestrationOperation("executions.steer", "POST", "/api/ai-agents/v1/orchestration/executions/steer"),
    OrchestrationOperation("executions.terminate", "POST", "/api/ai-agents/v1/orchestration/executions/terminate"),
    OrchestrationOperation("executions.get", "GET", "/api/ai-agents/v1/orchestration/executions/{execution_id}"),
    OrchestrationOperation("executions.announce", "POST", "/api/ai-agents/v1/orchestration/executions/{execution_id}/announce"),
    OrchestrationOperation("executions.subscribe", "GET", "/api/ai-agents/v1/orchestration/executions/{execution_id}/events"),
    OrchestrationOperation("executions.report", "POST", "/api/ai-agents/v1/orchestration/executions/{execution_id}/report"),
)
