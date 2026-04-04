<!--
 Copyright (c) 2023-2025 Datalayer, Inc.
 Distributed under the terms of the Modified BSD License.
-->

# AI Agents SDK Reference Guide

> Maps every `agent-runtimes` React hook to the corresponding `@datalayer/core` SDK function.
> Use this when porting hook-based code to VS Code extension or any non-React context.

---

## Quick Start: The Client (Recommended)

Use `createAIAgentsClient` to handle platform vs local path resolution transparently:

```typescript
import { createAIAgentsClient } from '@datalayer/core/lib/api/ai-agents';

// Platform client — uses /api/ai-agents/v1 paths
const platform = createAIAgentsClient({
  token,
  baseUrl: 'https://prod1.datalayer.run',
});

// Local agent-runtimes client — uses /api/v1 paths
const local = createAIAgentsClient({
  token,
  baseUrl: 'http://localhost:8765',
  type: 'local',
});

// Same API surface, correct paths automatically
await platform.agents.list();
await platform.toolApprovals.list({ status: 'pending' });

await local.agents.list();
await local.sandbox.getStatus();
await local.context.getSnapshot('my-agent');
```

### VS Code Extension Example

```typescript
import { createAIAgentsClient } from '@datalayer/core/lib/api/ai-agents';
import type { AIAgentsClient } from '@datalayer/core/lib/api/ai-agents';

// In your extension activation
let platformClient: AIAgentsClient;
let localClient: AIAgentsClient | null = null;

export function activate(context: vscode.ExtensionContext) {
  // Always connect to the platform for durable agent management
  platformClient = createAIAgentsClient({
    token: getToken(),
    baseUrl: 'https://prod1.datalayer.run',
  });

  // Connect to local agent-runtimes when available
  const localUrl = vscode.workspace
    .getConfiguration('datalayer')
    .get<string>('agentRuntimesUrl');
  if (localUrl) {
    localClient = createAIAgentsClient({
      token: getToken(),
      baseUrl: localUrl,
      type: 'local',
    });
  }
}

// Use the right client for the right job
async function showPendingApprovals() {
  // Tool approvals come from the platform
  const { count } = await platformClient.toolApprovals.getPendingCount();
  if (count > 0) {
    const pending = await platformClient.toolApprovals.list({
      status: 'pending',
    });
    // Show in VS Code UI...
  }
}

async function showTokenUsage(agentId: string) {
  // Context introspection is local-only
  if (!localClient) return;
  const snapshot = await localClient.context.getSnapshot(agentId);
  const pct = ((snapshot.totalTokens / snapshot.contextWindow) * 100).toFixed(
    1,
  );
  statusBar.text = `Tokens: ${pct}%`;
}
```

### Using Both Clients Together

```typescript
// Create an agent on the platform
const { agent_id } = await platformClient.agents.create({
  name: 'data-agent',
  model: 'bedrock:us.anthropic.claude-sonnet-4-5-20250929-v1',
  agent_spec_id: 'data-acquisition',
});

// Configure it on the local runtime
await localClient.sandbox.toggleCodemode({
  enabled: true,
  skills: ['github', 'crawl'],
});
await localClient.mcp.startForAgent(agent_id, { servers: ['github'] });

// Monitor it locally
const snapshot = await localClient.context.getSnapshot(agent_id);
console.log(
  `Using ${snapshot.totalTokens} of ${snapshot.contextWindow} tokens`,
);

// Events and notifications go to the platform
const events = await platformClient.events.list(agent_id, { limit: 10 });
```

### Path Resolution

The client automatically resolves the correct paths based on `type`:

| What          | `type: 'platform'` (default)   | `type: 'local'`           |
| ------------- | ------------------------------ | ------------------------- |
| Base path     | `/api/ai-agents/v1`            | `/api/v1`                 |
| Webhooks      | `/webhooks/{id}`               | `/agents/{id}/webhook`    |
| Mark all read | `/notifications/mark-all-read` | `/notifications/read-all` |

### Raw Functions (Low-Level Alternative)

If you prefer stateless functions without a client instance, they're still available:

```typescript
import { aiAgentsApi } from '@datalayer/core';

// These always use /api/ai-agents/v1 (platform paths)
const agents = await aiAgentsApi.agents.listAgents(token);
const specs = await aiAgentsApi.library.listAgentSpecs(token);
const config = await aiAgentsApi.configuration.getFrontendConfig(token);

// Or direct imports
import {
  listAgents,
  createAgent,
  approveToolCall,
  listNotifications,
} from '@datalayer/core/lib/api/ai-agents';

// Custom base URL (still uses /api/ai-agents/v1 prefix)
const LOCAL = 'http://localhost:8765';
const agents = await aiAgentsApi.agents.listAgents(token, LOCAL);
```

---

## Hook-to-SDK Mapping

### 1. Health & Startup (`useConfig` / `useSandbox`)

| Hook / Frontend Call                      | SDK Function                                                           | Module          |
| ----------------------------------------- | ---------------------------------------------------------------------- | --------------- |
| `fetch(configEndpoint)` in `useConfig`    | `configuration.getFrontendConfig(token, mcpUrl?, mcpToken?, baseUrl?)` | `configuration` |
| `fetch(sandboxStatusUrl)` in `useSandbox` | `sandbox.getSandboxStatus(token, baseUrl?)`                            | `sandbox`       |
| Health ping                               | `health.healthCheck(token, baseUrl?)`                                  | `health`        |
| Readiness probe                           | `health.readinessCheck(token, baseUrl?)`                               | `health`        |
| Liveness probe                            | `health.livenessCheck(token, baseUrl?)`                                | `health`        |
| Startup info                              | `health.getStartupInfo(token, baseUrl?)`                               | `health`        |

**Example: Check if agent-runtimes is reachable from VS Code**

```typescript
import { aiAgentsApi } from '@datalayer/core';

async function checkAgentRuntimesHealth(token: string, runtimeUrl: string) {
  try {
    const status = await aiAgentsApi.health.healthCheck(token, runtimeUrl);
    console.log(`Agent-runtimes is ${status.status}`);
    return true;
  } catch (err) {
    console.error('Agent-runtimes unreachable:', err);
    return false;
  }
}
```

---

### 2. Agent CRUD (`useAgents` / `useAgentsService`)

| Hook / Frontend Call                               | SDK Function                                   | Module   |
| -------------------------------------------------- | ---------------------------------------------- | -------- |
| `useAgentRuntimes()` → lists runtimes              | `agents.listAgents(token, baseUrl?)`           | `agents` |
| `useAgentRuntime(podName)` → single agent          | `agents.getAgent(token, agentId, baseUrl?)`    | `agents` |
| `useCreateAgentRuntime()` → creates agent          | `agents.createAgent(token, request, baseUrl?)` | `agents` |
| `useDeleteAgentRuntime()` → deletes agent          | `agents.deleteAgent(token, agentId, baseUrl?)` | `agents` |
| `createAgent()` in `useAgentsService` (deprecated) | `agents.createAgent(token, request, baseUrl?)` | `agents` |

**Example: Create an agent from a spec**

```typescript
import { aiAgentsApi } from '@datalayer/core';

const result = await aiAgentsApi.agents.createAgent(token, {
  name: 'my-data-agent',
  model: 'bedrock:us.anthropic.claude-sonnet-4-5-20250929-v1',
  system_prompt: 'You are a helpful data analysis assistant.',
  agent_spec_id: 'data-acquisition',
  protocol: 'ag-ui',
  codemode: { enabled: true },
});

console.log(`Agent created: ${result.agent_id}`);
console.log(`Transports: ${JSON.stringify(result.transports)}`);
```

**Example: List and display running agents**

```typescript
const { agents: agentList } = await aiAgentsApi.agents.listAgents(
  token,
  runtimeUrl,
);

for (const agent of agentList) {
  console.log(`${agent.agent_id} — ${agent.status} — model: ${agent.model}`);
}
```

---

### 3. Agent Spec Library (`useAgentsCatalog`)

| Hook / Frontend Call                | SDK Function                                     | Module    |
| ----------------------------------- | ------------------------------------------------ | --------- |
| `useAgentCatalogStore().agentSpecs` | `library.listAgentSpecs(token, baseUrl?)`        | `library` |
| GET `/agents/library/{id}`          | `library.getAgentSpec(token, agentId, baseUrl?)` | `library` |

**Example: Browse agent templates**

```typescript
const specs = await aiAgentsApi.library.listAgentSpecs(token, runtimeUrl);

for (const spec of specs) {
  console.log(`[${spec.id}] ${spec.name} — ${spec.description}`);
  console.log(`  Model: ${spec.model}, Tags: ${spec.tags?.join(', ')}`);
}
```

