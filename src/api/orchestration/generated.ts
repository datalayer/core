/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/* This file is generated from the datalayer_core.orchestration pydantic models and the control plane's OpenAPI document. Do not edit. */

/** One milestone reached, reported by the endpoint or by the worker. */
export interface Acknowledgement {
  kind: AcknowledgementKind;
  executionId: string;
  attemptId?: string | null;
  command?: CommandName | null;
  idempotencyKey?: string | null;
  /** When it was reached. */
  acknowledgedAt: string;
  /** Set on 'checkpointed'; what a resume names. */
  checkpointId?: string | null;
  detail?: string | null;
}

/** The five milestones of section 6.3, in the order they are reached. */
export type AcknowledgementKind =
  'received' | 'accepted' | 'started' | 'checkpointed' | 'completed';

/** What a caller must present to be let in. */
export interface AgentAuthentication {
  /** bearer, oauth2 or none, as the agent card names them. */
  schemes?: Array<string>;
  audience?: string | null;
  scopes?: Array<string>;
}

/** Which worker an execution is bound to, and how it is reached. */
export interface AgentBinding {
  agentId: string;
  capability: string;
  protocol: AgentProtocol;
  endpoint?: string | null;
  sessionId?: string | null;
}

/** A descriptor written out as an A2A agent card, and what A2A cannot hold. */
export interface AgentCardMapping {
  /** The agent card, as it is served. */
  card: Record<string, unknown>;
  gaps?: Array<MappingGap>;
}

/** One worker, described the same way whatever it speaks. */
export interface AgentDescriptor {
  agentId: string;
  name: string;
  description?: string;
  version?: string;
  skills?: Array<AgentSkill>;
  capabilities?: Array<string>;
  endpoints?: Array<ProtocolEndpoint>;
  inputContentTypes?: Array<string>;
  outputContentTypes?: Array<string>;
  supportedOperations?: Array<WorkerOperation>;
  authentication?: AgentAuthentication;
  dataClassifications?: Array<DataClassification>;
  trustLevel?: TrustLevel;
  runtime?: RuntimeRequirements;
  cost?: CostHint;
  latency?: LatencyHint;
  availability?: Availability;
}

/** How the control plane speaks to a worker. */
export type AgentProtocol = 'a2a' | 'acp' | 'datalayer';

/** One thing a worker can do, in the shape an A2A agent card gives it. */
export interface AgentSkill {
  id: string;
  name: string;
  description?: string;
  tags?: Array<string>;
  examples?: Array<string>;
}

/** Attach to an agent or a session that is already there. */
export interface AgentsAttach {
  command?: 'agents.attach';
  /** From the caller, for acceptance latency. */
  issuedAt?: string | null;
  /** The W3C context of the caller, so the tree is one trace. */
  traceparent?: string | null;
  idempotencyKey: string;
  agentId: string;
  protocol: AgentProtocol;
  endpoint?: string | null;
  /** An existing protocol session to load rather than open. */
  sessionId?: string | null;
}

/** Provision or launch a worker. */
export interface AgentsCreate {
  command?: 'agents.create';
  /** From the caller, for acceptance latency. */
  issuedAt?: string | null;
  /** The W3C context of the caller, so the tree is one trace. */
  traceparent?: string | null;
  idempotencyKey: string;
  /** The descriptor to bring up. */
  agentId: string;
  protocol: AgentProtocol;
  runtime?: RuntimeRequirements;
  /** The execution the worker is brought up for: its compute draws on that execution tree's credits (O1-07). */
  executionId?: string | null;
}

/** Find workers matching capabilities and constraints. */
export interface AgentsDiscover {
  command?: 'agents.discover';
  /** From the caller, for acceptance latency. */
  issuedAt?: string | null;
  /** The W3C context of the caller, so the tree is one trace. */
  traceparent?: string | null;
  capabilities?: Array<string>;
  protocols?: Array<AgentProtocol>;
  /** Only workers supporting all of these are returned. */
  operations?: Array<WorkerOperation>;
  dataClassification?: DataClassification | null;
  minimumTrustLevel?: TrustLevel | null;
  region?: string | null;
  limit?: number;
}

/** One registered output of an execution. */
export interface Artifact {
  artifactId: string;
  type: ArtifactType;
  name: string;
  /** datalayer:<kind>/<uid>@<version> once committed; absent while the artifact is only registered against the execution. */
  reference?: string | null;
  mediaType?: string | null;
  sizeBytes?: number | null;
  status?: ArtifactStatus;
  /** The attempt whose commit made this the execution's result. A record carrying two provenances cannot say it any other way. */
  committedBy?: string | null;
  /** The artifact that won the commit, when this one lost it. */
  supersededBy?: string | null;
  provenance?: Array<ArtifactProvenance>;
  summary?: string | null;
}

/** What one attempt's commit did to an execution's artifacts (O0-10). */
export interface ArtifactCommit {
  executionId: string;
  /** The attempt asking to commit. */
  attemptId: string;
  /** The attempt whose artifacts are the execution's result. */
  winningAttemptId: string;
  won: boolean;
  artifacts?: Array<Artifact>;
}

/** Who produced this artifact, from what, and when. */
export interface ArtifactProvenance {
  executionId: string;
  attemptId: string;
  agentId: string;
  /** From the control plane's clock. */
  producedAt: string;
  /** The context URIs the attempt was given to produce it. */
  sourceReferences?: Array<string>;
  contentHash?: string | null;
  traceId?: string | null;
}

/** Where an artifact stands against the commit rule of 19.8. */
export type ArtifactStatus = 'registered' | 'committed' | 'superseded';

