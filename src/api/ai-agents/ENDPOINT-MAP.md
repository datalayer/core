<!--
 Copyright (c) 2023-2025 Datalayer, Inc.
 Distributed under the terms of the Modified BSD License.
-->

# Endpoint Map: Platform vs Local vs Core SDK

## Legend

- **Platform** = `https://prod1.datalayer.run/api/ai-agents/v1/` (OpenAPI spec)
- **Local** = `http://localhost:8765/api/v1/` (agent-runtimes FastAPI server, used by hooks/examples)
- **SDK** = `@datalayer/core/lib/api/ai-agents/` (what we built)

---

## 1. Endpoints That Exist in Both (Platform + Local)

These endpoints exist on the platform AND on the local agent-runtimes server. Our SDK covers all of them.

| Method             | Platform Path                           | Local Path                              | SDK Function                                        |
| ------------------ | --------------------------------------- | --------------------------------------- | --------------------------------------------------- |
| **Agents**         |                                         |                                         |                                                     |
| GET                | `/agents`                               | `/agents`                               | `agents.listAgents`                                 |
| POST               | `/agents`                               | `/agents`                               | `agents.createAgent`                                |
| GET                | `/agents/{id}`                          | `/agents/{id}`                          | `agents.getAgent`                                   |
| PATCH              | `/agents/{id}`                          | `/agents/{id}/transport`                | `agents.patchAgent` + `agents.updateAgentTransport` |
| DELETE             | `/agents/{id}`                          | `/agents/{id}`                          | `agents.deleteAgent`                                |
| **Events**         |                                         |                                         |                                                     |
| GET                | `/events`                               | `/events`                               | `events.listAllEvents`                              |
| POST               | `/agents/{id}/events`                   | `/agents/{id}/events`                   | `events.createEvent`                                |
| GET                | `/agents/{id}/events`                   | `/agents/{id}/events`                   | `events.listEvents`                                 |
| GET                | `/agents/{id}/events/{eid}`             | `/agents/{id}/events/{eid}`             | `events.getEvent`                                   |
| PATCH              | `/agents/{id}/events/{eid}`             | `/agents/{id}/events/{eid}`             | `events.updateEvent`                                |
| DELETE             | `/agents/{id}/events/{eid}`             | `/agents/{id}/events/{eid}`             | `events.deleteEvent`                                |
| POST               | `/agents/{id}/events/{eid}/mark-read`   | `/agents/{id}/events/{eid}/mark-read`   | `events.markEventRead`                              |
| POST               | `/agents/{id}/events/{eid}/mark-unread` | `/agents/{id}/events/{eid}/mark-unread` | `events.markEventUnread`                            |
| **Tool Approvals** |                                         |                                         |                                                     |
| GET                | `/tool-approvals`                       | `/tool-approvals`                       | `toolApprovals.listToolApprovals`                   |
| POST               | `/tool-approvals`                       | `/tool-approvals`                       | `toolApprovals.createToolApproval`                  |
| GET                | `/tool-approvals/pending/count`         | `/tool-approvals/pending/count`         | `toolApprovals.getPendingApprovalCount`             |
| GET                | `/tool-approvals/{id}`                  | `/tool-approvals/{id}`                  | `toolApprovals.getToolApproval`                     |
| DELETE             | `/tool-approvals/{id}`                  | `/tool-approvals/{id}`                  | `toolApprovals.deleteToolApproval`                  |
| POST               | `/tool-approvals/{id}/approve`          | `/tool-approvals/{id}/approve`          | `toolApprovals.approveToolCall`                     |
| POST               | `/tool-approvals/{id}/reject`           | `/tool-approvals/{id}/reject`           | `toolApprovals.rejectToolCall`                      |
| POST               | `/tool-approvals/{id}/mark-read`        | `/tool-approvals/{id}/mark-read`        | `toolApprovals.markToolApprovalRead`                |
| POST               | `/tool-approvals/{id}/mark-unread`      | `/tool-approvals/{id}/mark-unread`      | `toolApprovals.markToolApprovalUnread`              |
| **Notifications**  |                                         |                                         |                                                     |
| GET                | `/notifications`                        | `/notifications`                        | `notifications.listNotifications`                   |
| POST               | `/notifications`                        | `/notifications`                        | `notifications.createNotification`                  |
| GET                | `/notifications/unread/count`           | `/notifications/unread/count`           | `notifications.getUnreadNotificationCount`          |
| GET                | `/notifications/{id}`                   | `/notifications/{id}`                   | `notifications.getNotification`                     |
| POST               | `/notifications/{id}/read`              | `/notifications/{id}/read`              | `notifications.markNotificationRead`                |
| POST               | `/notifications/mark-all-read`          | `/notifications/mark-all-read`          | `notifications.markAllNotificationsRead`            |
| **Webhooks**       |                                         |                                         |                                                     |
| GET                | `/webhooks/{agent_id}`                  | `/agents/{id}/webhook`                  | `triggers.getWebhookInfo`                           |
| POST               | `/webhooks/{agent_id}`                  | `/agents/{id}/webhook`                  | `triggers.fireWebhook`                              |