---

### 4. Durable Agent Lifecycle (`useCheckpoints`)

| Hook / Frontend Call           | SDK Function                                                     | Module   |
| ------------------------------ | ---------------------------------------------------------------- | -------- |
| `usePauseAgent()`              | `agents.pauseAgent(token, podName, baseUrl?)`                    | `agents` |
| `useResumeAgent()`             | `agents.resumeAgent(token, podName, baseUrl?)`                   | `agents` |
| `useAgentCheckpoints(podName)` | `agents.getAgentCheckpoints(token, podName, agentId?, baseUrl?)` | `agents` |
| `useAgentUsage(podName)`       | `agents.getAgentUsage(token, podName, agentId?, baseUrl?)`       | `agents` |

**Example: Pause and resume an agent**

```typescript
// Pause the agent (creates a checkpoint)
await aiAgentsApi.agents.pauseAgent(token, 'my-agent-pod-abc123');

// Later, resume it
await aiAgentsApi.agents.resumeAgent(token, 'my-agent-pod-abc123');
```

**Example: List conversation checkpoints**

```typescript
const checkpoints = await aiAgentsApi.agents.getAgentCheckpoints(
  token,
  'my-agent-pod-abc123',
);

for (const cp of checkpoints) {
  console.log(
    `Checkpoint ${cp.id} — ${cp.created_at} — ${cp.messages.length} messages`,
  );
}
```

---

### 5. Tool Approvals — Human-in-the-Loop (`useToolApprovals`)

| Hook / Frontend Call              | SDK Function                                                        | Module          |
| --------------------------------- | ------------------------------------------------------------------- | --------------- |
| `useToolApprovalsQuery(filters?)` | `toolApprovals.listToolApprovals(token, filters?, baseUrl?)`        | `toolApprovals` |
| `usePendingApprovalCount()`       | `toolApprovals.getPendingApprovalCount(token, baseUrl?)`            | `toolApprovals` |
| `useApproveToolRequest()`         | `toolApprovals.approveToolCall(token, approvalId, note?, baseUrl?)` | `toolApprovals` |
| `useRejectToolRequest()`          | `toolApprovals.rejectToolCall(token, approvalId, note?, baseUrl?)`  | `toolApprovals` |
| `useMarkToolApprovalRead()`       | `toolApprovals.markToolApprovalRead(token, approvalId, baseUrl?)`   | `toolApprovals` |
| `useMarkToolApprovalUnread()`     | `toolApprovals.markToolApprovalUnread(token, approvalId, baseUrl?)` | `toolApprovals` |
| `useDeleteToolApproval()`         | `toolApprovals.deleteToolApproval(token, approvalId, baseUrl?)`     | `toolApprovals` |

**Example: VS Code notification for pending tool approvals**

```typescript
import { aiAgentsApi } from '@datalayer/core';

// Poll for pending approvals (e.g., from a VS Code TreeView refresh)
async function checkPendingApprovals(token: string, baseUrl: string) {
  const { count } = await aiAgentsApi.toolApprovals.getPendingApprovalCount(
    token,
    baseUrl,
  );

  if (count > 0) {
    const pending = await aiAgentsApi.toolApprovals.listToolApprovals(
      token,
      { status: 'pending' },
      baseUrl,
    );

    for (const approval of pending) {
      // Show VS Code notification
      const action = await vscode.window.showInformationMessage(
        `Agent wants to run "${approval.tool_name}" with args: ${JSON.stringify(approval.tool_args)}`,
        'Approve',
        'Reject',
      );

      if (action === 'Approve') {
        await aiAgentsApi.toolApprovals.approveToolCall(
          token,
          approval.id,
          undefined,
          baseUrl,
        );
      } else if (action === 'Reject') {
        await aiAgentsApi.toolApprovals.rejectToolCall(
          token,
          approval.id,
          'Rejected by user',
          baseUrl,
        );
      }
    }
  }
}
```

**Example: Filter approvals by agent**

```typescript
const agentApprovals = await aiAgentsApi.toolApprovals.listToolApprovals(
  token,
  { agent_id: 'data-acquisition', status: 'pending' },
  baseUrl,
);
```

---

### 6. Notifications (`useNotifications` — notification part)