/** What an artifact is, from the nine kinds of section 5.4. */
export type ArtifactType =
  | 'notebook'
  | 'report'
  | 'dataset'
  | 'cell-output'
  | 'file'
  | 'evaluation'
  | 'execution-log'
  | 'sandbox-snapshot'
  | 'json';

/** One dispatch of an execution to a worker (section 6.4). */
export interface Attempt {
  attemptId: string;
  executionId: string;
  /** 1 for the first dispatch, then upwards. */
  number: number;
  agentId: string;
  protocol: AgentProtocol;
  sessionId?: string | null;
  /** The A2A task or ACP prompt this attempt became. */
  protocolTaskId?: string | null;
  /** The checkpoint this attempt resumes from, when executions.resume sent it: its delegation names the checkpoint to a worker that speaks the orchestration extension. */
  resumedFrom?: string | null;
  state?: ExecutionState;
  startedAt?: string | null;
  endedAt?: string | null;
  leaseExpiresAt?: string | null;
  error?: OrchestrationError | null;
  /** What the attempt spent, as its worker reported it when the attempt ended. */
  usage?: Usage | null;
}

/** How much of the worker there is. */
export interface Availability {
  maxConcurrentExecutions?: number | null;
  queueDepth?: number | null;
  available?: boolean;
}

/** What the execution may spend. */
export interface Budget {
  inputTokens?: number | null;
  outputTokens?: number | null;
  cost?: number | null;
  currency?: string;
  wallClockSeconds?: number | null;
  /** Platform credits the tree's compute may consume, held by IAM in one reservation for the whole tree (O1-07). Set on the root: the tree's executions draw on it, and none sets its own. */
  credits?: number | null;
  /** How many executions the subtree below this one may create. */
  executions?: number | null;
}

/** The executions `executions.cancel` stopped. */
export interface CancelAnswer {
  acknowledgement: Acknowledgement;
  cancelledExecutionIds?: Array<string>;
  /** Whether the execution's workflow was told. Told is not accepted. */
  delivered: boolean;
  detail?: string | null;
  execution: Execution;
  success?: boolean;
}

/** The artifacts registered against an execution, and its children's. */
export interface CollectAnswer {
  artifacts: Array<Artifact>;
  /** Every attempt of the execution and of the children collected with it, each execution's in order: what a tree draws each node's spend and elapsed time from (O2-10). */
  attempts?: Array<Attempt>;
  children?: Array<Execution>;
  execution: Execution;
  success?: boolean;
}

/** What every command carries, whatever it asks for. */
export interface Command {
  command: CommandName;
  /** From the caller, for acceptance latency. */
  issuedAt?: string | null;
  /** The W3C context of the caller, so the tree is one trace. */
  traceparent?: string | null;
}

/** A request to a worker, received: steer, pause, resume, checkpoint, terminate. */
export interface CommandAnswer {
  acknowledgement: Acknowledgement;
  /** Whether the execution's workflow was told. Told is not accepted. */
  delivered: boolean;
  detail?: string | null;
  execution: Execution;
  success?: boolean;
}

/** The twelve commands of section 6.2. */
export type CommandName =
  | 'agents.discover'
  | 'agents.create'
  | 'agents.attach'
  | 'executions.delegate'
  | 'executions.steer'
  | 'executions.pause'
  | 'executions.resume'
  | 'executions.cancel'
  | 'executions.checkpoint'
  | 'executions.collect'
  | 'executions.terminate'
  | 'executions.subscribe';

/** Whether a worker may only read the reference, or also write it. */
export type ContextAccess = 'read-only' | 'writable';

/** What a context reference points at. */
export type ContextKind =
  | 'notebook'
  | 'document'
  | 'cell'
  | 'dataset'
  | 'artifact'
  | 'sandbox'
  | 'snapshot'
  | 'file'
  | 'execution';

/** Everything one execution may reach, and for how long. */
export interface ContextManifest {
  references?: Array<ContextReference>;
  /** The IAM scope the per-execution credential is narrowed to. */
  scope?: string | null;
  /** Access ends here even if the execution has not. */
  expiresAt?: string | null;
}

/** Whether the reference is frozen at a version, or the live document. */
export type ContextMaterialization = 'snapshot' | 'live';

/** One thing a worker is given, and what it may do with it. */
export interface ContextReference {
  uri: string;
  access?: ContextAccess;
  required?: boolean;
  materialization?: ContextMaterialization;
  sharing?: ContextSharing;
  description?: string | null;
}

/** Who else in the execution tree sees the reference. */
export type ContextSharing = 'private' | 'tree';

/** What the worker is expected to cost, for scheduling, never for billing. */
export interface CostHint {
  currency?: string;
  perExecution?: number | null;
  perInputToken?: number | null;
  perOutputToken?: number | null;
}

/** The sensitivity of the data an execution may touch. */
export type DataClassification =
  'public' | 'internal' | 'confidential' | 'restricted';

/** The execution `executions.delegate` created, or found under its key. */
export interface DelegateAnswer {
  acknowledgement: Acknowledgement;
  detail?: string | null;
  /** Whether the durable service took the execution. False leaves it created, and detail says why. */
  dispatched: boolean;
  execution: Execution;
  success?: boolean;
}

/** The bounds a tree is created under, defaulted to 19.8's decision. */
export interface DelegationLimits {
  maxDepth?: number;
  maxChildrenPerParent?: number;
  maxExecutionsPerTree?: number;
}

/** A descriptor read from a foreign document, and what was lost on the way. */
export interface DescriptorMapping {
  source: DescriptorSource;
  descriptor: AgentDescriptor;
  gaps?: Array<MappingGap>;
}