---

## 2. Endpoints Only on Platform (OpenAPI spec, NOT in local agent-runtimes)

| Method | Platform Path                  | SDK Function                 | Notes                      |
| ------ | ------------------------------ | ---------------------------- | -------------------------- |
| GET    | `/ping`                        | `health.ping`                | Platform health ping       |
| GET    | `/api/ai-agents/version`       | `health.getVersion`          | Service version            |
| GET    | `/webhooks/{agent_id}/history` | `triggers.getWebhookHistory` | Webhook invocation history |
| GET    | `/api/iam/health`              | N/A                          | Already in `iamApi` module |
| GET    | `/swagger`, `/openapi.yaml`    | N/A                          | Docs endpoints, not needed |

---

## 3. Endpoints Only on Local Agent-Runtimes (hooks/examples, NOT on platform)

These are served by the local FastAPI server at `/api/v1/...`. They are used by the React hooks and examples but do NOT exist on the platform OpenAPI spec. Our SDK covers them for VS Code connecting to local runtimes.

| Method                    | Local Path                                     | SDK Function                         | Used By              |
| ------------------------- | ---------------------------------------------- | ------------------------------------ | -------------------- |
| **Health**                |                                                |                                      |                      |
| GET                       | `/health`                                      | `health.healthCheck`                 | direct fetch         |
| GET                       | `/health/ready`                                | `health.readinessCheck`              | direct fetch         |
| GET                       | `/health/live`                                 | `health.livenessCheck`               | direct fetch         |
| GET                       | `/health/startup`                              | `health.getStartupInfo`              | direct fetch         |
| **Agent Library**         |                                                |                                      |                      |
| GET                       | `/agents/library`                              | `library.listAgentSpecs`             | `useAgentsCatalog`   |
| GET                       | `/agents/library/{id}`                         | `library.getAgentSpec`               | `useAgentsCatalog`   |
| **Configuration**         |                                                |                                      |                      |
| GET                       | `/configure`                                   | `configuration.getFrontendConfig`    | `useConfig`          |
| GET                       | `/configure/mcp-toolsets-status`               | `configuration.getMCPToolsetsStatus` | internal             |
| GET                       | `/configure/mcp-toolsets-info`                 | `configuration.getMCPToolsetsInfo`   | internal             |
| GET                       | `/configure/agents/{id}/spec`                  | `configuration.getAgentCreationSpec` | internal             |
| **Context Introspection** |                                                |                                      |                      |
| GET                       | `/configure/agents/{id}/context-details`       | `context.getContextDetails`          | `useContextSnapshot` |
| GET                       | `/configure/agents/{id}/context-snapshot`      | `context.getContextSnapshot`         | `useContextSnapshot` |
| GET                       | `/configure/agents/{id}/context-table`         | `context.getContextTable`            | internal             |
| GET                       | `/configure/agents/{id}/full-context`          | `context.getFullContext`             | internal             |
| GET                       | `/configure/agents/{id}/context-export`        | `context.exportContextCSV`           | internal             |
| POST                      | `/configure/agents/{id}/context-details/reset` | `context.resetContext`               | internal             |
| **Sandbox/Codemode**      |                                                |                                      |                      |
| GET                       | `/configure/codemode-status`                   | `sandbox.getCodemodeStatus`          | `useSandbox`         |
| POST                      | `/configure/codemode/toggle`                   | `sandbox.toggleCodemode`             | internal             |
| GET                       | `/configure/sandbox-status`                    | `sandbox.getSandboxStatus`           | `useSandbox`         |
| POST                      | `/configure/sandbox/interrupt`                 | `sandbox.interruptSandbox`           | internal             |
| GET                       | `/agents/sandbox/status`                       | `sandbox.getAgentSandboxStatus`      | internal             |
| POST                      | `/agents/sandbox/configure`                    | `sandbox.configureSandbox`           | internal             |
| POST                      | `/agents/sandbox/restart`                      | `sandbox.restartSandbox`             | internal             |
| **MCP Servers**           |                                                |                                      |                      |
| GET                       | `/mcp/servers/catalog`                         | `mcp.listMCPCatalog`                 | internal             |
| GET                       | `/mcp/servers/available`                       | `mcp.listAvailableMCPServers`        | internal             |
| GET                       | `/mcp/servers/config`                          | `mcp.getMCPConfigServers`            | internal             |
| POST                      | `/mcp/servers/catalog/{name}/enable`           | `mcp.enableCatalogServer`            | internal             |
| PATCH                     | `/agents/{id}/mcp-servers`                     | `agents.updateAgentMCPServers`       | internal             |
| POST                      | `/agents/{id}/mcp-servers/start`               | `mcp.startAgentMCPServers`           | internal             |
| POST                      | `/agents/{id}/mcp-servers/stop`                | `mcp.stopAgentMCPServers`            | internal             |
| POST                      | `/agents/mcp-servers/start`                    | `mcp.startAllAgentsMCPServers`       | internal             |
| POST                      | `/agents/mcp-servers/stop`                     | `mcp.stopAllAgentsMCPServers`        | internal             |
| **Transport**             |                                                |                                      |                      |
| PATCH                     | `/agents/{id}/transport`                       | `agents.updateAgentTransport`        | internal             |
| **Durable Lifecycle**     |                                                |                                      |                      |
| POST                      | `/agents/{id}/pause`                           | `agents.pauseAgent`                  | `useCheckpoints`     |
| POST                      | `/agents/{id}/resume`                          | `agents.resumeAgent`                 | `useCheckpoints`     |
| GET                       | `/agents/{id}/checkpoints`                     | `agents.getAgentCheckpoints`         | `useCheckpoints`     |
| GET                       | `/agents/{id}/usage`                           | `agents.getAgentUsage`               | `useCheckpoints`     |
| GET                       | `/agents/{id}/context-usage`                   | `agents.getAgentContextUsage`        | internal             |
| GET                       | `/agents/{id}/cost-usage`                      | `agents.getAgentCostUsage`           | internal             |
| POST                      | `/agents/configure-from-spec`                  | `agents.configureFromSpec`           | internal             |
| **Triggers**              |                                                |                                      |                      |
| POST                      | `/agents/{id}/trigger/run`                     | `triggers.triggerAgentRun`           | internal             |
| **History**               |                                                |                                      |                      |
| GET                       | `/history`                                     | `history.getConversationHistory`     | internal             |
| POST                      | `/history`                                     | `history.upsertConversationHistory`  | internal             |
| DELETE                    | `/history`                                     | `history.clearConversationHistory`   | internal             |
| **Skills**                |                                                |                                      |                      |
| GET                       | `/skills`                                      | `skills.listSkills`                  | `useSkills`          |
| GET                       | `/skills/{id}`                                 | `skills.getSkill`                    | internal             |
| GET                       | `/skills/{id}/content`                         | `skills.getSkillContent`             | internal             |
| **Evals**                 |                                                |                                      |                      |
| POST                      | `/agents/{id}/evals/run`                       | `evals.runEvals`                     | internal             |
| GET                       | `/agents/{id}/evals`                           | `evals.listEvals`                    | internal             |
| GET                       | `/agents/{id}/evals/{eid}`                     | `evals.getEval`                      | internal             |
| **Output**                |                                                |                                      |                      |
| GET                       | `/agents/{id}/output`                          | `output.listAgentOutputs`            | internal             |
| GET                       | `/agents/{id}/output/{aid}`                    | `output.getAgentOutput`              | internal             |
| POST                      | `/agents/{id}/output/generate`                 | `output.generateAgentOutput`         | internal             |
| **Identity**              |                                                |                                      |                      |
| POST                      | `/identity/oauth/token`                        | `identity.exchangeOAuthToken`        | `useIdentity`        |
| POST                      | `/identity/oauth/userinfo`                     | `identity.getOAuthUserInfo`          | `useIdentity`        |