| Hook / Frontend Call                 | SDK Function                                                        | Module          |
| ------------------------------------ | ------------------------------------------------------------------- | --------------- |
| `useFilteredNotifications(filters?)` | `notifications.listNotifications(token, filters?, baseUrl?)`        | `notifications` |
| `useUnreadNotificationCount()`       | `notifications.getUnreadNotificationCount(token, baseUrl?)`         | `notifications` |
| `useMarkNotificationRead()`          | `notifications.markNotificationRead(token, id, baseUrl?)`           | `notifications` |
| `useMarkAllNotificationsRead()`      | `notifications.markAllNotificationsRead(token, agentId?, baseUrl?)` | `notifications` |

**Example: Show unread notification badge**

```typescript
const { count } = await aiAgentsApi.notifications.getUnreadNotificationCount(
  token,
  baseUrl,
);

// Update VS Code status bar badge
statusBarItem.text = count > 0 ? `$(bell-dot) ${count}` : '$(bell)';
```

**Example: List and dismiss notifications**

```typescript
const notifs = await aiAgentsApi.notifications.listNotifications(
  token,
  { unreadOnly: true, limit: 20 },
  baseUrl,
);

for (const n of notifs) {
  console.log(`[${n.level}] ${n.title}: ${n.message}`);
  await aiAgentsApi.notifications.markNotificationRead(token, n.id, baseUrl);
}
```

---

### 7. Agent Events (`useNotifications` — events part)

| Hook / Frontend Call               | SDK Function                                                  | Module   |
| ---------------------------------- | ------------------------------------------------------------- | -------- |
| `useAllAgentEvents(params?)`       | `events.listAllEvents(token, params?, baseUrl?)`              | `events` |
| `useAgentEvents(agentId, params?)` | `events.listEvents(token, agentId, params?, baseUrl?)`        | `events` |
| `useAgentEvent(agentId, eventId)`  | `events.getEvent(token, agentId, eventId, baseUrl?)`          | `events` |
| `useCreateAgentEvent()`            | `events.createEvent(token, data, baseUrl?)`                   | `events` |
| `useUpdateAgentEvent(agentId)`     | `events.updateEvent(token, agentId, eventId, data, baseUrl?)` | `events` |
| `useDeleteAgentEvent(agentId)`     | `events.deleteEvent(token, agentId, eventId, baseUrl?)`       | `events` |
| `useMarkEventRead(agentId)`        | `events.markEventRead(token, agentId, eventId, baseUrl?)`     | `events` |
| `useMarkEventUnread(agentId)`      | `events.markEventUnread(token, agentId, eventId, baseUrl?)`   | `events` |

**Example: List recent events for an agent**

```typescript
const { events: agentEvents } = await aiAgentsApi.events.listEvents(
  token,
  'my-agent-id',
  { limit: 50 },
  baseUrl,
);

for (const evt of agentEvents) {
  console.log(`[${evt.event_type}] ${evt.title} — ${evt.created_at}`);
}
```

**Example: Create a custom event**

```typescript
await aiAgentsApi.events.createEvent(
  token,
  {
    agent_id: 'my-agent-id',
    event_type: 'user-action',
    title: 'User triggered manual run',
    level: 'info',
    metadata: { source: 'vscode-extension' },
  },
  baseUrl,
);
```

---

### 8. Context Introspection (`useContextSnapshot`)

| Hook / Frontend Call                             | SDK Function                                                      | Module    |
| ------------------------------------------------ | ----------------------------------------------------------------- | --------- |
| `useContextSnapshot(enabled, endpoint, agentId)` | `context.getContextSnapshot(token, agentId, baseUrl?)`            | `context` |
| Context details                                  | `context.getContextDetails(token, agentId, baseUrl?)`             | `context` |
| Full context (model, tools, memory)              | `context.getFullContext(token, agentId, baseUrl?)`                | `context` |
| Context table (rendered text)                    | `context.getContextTable(token, agentId, showContext?, baseUrl?)` | `context` |
| Export context CSV                               | `context.exportContextCSV(token, agentId, baseUrl?)`              | `context` |
| Reset context stats                              | `context.resetContext(token, agentId, baseUrl?)`                  | `context` |
| Context window usage                             | `agents.getAgentContextUsage(token, agentId, baseUrl?)`           | `agents`  |
| Cost tracking                                    | `agents.getAgentCostUsage(token, agentId, baseUrl?)`              | `agents`  |