/** Which document a descriptor was read from. */
export type DescriptorSource =
  'a2a-agent-card' | 'acp-agent-entry' | 'datalayer-agentspec';

/** The workers `agents.discover` found. */
export interface DiscoverAnswer {
  agents: Array<AgentDescriptor>;
  success?: boolean;
}

/** Why an execution, an attempt or a command did not do what was asked. */
export type ErrorCode =
  | 'worker_rejected'
  | 'worker_unreachable'
  | 'lease_expired'
  | 'unsupported_operation'
  | 'invalid_transition'
  | 'invalid_command'
  | 'conflict'
  | 'not_found'
  | 'permission_denied'
  | 'context_unavailable'
  | 'context_expired'
  | 'budget_exhausted'
  | 'deadline_exceeded'
  | 'depth_exceeded'
  | 'fan_out_exceeded'
  | 'approval_denied'
  | 'approval_timed_out'
  | 'internal';

/** One durable unit of delegated work. */
export interface Execution {
  executionId: string;
  parentExecutionId?: string | null;
  rootExecutionId: string;
  /** 0 at the root, checked against limits. */
  depth?: number;
  status?: ExecutionState;
  statusMessage?: string | null;
  agent: AgentBinding;
  objective: Objective;
  context?: ContextManifest;
  policy?: Policy;
  recovery?: Recovery;
  trace?: Trace;
  currentAttemptId?: string | null;
  attemptCount?: number;
  createdAt: string;
  updatedAt: string;
  error?: OrchestrationError | null;
}

/** One execution, its attempts, and the milestones it reached. */
export interface ExecutionAnswer {
  acknowledgements: Array<Acknowledgement>;
  attempts: Array<Attempt>;
  execution: Execution;
  success?: boolean;
}

/** One thing that happened to one execution. */
export interface ExecutionEvent {
  eventId: string;
  type: ExecutionEventType;
  sequence: number;
  /** From the control plane's clock. */
  emittedAt: string;
  rootExecutionId: string;
  executionId: string;
  parentExecutionId?: string | null;
  attemptId?: string | null;
  agentId?: string | null;
  sessionId?: string | null;
  protocol?: AgentProtocol | null;
  traceparent?: string | null;
  state?: ExecutionState | null;
  previousState?: ExecutionState | null;
  /** What was observed, which produced the state. */
  lifecycleEvent?: LifecycleEvent | null;
  acknowledgement?: Acknowledgement | null;
  artifact?: Artifact | null;
  error?: OrchestrationError | null;
  /** The platform approval this event is waiting on, if any. */
  approvalUid?: string | null;
  message?: string | null;
  /** What the adapter observed that has no canonical field yet. It comes from a worker, so it is data to be shown, never instructions to be followed. */
  data?: Record<string, unknown> | null;
}

/** What an event is telling a subscriber. */
export type ExecutionEventType =
  | 'execution.state_changed'
  | 'execution.acknowledged'
  | 'execution.progress'
  | 'execution.artifact_registered'
  | 'execution.approval_requested'
  | 'execution.steered'
  | 'execution.error';

/** Where an execution has got to. */
export type ExecutionState =
  | 'created'
  | 'assigned'
  | 'running'
  | 'waiting'
  | 'paused'
  | 'retrying'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'terminated';

/** One node of a tree: enough to draw it and to know where it stands. */
export interface ExecutionSummary {
  agentId: string;
  depth: number;
  executionId: string;
  goal: string;
  parentExecutionId?: string | null;
  protocol: AgentProtocol;
  status: ExecutionState;
  updatedAt: string;
}

/** Executions of the caller's account, oldest first. */
export interface ExecutionsAnswer {
  executions: Array<Execution>;
  success?: boolean;
}

/** Stop the work without deleting its history. */
export interface ExecutionsCancel {
  command?: 'executions.cancel';
  /** From the caller, for acceptance latency. */
  issuedAt?: string | null;
  /** The W3C context of the caller, so the tree is one trace. */
  traceparent?: string | null;
  idempotencyKey: string;
  executionId: string;
  reason?: string | null;
  /** Cancel the executions below this one too. */
  cascade?: boolean;
}

/** Persist recoverable state. */
export interface ExecutionsCheckpoint {
  command?: 'executions.checkpoint';
  /** From the caller, for acceptance latency. */
  issuedAt?: string | null;
  /** The W3C context of the caller, so the tree is one trace. */
  traceparent?: string | null;
  idempotencyKey: string;
  executionId: string;
  label?: string | null;
}

/** Retrieve the registered results and artifacts. */
export interface ExecutionsCollect {
  command?: 'executions.collect';
  /** From the caller, for acceptance latency. */
  issuedAt?: string | null;
  /** The W3C context of the caller, so the tree is one trace. */
  traceparent?: string | null;
  executionId: string;
  includeChildren?: boolean;
  artifactTypes?: Array<ArtifactType>;
}

/** Assign an objective and a context to a worker. */
export interface ExecutionsDelegate {
  command?: 'executions.delegate';
  /** From the caller, for acceptance latency. */
  issuedAt?: string | null;
  /** The W3C context of the caller, so the tree is one trace. */
  traceparent?: string | null;
  idempotencyKey: string;
  parentExecutionId?: string | null;
  /** A child's place under its parent, named by the parent; only a child has one. */
  slot?: string | null;
  agent: AgentBinding;
  objective: Objective;
  context?: ContextManifest;
  policy?: Policy;
  recovery?: Recovery;
  trace?: Trace;
}

