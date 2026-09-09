/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * The evals objects as the AI Agents service sends them.
 *
 * These are the wire shapes, snake_case and all: the service's pydantic
 * models (`EvalRecord`, `EvalExperimentRecord`, `EvalRunRecord`, …) are the
 * source of truth and the landings UI reads these fields by their wire
 * names. Nothing here is camel-cased on the way in — `metrics`, `summary`
 * and `report` are free-form documents whose keys mean what the runner
 * wrote, and a converter that renamed them would rename data.
 *
 * Product words: a **Benchmark** is an evalset, an **Experiment** is an
 * experiment, a **Run** is a run, a **Task result** is a case result.
 *
 * @module api/evals/types
 */

/** Where an evalset was created, which decides where its runs may execute. */
export type EvalRunEnvironment = 'ui' | 'sdk';

/** Fixed cases replayed (`batch`) or live events evaluated (`interactive`). */
export type EvalKind = 'batch' | 'interactive';

/** What a benchmark measures, the closed list section 12.5 renders by. */
export type EvalsetCategory =
  'data' | 'coding' | 'tool-use' | 'model' | 'visual' | 'performance';

/** The dataset revision a benchmark reads; contents holds the revision. */
export interface DatasetRef {
  source_uid: string;
  revision_uid: string;
}

/** A named evaluator with its configuration, as a spec declares it. */
export interface EvalEvaluatorRef {
  name: string;
  config?: Record<string, unknown>;
  [key: string]: unknown;
}

/** One case of an evalset: what is asked and what is expected. */
export interface EvalCase {
  id: string;
  name: string;
  inputs: Record<string, unknown>;
  expected_output: unknown;
  evaluators: EvalEvaluatorRef[];
  metadata: Record<string, unknown>;
}

/** An evalset, the benchmark: versioned cases, evaluators, metadata. */
export interface Evalset {
  id: string;
  owner_uid: string;
  name: string;
  description: string;
  run_environment: EvalRunEnvironment;
  kind: EvalKind;
  category: EvalsetCategory | '';
  dataset_ref: DatasetRef | null;
  /** Moves on every change to cases, evaluators, schema or category. */
  version: number;
  /** How many launches this benchmark has had; the next is number + 1. */
  launch_count: number;
  schema: Record<string, unknown>;
  evalset_evaluators: EvalEvaluatorRef[];
  report_evaluators: EvalEvaluatorRef[];
  tags: string[];
  metadata: Record<string, unknown>;
  cases: EvalCase[];
  is_public: boolean;
  created_at: string;
  updated_at: string;
  archived: boolean;
}

/** One version of a benchmark's definition, kept as it was. */
export interface EvalsetVersion {
  evalset_id: string;
  version: number;
  name: string;
  category: string;
  schema: Record<string, unknown>;
  evalset_evaluators: EvalEvaluatorRef[];
  report_evaluators: EvalEvaluatorRef[];
  cases: EvalCase[];
  created_at: string | null;
}

/** One experiment: an agentspec, model, prompt or configuration under test. */
export interface EvalExperiment {
  id: string;
  owner_uid: string;
  evalset_id: string | null;
  name: string;
  description: string;
  status: string;
  config: Record<string, unknown>;
  summary: Record<string, unknown>;
  tags: string[];
  created_at: string;
  updated_at: string;
  archived: boolean;
}

/** A case's outcome inside a run's metrics. */
export interface EvalCaseResult {
  name: string;
  passed: boolean;
  status: string;
  score: number;
  category?: string;
  difficulty?: string;
  prompt?: string;
  output?: string;
  [key: string]: unknown;
}

/** An evaluator's aggregate inside a run's metrics. */
export interface EvalEvaluatorResult {
  name: string;
  scope: 'evalset' | 'report' | string;
  score?: number | null;
  passed?: boolean | null;
  passed_cases?: number;
  total_cases?: number;
  summary?: string;
  threshold?: number;
  observed?: number;
  [key: string]: unknown;
}

/** What the runner measured for a run. Free-form beyond the known keys. */
export interface EvalRunMetrics {
  pass_rate?: number;
  total_cases?: number;
  passed?: number;
  failed?: number;
  avg_score?: number;
  case_results?: EvalCaseResult[];
  evaluator_results?: EvalEvaluatorResult[];
  [key: string]: unknown;
}