**Example: Show token usage in VS Code status bar**

```typescript
const snapshot = await aiAgentsApi.context.getContextSnapshot(
  token,
  agentId,
  runtimeUrl,
);

const pct = ((snapshot.totalTokens / snapshot.contextWindow) * 100).toFixed(1);
statusBarItem.text = `Tokens: ${snapshot.totalTokens.toLocaleString()} / ${snapshot.contextWindow.toLocaleString()} (${pct}%)`;
```

**Example: Export context to CSV file**

```typescript
const { csv, filename } = await aiAgentsApi.context.exportContextCSV(
  token,
  agentId,
  runtimeUrl,
);

const uri = vscode.Uri.file(`/tmp/${filename}`);
await vscode.workspace.fs.writeFile(uri, Buffer.from(csv));
vscode.window.showInformationMessage(`Exported to ${filename}`);
```

---

### 9. Sandbox & Codemode (`useSandbox`)

| Hook / Frontend Call                    | SDK Function                                          | Module    |
| --------------------------------------- | ----------------------------------------------------- | --------- |
| `useSandbox(enabled, endpoint)` polling | `sandbox.getSandboxStatus(token, baseUrl?)`           | `sandbox` |
| Codemode status                         | `sandbox.getCodemodeStatus(token, baseUrl?)`          | `sandbox` |
| Toggle codemode                         | `sandbox.toggleCodemode(token, request, baseUrl?)`    | `sandbox` |
| Interrupt running code                  | `sandbox.interruptSandbox(token, agentId?, baseUrl?)` | `sandbox` |
| Sandbox manager status                  | `sandbox.getAgentSandboxStatus(token, baseUrl?)`      | `sandbox` |
| Configure sandbox                       | `sandbox.configureSandbox(token, request, baseUrl?)`  | `sandbox` |
| Restart sandbox                         | `sandbox.restartSandbox(token, baseUrl?)`             | `sandbox` |

**Example: Toggle codemode from VS Code command**

```typescript
// Enable codemode with specific skills
await aiAgentsApi.sandbox.toggleCodemode(
  token,
  {
    enabled: true,
    skills: ['crawl', 'github', 'pdf'],
  },
  runtimeUrl,
);
```

**Example: Interrupt running code**

```typescript
const { interrupted, reason } = await aiAgentsApi.sandbox.interruptSandbox(
  token,
  'my-agent-id',
  runtimeUrl,
);

if (interrupted) {
  vscode.window.showInformationMessage('Code execution interrupted.');
} else {
  vscode.window.showWarningMessage(`Could not interrupt: ${reason}`);
}
```

---

### 10. Skills (`useSkills`)

| Hook / Frontend Call           | SDK Function                                       | Module   |
| ------------------------------ | -------------------------------------------------- | -------- |
| `useSkills(enabled, endpoint)` | `skills.listSkills(token, baseUrl?)`               | `skills` |
| Get single skill               | `skills.getSkill(token, skillId, baseUrl?)`        | `skills` |
| Get skill content              | `skills.getSkillContent(token, skillId, baseUrl?)` | `skills` |

**Example: List available skills**

```typescript
const { skills: available, total } = await aiAgentsApi.skills.listSkills(
  token,
  runtimeUrl,
);

for (const skill of available) {
  console.log(`${skill.name}: ${skill.description}`);
}
```

---

### 11. MCP Server Management

| Hook / Frontend Call         | SDK Function                                                   | Module |
| ---------------------------- | -------------------------------------------------------------- | ------ |
| GET `/mcp/servers/catalog`   | `mcp.listMCPCatalog(token, baseUrl?)`                          | `mcp`  |
| GET `/mcp/servers/available` | `mcp.listAvailableMCPServers(token, baseUrl?)`                 | `mcp`  |
| GET `/mcp/servers/config`    | `mcp.getMCPConfigServers(token, baseUrl?)`                     | `mcp`  |
| Enable catalog server        | `mcp.enableCatalogServer(token, serverName, baseUrl?)`         | `mcp`  |
| Start MCP for agent          | `mcp.startAgentMCPServers(token, agentId, request?, baseUrl?)` | `mcp`  |
| Stop MCP for agent           | `mcp.stopAgentMCPServers(token, agentId, baseUrl?)`            | `mcp`  |
| Start MCP for all agents     | `mcp.startAllAgentsMCPServers(token, request?, baseUrl?)`      | `mcp`  |
| Stop MCP for all agents      | `mcp.stopAllAgentsMCPServers(token, baseUrl?)`                 | `mcp`  |