/** Request a recoverable pause. */
export interface ExecutionsPause {
  command?: 'executions.pause';
  /** From the caller, for acceptance latency. */
  issuedAt?: string | null;
  /** The W3C context of the caller, so the tree is one trace. */
  traceparent?: string | null;
  idempotencyKey: string;
  executionId: string;
  reason?: string | null;
}

/** Resume from the current state, or from a checkpoint. */
export interface ExecutionsResume {
  command?: 'executions.resume';
  /** From the caller, for acceptance latency. */
  issuedAt?: string | null;
  /** The W3C context of the caller, so the tree is one trace. */
  traceparent?: string | null;
  idempotencyKey: string;
  executionId: string;
  checkpointId?: string | null;
}

/** Add instructions, and possibly context, while the work is active. */
export interface ExecutionsSteer {
  command?: 'executions.steer';
  /** From the caller, for acceptance latency. */
  issuedAt?: string | null;
  /** The W3C context of the caller, so the tree is one trace. */
  traceparent?: string | null;
  idempotencyKey: string;
  executionId: string;
  instructions: string;
  references?: Array<ContextReference>;
}

/** Stream canonical events and state changes. */
export interface ExecutionsSubscribe {
  command?: 'executions.subscribe';
  /** From the caller, for acceptance latency. */
  issuedAt?: string | null;
  /** The W3C context of the caller, so the tree is one trace. */
  traceparent?: string | null;
  executionId: string;
  includeChildren?: boolean;
  /** Replay from this event onwards, so a reconnect loses nothing. */
  fromSequence?: number | null;
  /** Only these lifecycle events; empty means every event. */
  events?: Array<LifecycleEvent>;
}

/** Release the worker or session, where that is permitted. */
export interface ExecutionsTerminate {
  command?: 'executions.terminate';
  /** From the caller, for acceptance latency. */
  issuedAt?: string | null;
  /** The W3C context of the caller, so the tree is one trace. */
  traceparent?: string | null;
  idempotencyKey: string;
  executionId: string;
  releaseWorker?: boolean;
  reason?: string | null;
}

/** How long the worker is expected to take, in milliseconds. */
export interface LatencyHint {
  acceptanceP50Ms?: number | null;
  completionP50Ms?: number | null;
  completionP95Ms?: number | null;
}

/** What is observed or commanded, which may move an execution. */
export type LifecycleEvent =
  | 'assign'
  | 'start'
  | 'wait'
  | 'pause'
  | 'resume'
  | 'retry'
  | 'complete'
  | 'fail'
  | 'cancel'
  | 'terminate';

/** A manifest held against what the platform actually has (O0-09). */
export interface ManifestResolution {
  references?: Array<ReferenceResolution>;
  usable?: boolean;
  errors?: Array<OrchestrationError>;
}

/** One thing a mapping could not carry, and why (O0-08). */
export interface MappingGap {
  field: string;
  reason: string;
}

/** A command that changes something, and so must be safe to deliver twice. */
export interface MutatingCommand {
  command: CommandName;
  /** From the caller, for acceptance latency. */
  issuedAt?: string | null;
  /** The W3C context of the caller, so the tree is one trace. */
  traceparent?: string | null;
  idempotencyKey: string;
}

/** What the worker is being asked for, and how it will be judged. */
export interface Objective {
  goal: string;
  acceptanceCriteria?: Array<string>;
  /** Steering that applies from the start, not added later. */
  instructions?: string | null;
}

/** One failure, as it is reported and stored. */
export interface OrchestrationError {
  code: ErrorCode;
  message: string;
  retryable?: boolean;
  /** Which adapter, worker or service reported it. */
  source?: string | null;
  details?: Record<string, unknown> | null;
}

/** What the worker may reach beyond its context manifest. */
export interface Permissions {
  tools?: Array<string> | null;
  agents?: Array<string> | null;
  sandboxes?: boolean;
  network?: boolean;
}

/** Everything that constrains an execution rather than describing it. */
export interface Policy {
  /** Absolute, and never extended by a child. */
  deadline?: string | null;
  budget?: Budget;
  permissions?: Permissions;
  dataClassification?: DataClassification | null;
  limits?: DelegationLimits;
  /** Whether a person must accept the result before it commits. */
  approvalRequired?: boolean;
}

/** One way to reach a worker: a protocol and where it answers. */
export interface ProtocolEndpoint {
  protocol: AgentProtocol;
  /** Absent for a worker the control plane launches itself. */
  url?: string | null;
  /** How the protocol is carried, as the source names it: stdio, websocket or http for ACP, a binding such as JSONRPC for A2A. */
  transport?: string | null;
  /** The version of the protocol this endpoint speaks, not of the agent. Both A2A interfaces and ACP agents declare one. */
  protocolVersion?: string | null;
}

/** A command that changes nothing, and so needs no idempotency key. */
export interface ReadCommand {
  command: CommandName;
  /** From the caller, for acceptance latency. */
  issuedAt?: string | null;
  /** The W3C context of the caller, so the tree is one trace. */
  traceparent?: string | null;
}

/** What has to be true for this execution to be recoverable. */
export interface Recovery {
  retryPolicy?: RetryPolicy;
  checkpointRequired?: boolean;
}

/** What one reference turned out to be, as the resolver reports it. */
export interface ReferenceResolution {
  uri: string;
  status: ReferenceStatus;
  /** The version served, which a live reference outgrows. */
  resolvedVersion?: string | null;
  contentHash?: string | null;
  mediaType?: string | null;
  sizeBytes?: number | null;
  resolvedAt?: string | null;
  /** Why it is not resolved, from the service that refused. */
  error?: OrchestrationError | null;
}