/** One execution of an experiment, inside a launch. */
export interface EvalRun {
  id: string;
  experiment_id: string;
  /** The evalset the experiment belongs to; empty on rows not yet backfilled. */
  evalset_id: string;
  /** The launch this run is part of; every run has one once backfilled. */
  launch_id: string;
  /** The durable workflow executing it, once one does. */
  workflow_uid: string;
  /** The evalset version the run was started against; null on rows not yet backfilled. */
  evalset_version?: number | null;
  owner_uid: string;
  status: string;
  started_at: string | null;
  ended_at: string | null;
  metrics: EvalRunMetrics;
  summary: Record<string, unknown>;
  report: Record<string, unknown>;
  /** Cases done, running and failed so far, as the workflow projects them. */
  progress: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

/** A task result: one case of one run, its own document. */
export interface EvalTaskResult {
  id: string;
  run_id: string;
  launch_id: string;
  experiment_id: string;
  evalset_id: string;
  owner_uid: string;
  case_id: string;
  name: string;
  status: string;
  score: number | null;
  passed: boolean | null;
  explanation: string;
  category: string;
  difficulty: string;
  failure_mode: string;
  failure_stage: string;
  prompt: string;
  output: string;
  trajectory: unknown[];
  sandbox_snapshot_uid: string;
  notebook_uid: string;
  /** The investigation opened on this task, once one is (B3-02). */
  investigation_uid?: string;
  artifact_uids: string[];
  cost_credits: number | null;
  duration_ms: number | null;
  reviewed_by: string;
  started_at: string | null;
  ended_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

/** A launch: one submission of a benchmark across its experiments. */
export interface EvalLaunch {
  id: string;
  owner_uid: string;
  account_uid: string;
  evalset_id: string;
  evalset_version: number | null;
  /** The number people say: "Run 128". */
  number: number | null;
  experiment_ids: string[];
  run_ids: string[];
  status: string;
  run_mode: EvalKind;
  config: Record<string, unknown>;
  progress: Record<string, unknown>;
  created_by_uid: string;
  /** The report document written for this launch, once one is (B3-03). */
  report_document_uid?: string;
  archived: boolean;
  started_at: string | null;
  ended_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

/** One evaluated event of a live target. */
export interface LiveEvalEvent {
  id: string;
  owner_uid: string;
  target_id: string;
  target_type: string;
  evaluator_name: string;
  metric_name: string;
  value_num: number | null;
  label: string;
  passed: boolean | null;
  attributes: Record<string, unknown>;
  created_at: string;
}

/** A live target's rolling-window summary. */
export interface LiveEvalTarget {
  target_id: string;
  target_type: string;
  event_count: number;
  passed_count: number;
  pass_rate: number | null;
  avg_value: number | null;
  last_event_at: string | null;
  [key: string]: unknown;
}

// --- Request bodies ---------------------------------------------------------

export interface CreateEvalsetRequest {
  name: string;
  description?: string;
  run_environment?: EvalRunEnvironment;
  kind?: EvalKind;
  category?: EvalsetCategory;
  dataset_ref?: DatasetRef;
  schema?: Record<string, unknown>;
  evalset_evaluators?: EvalEvaluatorRef[];
  report_evaluators?: EvalEvaluatorRef[];
  tags?: string[];
  metadata?: Record<string, unknown>;
  cases?: Array<Partial<EvalCase>>;
  is_public?: boolean;
}

/** Every field optional; `kind` is not updatable through the API. */
export type UpdateEvalsetRequest = Partial<Omit<CreateEvalsetRequest, 'kind'>>;

export interface CaseRequest {
  name: string;
  inputs?: Record<string, unknown>;
  expected_output?: unknown;
  evaluators?: EvalEvaluatorRef[];
  metadata?: Record<string, unknown>;
}

export interface CreateExperimentRequest {
  evalset_id?: string | null;
  name: string;
  description?: string;
  status?: string;
  config?: Record<string, unknown>;
  summary?: Record<string, unknown>;
  tags?: string[];
}

export type UpdateExperimentRequest = Partial<CreateExperimentRequest>;

export interface CreateRunRequest {
  status?: string;
  started_at?: string | null;
  ended_at?: string | null;
  metrics?: Record<string, unknown>;
  summary?: Record<string, unknown>;
  report?: Record<string, unknown>;
}

export interface CreateLiveEventRequest {
  target_id: string;
  target_type?: string;
  evaluator_name: string;
  metric_name: string;
  value_num?: number | null;
  label?: string;
  passed?: boolean | null;
  attributes?: Record<string, unknown>;
  created_at?: string | null;
}

// --- Responses --------------------------------------------------------------

export interface EvalsetResponse {
  success: boolean;
  evalset: Evalset;
}

export interface EvalsetListResponse {
  success: boolean;
  total: number;
  evalsets: Evalset[];
}

export interface EvalsetDeleteResponse {
  success: boolean;
  cascade: {
    experiments_deleted: number;
    runs_deleted: number;
    cases_deleted: number;
  };
}

export interface CaseListResponse {
  success: boolean;
  total: number;
  cases: EvalCase[];
}

export interface CaseResponse {
  success: boolean;
  case: EvalCase;
}

export interface PublicEvalsetDetailsResponse {
  success: boolean;
  evalset: Evalset;
  cases: EvalCase[];
  experiments: EvalExperiment[];
  experiments_total: number;
  runs_limit: number;
  runs_by_experiment: Record<string, EvalRun[]>;
  runs_total_by_experiment: Record<string, number>;
}

export interface ExperimentResponse {
  success: boolean;
  experiment: EvalExperiment;
}

export interface ExperimentListResponse {
  success: boolean;
  total: number;
  experiments: EvalExperiment[];
}

export interface ExperimentDeleteResponse {
  success: boolean;
  cascade: { runs_deleted: number };
}

export interface RunResponse {
  success: boolean;
  run: EvalRun;
}

export interface RunListResponse {
  success: boolean;
  total: number;
  runs: EvalRun[];
}

export interface LiveEventResponse {
  success: boolean;
  event: LiveEvalEvent;
}

export interface LiveTargetListResponse {
  success: boolean;
  window: string;
  targets: LiveEvalTarget[];
}

export interface LiveEventListResponse {
  success: boolean;
  window: string;
  total: number;
  events: LiveEvalEvent[];
}

export interface LiveTargetDeleteResponse {
  success: boolean;
  target_id: string;
  target_type: string;
  deleted_events: number;
}

export interface SuccessResponse {
  success: boolean;
}

export interface CreateLaunchRequest {
  experiment_ids: string[];
  run_mode?: EvalKind;
  config?: Record<string, unknown>;
}

export interface ReviewCaseRequest {
  status: 'passed' | 'failed';
  explanation?: string;
  failure_mode?: string;
}

export interface LaunchResponse {
  success: boolean;
  launch: EvalLaunch;
  runs: EvalRun[];
  /** Whether anything executes the queued runs yet. */
  executes?: boolean;
}

export interface LaunchListResponse {
  success: boolean;
  total: number;
  launches: EvalLaunch[];
}

export interface LaunchCancelResponse {
  success: boolean;
  launch: EvalLaunch;
  cancelled_runs: number;
}

export interface RunCancelResponse {
  success: boolean;
  run: EvalRun;
  execution_stopped: boolean;
}

export interface CaseResultListResponse {
  success: boolean;
  total: number;
  cases: EvalTaskResult[];
}

export interface CaseResultResponse {
  success: boolean;
  case: EvalTaskResult;
}

export interface ImportEvalsetRequest {
  /** An `*.evalset.json` spec, as the CLI and the action read it. */
  spec: Record<string, unknown>;
  run_environment?: EvalRunEnvironment;
}

export interface ImportEvalsetResponse extends EvalsetResponse {
  /** Evaluators the platform cannot run, left out of the evalset. */
  unsupported_evaluators: string[];
}

export interface EvalsetVersionListResponse {
  success: boolean;
  total: number;
  versions: EvalsetVersion[];
}

export interface EvalsetVersionResponse {
  success: boolean;
  version: EvalsetVersion;
}

// --- Investigations and the task sandbox (B3-02, B3-05) --------------------

export type InvestigationScope = 'case' | 'run' | 'launch' | 'window';
export type InvestigationStatus = 'open' | 'closed';
/** The restored sandbox, per section 12.6. */
export type SandboxState =
  'available' | 'restoring' | 'running' | 'expired' | 'none';

/** The work a person does on a benchmark result: one per task, run, launch or window. */
export interface EvalInvestigation {
  id: string;
  owner_uid: string;
  account_uid: string;
  scope: InvestigationScope;
  evalset_id: string;
  launch_id: string;
  run_id: string;
  case_id: string;
  window_id: string;
  title: string;
  status: InvestigationStatus;
  decision: string;
  /** The report document (spacer lexical) the investigation is written in. */
  document_uid: string;
  /** The notebook the investigation works in; a copy, never the evidence. */
  notebook_uid: string;
  /** The task's evidence notebook, written by the run. */
  evidence_notebook_uid: string;
  sandbox_snapshot_uid: string;
  /** The restored sandbox while it lives. */
  runtime_name: string;
  sandbox_workflow_uid: string;
  sandbox_state: SandboxState;
  created_by_uid: string;
  assignees: string[];
  metadata: Record<string, unknown>;
  created_at: string | null;
  updated_at: string | null;
}

export interface InvestigationResponse extends SuccessResponse {
  investigation: EvalInvestigation;
}

export interface TaskInvestigationResponse extends InvestigationResponse {
  case: EvalTaskResult;
}

export interface InvestigationListResponse extends SuccessResponse {
  total: number;
  investigations: EvalInvestigation[];
}

export interface UpdateInvestigationRequest {
  status?: InvestigationStatus;
  decision?: string;
  title?: string;
  assignees?: string[];
}

export interface ResumeSandboxRequest {
  /** Minutes the restored sandbox is reserved for. */
  time_reservation?: number;
  environment?: string;
}

export interface ResumeSandboxResponse extends InvestigationResponse {
  sandbox: {
    state: SandboxState;
    runtime_name: string;
    workflow_uid?: string;
    reused?: boolean;
  };
}

/** A serialized Lexical editor state, as the editor writes it. */
export interface LexicalReportResponse extends SuccessResponse {
  document: { root: Record<string, unknown> };
}

export interface ReportDocumentResponse extends SuccessResponse {
  document_uid: string;
  launch: EvalLaunch;
}