**Example: Enable a GitHub MCP server**

```typescript
await aiAgentsApi.mcp.enableCatalogServer(token, 'github', runtimeUrl);

// Then start it for a specific agent
await aiAgentsApi.mcp.startAgentMCPServers(
  token,
  'my-agent-id',
  {
    servers: ['github'],
  },
  runtimeUrl,
);
```

---

### 12. Triggers (`useAgents` — trigger section)

| Hook / Frontend Call            | SDK Function                                                   | Module     |
| ------------------------------- | -------------------------------------------------------------- | ---------- |
| POST `/agents/{id}/trigger/run` | `triggers.triggerAgentRun(token, agentId, request?, baseUrl?)` | `triggers` |
| GET `/agents/{id}/webhook`      | `triggers.getWebhookInfo(token, agentId, baseUrl?)`            | `triggers` |
| POST `/agents/{id}/webhook`     | `triggers.fireWebhook(token, agentId, payload, baseUrl?)`      | `triggers` |

**Example: Manually trigger an agent run**

```typescript
const result = await aiAgentsApi.triggers.triggerAgentRun(
  token,
  'my-scheduled-agent',
  { prompt: 'Generate the weekly sales report.' },
  runtimeUrl,
);

console.log(`Trigger status: ${result.status}`);
if (result.workflow_id) {
  console.log(`Workflow ID: ${result.workflow_id}`);
}
```

---

### 13. Output Artifacts

| Hook / Frontend Call                                 | SDK Function                                                              | Module   |
| ---------------------------------------------------- | ------------------------------------------------------------------------- | -------- |
| `output.getAgentOutputs(token, agentId)`             | `output.listAgentOutputs(token, agentId, baseUrl?)`                       | `output` |
| `output.getAgentOutput(token, agentId, artifactId)`  | `output.getAgentOutput(token, agentId, artifactId, baseUrl?)`             | `output` |
| `output.generateAgentOutput(token, agentId, format)` | `output.generateAgentOutput(token, agentId, format?, options?, baseUrl?)` | `output` |

**Example: Generate and download a PDF report**

```typescript
const artifact = await aiAgentsApi.output.generateAgentOutput(
  token,
  'my-agent-id',
  'pdf',
  { include_charts: true },
  runtimeUrl,
);

console.log(`Generated: ${artifact.filename} (${artifact.size} bytes)`);
if (artifact.url) {
  // Download the artifact
  vscode.env.openExternal(vscode.Uri.parse(artifact.url));
}
```

---

### 14. Evaluations

| Hook / Frontend Call                      | SDK Function                                        | Module  |
| ----------------------------------------- | --------------------------------------------------- | ------- |
| `evals.runEvals(token, agentId, request)` | `evals.runEvals(token, agentId, request, baseUrl?)` | `evals` |
| `evals.listEvals(token, agentId)`         | `evals.listEvals(token, agentId, baseUrl?)`         | `evals` |
| `evals.getEval(token, agentId, evalId)`   | `evals.getEval(token, agentId, evalId, baseUrl?)`   | `evals` |

**Example: Run and review an evaluation**

```typescript
const report = await aiAgentsApi.evals.runEvals(
  token,
  'my-agent-id',
  {
    eval_ids: ['accuracy-benchmark'],
  },
  runtimeUrl,
);

console.log(`Eval score: ${report.score}`);
console.log(`Status: ${report.status}`);
```

---

### 15. Conversation History

| Hook / Frontend Call           | SDK Function                                                  | Module    |
| ------------------------------ | ------------------------------------------------------------- | --------- |
| GET `/history?agent_id=...`    | `history.getConversationHistory(token, agentId?, baseUrl?)`   | `history` |
| POST `/history`                | `history.upsertConversationHistory(token, request, baseUrl?)` | `history` |
| DELETE `/history?agent_id=...` | `history.clearConversationHistory(token, agentId?, baseUrl?)` | `history` |

**Example: Save and restore conversation history**

```typescript
// Get existing history
const convo = await aiAgentsApi.history.getConversationHistory(
  token,
  'my-agent-id',
  runtimeUrl,
);

console.log(`${convo.messages.length} messages in history`);

// Clear and start fresh
await aiAgentsApi.history.clearConversationHistory(
  token,
  'my-agent-id',
  runtimeUrl,
);
```