/** What a resolver found when it looked one reference up (O0-09). */
export type ReferenceStatus = 'resolved' | 'denied' | 'missing' | 'unavailable';

/** An execution's live report (O1-15): the artifact naming its document. */
export interface ReportAnswer {
  artifact: Artifact;
  execution: Execution;
  success?: boolean;
}

/** How a failed attempt is tried again: 19.8's two retries, backing off. */
export interface RetryPolicy {
  maxRetries?: number;
  initialBackoffSeconds?: number;
  backoffMultiplier?: number;
  maxBackoffSeconds?: number;
}

/** What the worker needs to run, when the control plane provisions it. */
export interface RuntimeRequirements {
  cpu?: number | null;
  gpu?: number | null;
  memoryMb?: number | null;
  region?: string | null;
  /** A Datalayer runtime environment name, when it runs on one. */
  environment?: string | null;
}

/** The W3C context that makes one tree one trace (section 10, O0-11). */
export interface Trace {
  traceparent?: string | null;
  tracestate?: string | null;
}

/** The tree an execution is in, as it was announced. */
export interface TreeAnswer {
  success?: boolean;
  tree: TreeSummary;
}

/** A tree of executions at a glance, as the user channel carries it (O1-09). */
export interface TreeSummary {
  /** Executions by status. */
  counts: Record<string, number>;
  executions: Array<ExecutionSummary>;
  rootExecutionId: string;
  /** Whether every execution of the tree has ended. */
  terminal: boolean;
}

/** How much of what a worker says may be believed. */
export type TrustLevel = 'untrusted' | 'verified' | 'internal';

/** What one attempt spent, as its worker reported it (O2-10). */
export interface Usage {
  inputTokens?: number | null;
  outputTokens?: number | null;
  cost?: number | null;
  currency?: string;
}

/** A worker an execution can be bound to, created or attached. */
export interface Worker {
  agentId: string;
  endpoint?: string | null;
  protocol: AgentProtocol;
  sessionId?: string | null;
  /** What the adapter of this protocol can ask the worker for. */
  supportedOperations?: Array<WorkerOperation>;
  /** The durable run bringing a created worker's compute up. */
  workflowUid?: string | null;
}

/** The worker `agents.create` or `agents.attach` produced. */
export interface WorkerAnswer {
  detail?: string | null;
  success?: boolean;
  worker: Worker;
}

/** A lifecycle operation a worker supports, named as section 6.2 names it. */
export type WorkerOperation =
  | 'delegate'
  | 'steer'
  | 'pause'
  | 'resume'
  | 'cancel'
  | 'checkpoint'
  | 'collect'
  | 'terminate'
  | 'subscribe';

/** The lifecycle of section 6.1: what a state accepts, and where it leads. */
export interface OrchestrationLifecycle {
  readonly initial: ExecutionState;
  readonly states: readonly ExecutionState[];
  readonly terminal: readonly ExecutionState[];
  readonly events: readonly LifecycleEvent[];
  readonly transitions: Readonly<
    Record<ExecutionState, Readonly<LifecycleMoves>>
  >;
}

/** Where one state goes, for the events it accepts. */
export type LifecycleMoves = Partial<Record<LifecycleEvent, ExecutionState>>;

export const ORCHESTRATION_LIFECYCLE: OrchestrationLifecycle = {
  initial: 'created',
  states: [
    'created',
    'assigned',
    'running',
    'waiting',
    'paused',
    'retrying',
    'completed',
    'failed',
    'cancelled',
    'terminated',
  ],
  terminal: ['completed', 'failed', 'cancelled', 'terminated'],
  events: [
    'assign',
    'start',
    'wait',
    'pause',
    'resume',
    'retry',
    'complete',
    'fail',
    'cancel',
    'terminate',
  ],
  transitions: {
    created: {
      cancel: 'cancelled',
      terminate: 'terminated',
      fail: 'failed',
      assign: 'assigned',
    },
    assigned: {
      cancel: 'cancelled',
      terminate: 'terminated',
      fail: 'failed',
      start: 'running',
      retry: 'retrying',
    },
    running: {
      cancel: 'cancelled',
      terminate: 'terminated',
      fail: 'failed',
      wait: 'waiting',
      pause: 'paused',
      retry: 'retrying',
      complete: 'completed',
    },
    waiting: {
      cancel: 'cancelled',
      terminate: 'terminated',
      fail: 'failed',
      resume: 'running',
      retry: 'retrying',
    },
    paused: {
      cancel: 'cancelled',
      terminate: 'terminated',
      fail: 'failed',
      resume: 'running',
    },
    retrying: {
      cancel: 'cancelled',
      terminate: 'terminated',
      fail: 'failed',
      start: 'running',
    },
    completed: {},
    failed: {},
    cancelled: {},
    terminated: {},
  },
};

/** One of the twelve commands, and whether it needs an idempotency key. */
export interface OrchestrationCommand {
  readonly name: CommandName;
  readonly mutating: boolean;
}

export const ORCHESTRATION_COMMANDS: readonly OrchestrationCommand[] = [
  { name: 'agents.discover', mutating: false },
  { name: 'agents.create', mutating: true },
  { name: 'agents.attach', mutating: true },
  { name: 'executions.delegate', mutating: true },
  { name: 'executions.steer', mutating: true },
  { name: 'executions.pause', mutating: true },
  { name: 'executions.resume', mutating: true },
  { name: 'executions.cancel', mutating: true },
  { name: 'executions.checkpoint', mutating: true },
  { name: 'executions.collect', mutating: false },
  { name: 'executions.terminate', mutating: true },
  { name: 'executions.subscribe', mutating: false },
];