---

## 4. Local Endpoints NOT in SDK (Intentionally Excluded)

| Method | Local Path                     | Why Excluded                             |
| ------ | ------------------------------ | ---------------------------------------- |
| POST   | `/agents/prepare-checkpoint`   | Internal CRIU orchestration only         |
| POST   | `/agents/post-restore`         | Internal CRIU orchestration only         |
| WS     | `/configure/sandbox/ws`        | WebSocket - VS Code has its own WS infra |
| WS     | `/acp/ws/{id}`                 | ACP WebSocket protocol                   |
| \*     | `/ag-ui/*`                     | AG-UI protocol transport (streaming)     |
| \*     | `/vercel-ai/*`                 | Vercel AI protocol transport             |
| \*     | `/a2a/*`                       | A2A protocol transport                   |
| \*     | `/mcp-ui/*`                    | MCP-UI protocol transport                |
| \*     | `/a2ui/*`                      | A2UI protocol transport                  |
| \*     | `/examples/*`                  | Example AG-UI apps (dev only)            |
| \*     | `/mcp/proxy/*`                 | MCP proxy for tool calls                 |
| \*     | `/mcp/servers` (CRUD)          | Individual MCP server CRUD               |
| GET    | `/acp/agents`, `/acp/sessions` | ACP session management                   |

---

## 5. Path Differences (Same Endpoint, Different Path on Platform vs Local)

| Function             | Platform Path                  | Local Path                  | SDK Uses                    |
| -------------------- | ------------------------------ | --------------------------- | --------------------------- |
| Webhook info         | `/webhooks/{agent_id}`         | `/agents/{id}/webhook`      | Platform (`/webhooks/`)     |
| Webhook trigger      | `/webhooks/{agent_id}`         | `/agents/{id}/webhook`      | Platform (`/webhooks/`)     |
| Mark all notifs read | `/notifications/mark-all-read` | `/notifications/read-all`   | Platform (`/mark-all-read`) |
| Mark event read      | `POST .../mark-read`           | `PATCH` with `{read:true}`  | Platform (dedicated POST)   |
| Mark event unread    | `POST .../mark-unread`         | `PATCH` with `{read:false}` | Platform (dedicated POST)   |

For these differences, the SDK uses the **platform paths** since the platform OpenAPI spec is the canonical API. The agent-runtimes hooks in `src/api/` also use the platform paths (they import from `@datalayer/core` constants with `API_BASE_PATHS.AI_AGENTS`).