---

### 16. Identity / OAuth

| Hook / Frontend Call            | SDK Function                                                                | Module     |
| ------------------------------- | --------------------------------------------------------------------------- | ---------- |
| POST `/identity/oauth/token`    | `identity.exchangeOAuthToken(token, code, provider, redirectUri, baseUrl?)` | `identity` |
| POST `/identity/oauth/userinfo` | `identity.getOAuthUserInfo(token, provider, accessToken, baseUrl?)`         | `identity` |

**Example: Exchange an OAuth code**

```typescript
const result = await aiAgentsApi.identity.exchangeOAuthToken(
  token,
  authCode,
  'github',
  'https://myapp.com/callback',
  runtimeUrl,
);
```

---

### 17. OTEL Monitoring (`useMonitoring`)

The `useMonitoring` hook uses `@datalayer/core`'s existing OTEL client directly — it does **not** go through the AI Agents API. No new SDK functions are needed.

```typescript
// Already available in @datalayer/core
import { createOtelClient } from '@datalayer/core/lib/otel';

const client = createOtelClient({ baseUrl: runUrl, token: apiKey });
const metrics = await client.fetchMetrics({
  metricName: 'agent_runtimes.prompt.turn.total_tokens',
  serviceName: 'my-agent',
});
```

---

### 18. Transport Update / MCP Server Update

| Hook / Frontend Call               | SDK Function                                                      | Module   |
| ---------------------------------- | ----------------------------------------------------------------- | -------- |
| PATCH `/agents/{id}/transport`     | `agents.updateAgentTransport(token, agentId, request, baseUrl?)`  | `agents` |
| PATCH `/agents/{id}/mcp-servers`   | `agents.updateAgentMCPServers(token, agentId, request, baseUrl?)` | `agents` |
| POST `/agents/configure-from-spec` | `agents.configureFromSpec(token, spec, baseUrl?)`                 | `agents` |

---

## Hooks NOT Requiring SDK (Client-Side Only)

These hooks are purely client-side state management or protocol adapters — they don't map to SDK API calls:

| Hook                   | Why No SDK Needed                                    |
| ---------------------- | ---------------------------------------------------- |
| `useChat`              | Client-side message/tool state (Zustand store)       |
| `useTools`             | Client-side tool registration for frontend tools     |
| `useAgentsRegistry`    | Client-side agent registry (Zustand store)           |
| `useAIAgentsWebSocket` | WebSocket connection — VS Code has its own WS infra  |
| `useA2A`               | A2A protocol adapter — handled by protocol SDK       |
| `useAcp`               | ACP protocol adapter — handled by protocol SDK       |
| `useAgUi`              | AG-UI protocol adapter — handled by protocol SDK     |
| `useVercelAI`          | Vercel AI protocol adapter — handled by protocol SDK |

---

## Complete Module Summary

| Module          | Functions | Description                                                     |
| --------------- | --------- | --------------------------------------------------------------- |
| `agents`        | 13        | Agent CRUD + durable lifecycle (pause/resume/checkpoints/usage) |
| `configuration` | 4         | Frontend config, agent specs, MCP toolsets                      |
| `context`       | 6         | Context introspection (snapshot, details, table, export, reset) |
| `evals`         | 3         | Evaluation runs (trigger, list, get)                            |
| `events`        | 8         | Agent events CRUD + mark read/unread                            |
| `health`        | 4         | Health/readiness/liveness/startup                               |
| `history`       | 3         | Conversation history (get, upsert, clear)                       |
| `identity`      | 2         | OAuth token exchange + user info                                |
| `library`       | 2         | Agent spec library (list, get)                                  |
| `mcp`           | 8         | MCP server catalog, start/stop, enable                          |
| `notifications` | 5         | Notification CRUD + unread count                                |
| `output`        | 3         | Output artifacts (list, get, generate)                          |
| `sandbox`       | 7         | Codemode toggle, sandbox status/config/restart/interrupt        |
| `skills`        | 3         | Skills list, get, get content                                   |
| `toolApprovals` | 9         | Tool approval CRUD + approve/reject + mark read/unread          |
| `triggers`      | 3         | Trigger runs, webhook info, fire webhook                        |
| **Total**       | **83**    |                                                                 |