/** The five milestones of section 6.3, in the order they are reached. */
export const ORCHESTRATION_ACKNOWLEDGEMENT_ORDER: readonly AcknowledgementKind[] =
  ['received', 'accepted', 'started', 'checkpointed', 'completed'];

/** The default limits of 19.8, read from the models' own defaults. */
export interface OrchestrationLimits {
  readonly delegation: DelegationLimits;
  readonly retry: RetryPolicy;
}

export const ORCHESTRATION_LIMITS: OrchestrationLimits = {
  delegation: {
    maxDepth: 3,
    maxChildrenPerParent: 8,
    maxExecutionsPerTree: 32,
  },
  retry: {
    maxRetries: 2,
    initialBackoffSeconds: 1.0,
    backoffMultiplier: 2.0,
    maxBackoffSeconds: 60.0,
  },
};

/** What each model declares, for the fixture checks of O0-01. */
export interface OrchestrationModelFields {
  readonly required: readonly string[];
  readonly optional: readonly string[];
  /** The model each nested property holds, by property name. */
  readonly refs: Readonly<Record<string, string>>;
}

export const ORCHESTRATION_FIELDS: Record<string, OrchestrationModelFields> = {
  Acknowledgement: {
    required: ['acknowledgedAt', 'executionId', 'kind'],
    optional: [
      'attemptId',
      'checkpointId',
      'command',
      'detail',
      'idempotencyKey',
    ],
    refs: {},
  },
  AgentAuthentication: {
    required: [],
    optional: ['audience', 'schemes', 'scopes'],
    refs: {},
  },
  AgentBinding: {
    required: ['agentId', 'capability', 'protocol'],
    optional: ['endpoint', 'sessionId'],
    refs: {},
  },
  AgentCardMapping: {
    required: ['card'],
    optional: ['gaps'],
    refs: { gaps: 'MappingGap' },
  },
  AgentDescriptor: {
    required: ['agentId', 'name'],
    optional: [
      'authentication',
      'availability',
      'capabilities',
      'cost',
      'dataClassifications',
      'description',
      'endpoints',
      'inputContentTypes',
      'latency',
      'outputContentTypes',
      'runtime',
      'skills',
      'supportedOperations',
      'trustLevel',
      'version',
    ],
    refs: {
      authentication: 'AgentAuthentication',
      availability: 'Availability',
      cost: 'CostHint',
      endpoints: 'ProtocolEndpoint',
      latency: 'LatencyHint',
      runtime: 'RuntimeRequirements',
      skills: 'AgentSkill',
    },
  },
  AgentSkill: {
    required: ['id', 'name'],
    optional: ['description', 'examples', 'tags'],
    refs: {},
  },
  AgentsAttach: {
    required: ['agentId', 'idempotencyKey', 'protocol'],
    optional: ['command', 'endpoint', 'issuedAt', 'sessionId', 'traceparent'],
    refs: {},
  },
  AgentsCreate: {
    required: ['agentId', 'idempotencyKey', 'protocol'],
    optional: ['command', 'executionId', 'issuedAt', 'runtime', 'traceparent'],
    refs: { runtime: 'RuntimeRequirements' },
  },
  AgentsDiscover: {
    required: [],
    optional: [
      'capabilities',
      'command',
      'dataClassification',
      'issuedAt',
      'limit',
      'minimumTrustLevel',
      'operations',
      'protocols',
      'region',
      'traceparent',
    ],
    refs: {},
  },
  Artifact: {
    required: ['artifactId', 'name', 'type'],
    optional: [
      'committedBy',
      'mediaType',
      'provenance',
      'reference',
      'sizeBytes',
      'status',
      'summary',
      'supersededBy',
    ],
    refs: { provenance: 'ArtifactProvenance' },
  },
  ArtifactCommit: {
    required: ['attemptId', 'executionId', 'winningAttemptId', 'won'],
    optional: ['artifacts'],
    refs: { artifacts: 'Artifact' },
  },
  ArtifactProvenance: {
    required: ['agentId', 'attemptId', 'executionId', 'producedAt'],
    optional: ['contentHash', 'sourceReferences', 'traceId'],
    refs: {},
  },
  Attempt: {
    required: ['agentId', 'attemptId', 'executionId', 'number', 'protocol'],
    optional: [
      'endedAt',
      'error',
      'leaseExpiresAt',
      'protocolTaskId',
      'resumedFrom',
      'sessionId',
      'startedAt',
      'state',
      'usage',
    ],
    refs: { error: 'OrchestrationError', usage: 'Usage' },
  },
  Availability: {
    required: [],
    optional: ['available', 'maxConcurrentExecutions', 'queueDepth'],
    refs: {},
  },
  Budget: {
    required: [],
    optional: [
      'cost',
      'credits',
      'currency',
      'executions',
      'inputTokens',
      'outputTokens',
      'wallClockSeconds',
    ],
    refs: {},
  },
  CancelAnswer: {
    required: ['acknowledgement', 'delivered', 'execution'],
    optional: ['cancelledExecutionIds', 'detail', 'success'],
    refs: { acknowledgement: 'Acknowledgement', execution: 'Execution' },
  },
  CollectAnswer: {
    required: ['artifacts', 'execution'],
    optional: ['attempts', 'children', 'success'],
    refs: {
      artifacts: 'Artifact',
      attempts: 'Attempt',
      children: 'Execution',
      execution: 'Execution',
    },
  },
  Command: {
    required: ['command'],
    optional: ['issuedAt', 'traceparent'],
    refs: {},
  },
  CommandAnswer: {
    required: ['acknowledgement', 'delivered', 'execution'],
    optional: ['detail', 'success'],
    refs: { acknowledgement: 'Acknowledgement', execution: 'Execution' },
  },
  ContextManifest: {
    required: [],
    optional: ['expiresAt', 'references', 'scope'],
    refs: { references: 'ContextReference' },
  },
  ContextReference: {
    required: ['uri'],
    optional: [
      'access',
      'description',
      'materialization',
      'required',
      'sharing',
    ],
    refs: {},
  },
  CostHint: {
    required: [],
    optional: ['currency', 'perExecution', 'perInputToken', 'perOutputToken'],
    refs: {},
  },
  DelegateAnswer: {
    required: ['acknowledgement', 'dispatched', 'execution'],
    optional: ['detail', 'success'],
    refs: { acknowledgement: 'Acknowledgement', execution: 'Execution' },
  },
  DelegationLimits: {
    required: [],
    optional: ['maxChildrenPerParent', 'maxDepth', 'maxExecutionsPerTree'],
    refs: {},
  },
  DescriptorMapping: {
    required: ['descriptor', 'source'],
    optional: ['gaps'],
    refs: { descriptor: 'AgentDescriptor', gaps: 'MappingGap' },
  },
  DiscoverAnswer: {
    required: ['agents'],
    optional: ['success'],
    refs: { agents: 'AgentDescriptor' },
  },
  Execution: {
    required: [
      'agent',
      'createdAt',
      'executionId',
      'objective',
      'rootExecutionId',
      'updatedAt',
    ],
    optional: [
      'attemptCount',
      'context',
      'currentAttemptId',
      'depth',
      'error',
      'parentExecutionId',
      'policy',
      'recovery',
      'status',
      'statusMessage',
      'trace',
    ],
    refs: {
      agent: 'AgentBinding',
      context: 'ContextManifest',
      error: 'OrchestrationError',
      objective: 'Objective',
      policy: 'Policy',
      recovery: 'Recovery',
      trace: 'Trace',
    },
  },
  ExecutionAnswer: {
    required: ['acknowledgements', 'attempts', 'execution'],
    optional: ['success'],
    refs: {
      acknowledgements: 'Acknowledgement',
      attempts: 'Attempt',
      execution: 'Execution',
    },
  },
  ExecutionEvent: {
    required: [
      'emittedAt',
      'eventId',
      'executionId',
      'rootExecutionId',
      'sequence',
      'type',
    ],
    optional: [
      'acknowledgement',
      'agentId',
      'approvalUid',
      'artifact',
      'attemptId',
      'data',
      'error',
      'lifecycleEvent',
      'message',
      'parentExecutionId',
      'previousState',
      'protocol',
      'sessionId',
      'state',
      'traceparent',
    ],
    refs: {
      acknowledgement: 'Acknowledgement',
      artifact: 'Artifact',
      error: 'OrchestrationError',
    },
  },
  ExecutionSummary: {
    required: [
      'agentId',
      'depth',
      'executionId',
      'goal',
      'protocol',
      'status',
      'updatedAt',
    ],
    optional: ['parentExecutionId'],
    refs: {},
  },
  ExecutionsAnswer: {
    required: ['executions'],
    optional: ['success'],
    refs: { executions: 'Execution' },
  },
  ExecutionsCancel: {
    required: ['executionId', 'idempotencyKey'],
    optional: ['cascade', 'command', 'issuedAt', 'reason', 'traceparent'],
    refs: {},
  },
  ExecutionsCheckpoint: {
    required: ['executionId', 'idempotencyKey'],
    optional: ['command', 'issuedAt', 'label', 'traceparent'],
    refs: {},
  },
  ExecutionsCollect: {
    required: ['executionId'],
    optional: [
      'artifactTypes',
      'command',
      'includeChildren',
      'issuedAt',
      'traceparent',
    ],
    refs: {},
  },
  ExecutionsDelegate: {
    required: ['agent', 'idempotencyKey', 'objective'],
    optional: [
      'command',
      'context',
      'issuedAt',
      'parentExecutionId',
      'policy',
      'recovery',
      'slot',
      'trace',
      'traceparent',
    ],
    refs: {
      agent: 'AgentBinding',
      context: 'ContextManifest',
      objective: 'Objective',
      policy: 'Policy',
      recovery: 'Recovery',
      trace: 'Trace',
    },
  },
  ExecutionsPause: {
    required: ['executionId', 'idempotencyKey'],
    optional: ['command', 'issuedAt', 'reason', 'traceparent'],
    refs: {},
  },
  ExecutionsResume: {
    required: ['executionId', 'idempotencyKey'],
    optional: ['checkpointId', 'command', 'issuedAt', 'traceparent'],
    refs: {},
  },
  ExecutionsSteer: {
    required: ['executionId', 'idempotencyKey', 'instructions'],
    optional: ['command', 'issuedAt', 'references', 'traceparent'],
    refs: { references: 'ContextReference' },
  },
  ExecutionsSubscribe: {
    required: ['executionId'],
    optional: [
      'command',
      'events',
      'fromSequence',
      'includeChildren',
      'issuedAt',
      'traceparent',
    ],
    refs: {},
  },
  ExecutionsTerminate: {
    required: ['executionId', 'idempotencyKey'],
    optional: ['command', 'issuedAt', 'reason', 'releaseWorker', 'traceparent'],
    refs: {},
  },
  LatencyHint: {
    required: [],
    optional: ['acceptanceP50Ms', 'completionP50Ms', 'completionP95Ms'],
    refs: {},
  },
  ManifestResolution: {
    required: [],
    optional: ['errors', 'references', 'usable'],
    refs: { errors: 'OrchestrationError', references: 'ReferenceResolution' },
  },
  MappingGap: { required: ['field', 'reason'], optional: [], refs: {} },
  MutatingCommand: {
    required: ['command', 'idempotencyKey'],
    optional: ['issuedAt', 'traceparent'],
    refs: {},
  },
  Objective: {
    required: ['goal'],
    optional: ['acceptanceCriteria', 'instructions'],
    refs: {},
  },
  OrchestrationError: {
    required: ['code', 'message'],
    optional: ['details', 'retryable', 'source'],
    refs: {},
  },
  Permissions: {
    required: [],
    optional: ['agents', 'network', 'sandboxes', 'tools'],
    refs: {},
  },
  Policy: {
    required: [],
    optional: [
      'approvalRequired',
      'budget',
      'dataClassification',
      'deadline',
      'limits',
      'permissions',
    ],
    refs: {
      budget: 'Budget',
      limits: 'DelegationLimits',
      permissions: 'Permissions',
    },
  },
  ProtocolEndpoint: {
    required: ['protocol'],
    optional: ['protocolVersion', 'transport', 'url'],
    refs: {},
  },
  ReadCommand: {
    required: ['command'],
    optional: ['issuedAt', 'traceparent'],
    refs: {},
  },
  Recovery: {
    required: [],
    optional: ['checkpointRequired', 'retryPolicy'],
    refs: { retryPolicy: 'RetryPolicy' },
  },
  ReferenceResolution: {
    required: ['status', 'uri'],
    optional: [
      'contentHash',
      'error',
      'mediaType',
      'resolvedAt',
      'resolvedVersion',
      'sizeBytes',
    ],
    refs: { error: 'OrchestrationError' },
  },
  ReportAnswer: {
    required: ['artifact', 'execution'],
    optional: ['success'],
    refs: { artifact: 'Artifact', execution: 'Execution' },
  },
  RetryPolicy: {
    required: [],
    optional: [
      'backoffMultiplier',
      'initialBackoffSeconds',
      'maxBackoffSeconds',
      'maxRetries',
    ],
    refs: {},
  },
  RuntimeRequirements: {
    required: [],
    optional: ['cpu', 'environment', 'gpu', 'memoryMb', 'region'],
    refs: {},
  },
  Trace: { required: [], optional: ['traceparent', 'tracestate'], refs: {} },
  TreeAnswer: {
    required: ['tree'],
    optional: ['success'],
    refs: { tree: 'TreeSummary' },
  },
  TreeSummary: {
    required: ['counts', 'executions', 'rootExecutionId', 'terminal'],
    optional: [],
    refs: { executions: 'ExecutionSummary' },
  },
  Usage: {
    required: [],
    optional: ['cost', 'currency', 'inputTokens', 'outputTokens'],
    refs: {},
  },
  Worker: {
    required: ['agentId', 'protocol'],
    optional: ['endpoint', 'sessionId', 'supportedOperations', 'workflowUid'],
    refs: {},
  },
  WorkerAnswer: {
    required: ['worker'],
    optional: ['detail', 'success'],
    refs: { worker: 'Worker' },
  },
};

/** One operation of the control plane: its name, method and path. */
export interface OrchestrationOperation {
  readonly operation: string;
  readonly method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  readonly path: string;
}

export const ORCHESTRATION_API: readonly OrchestrationOperation[] = [
  {
    operation: 'agents.attach',
    method: 'POST',
    path: '/api/ai-agents/v1/orchestration/agents/attach',
  },
  {
    operation: 'agents.create',
    method: 'POST',
    path: '/api/ai-agents/v1/orchestration/agents/create',
  },
  {
    operation: 'agents.discover',
    method: 'POST',
    path: '/api/ai-agents/v1/orchestration/agents/discover',
  },
  {
    operation: 'executions.list',
    method: 'GET',
    path: '/api/ai-agents/v1/orchestration/executions',
  },
  {
    operation: 'executions.cancel',
    method: 'POST',
    path: '/api/ai-agents/v1/orchestration/executions/cancel',
  },
  {
    operation: 'executions.checkpoint',
    method: 'POST',
    path: '/api/ai-agents/v1/orchestration/executions/checkpoint',
  },
  {
    operation: 'executions.collect',
    method: 'POST',
    path: '/api/ai-agents/v1/orchestration/executions/collect',
  },
  {
    operation: 'executions.delegate',
    method: 'POST',
    path: '/api/ai-agents/v1/orchestration/executions/delegate',
  },
  {
    operation: 'executions.pause',
    method: 'POST',
    path: '/api/ai-agents/v1/orchestration/executions/pause',
  },
  {
    operation: 'executions.resume',
    method: 'POST',
    path: '/api/ai-agents/v1/orchestration/executions/resume',
  },
  {
    operation: 'executions.steer',
    method: 'POST',
    path: '/api/ai-agents/v1/orchestration/executions/steer',
  },
  {
    operation: 'executions.terminate',
    method: 'POST',
    path: '/api/ai-agents/v1/orchestration/executions/terminate',
  },
  {
    operation: 'executions.get',
    method: 'GET',
    path: '/api/ai-agents/v1/orchestration/executions/{execution_id}',
  },
  {
    operation: 'executions.announce',
    method: 'POST',
    path: '/api/ai-agents/v1/orchestration/executions/{execution_id}/announce',
  },
  {
    operation: 'executions.subscribe',
    method: 'GET',
    path: '/api/ai-agents/v1/orchestration/executions/{execution_id}/events',
  },
  {
    operation: 'executions.report',
    method: 'POST',
    path: '/api/ai-agents/v1/orchestration/executions/{execution_id}/report',
  },
];
