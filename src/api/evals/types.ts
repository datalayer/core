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
  /** What the runs say, kept by the launch refresh (B2-10). */
  run_count?: number;
  latest_launch_id?: string;
  latest_pass_rate?: number | null;
  best_pass_rate?: number | null;
  last_run_status?: string;
  last_run_at?: string | null;
  estimated_cost?: number | null;
  environment?: string;
  subject_refs?: string[];
  schema: Record<string, unknown>;
  evalset_evaluators: EvalEvaluatorRef[];
  report_evaluators: EvalEvaluatorRef[];
  tags: string[];
  metadata: Record<string, unknown>;
  cases: EvalCase[];
  is_public: boolean;
  /** The benchmark this one was taken from, and its version then (B5-03). */
  derived_from_uid?: string;
  derived_from_version?: number | null;
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
/** What an experiment runs (B2-11): `{kind, ref, model?, ...}`. */
export interface EvalSubject {
  kind: string;
  ref: string;
  model?: string;
  endpoint?: string;
  image?: string;
  command?: string;
  provider?: string;
}

export interface EvalExperiment {
  id: string;
  owner_uid: string;
  evalset_id: string | null;
  name: string;
  description: string;
  status: string;
  /** What the experiment runs (B2-11); empty on an experiment without one. */
  subject?: EvalSubject | Record<string, never>;
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
  /** Credits consumed so far (B2-06). */
  cost_credits?: number | null;
  /** The credits this run may spend; null is no cap (B2-06). */
  budget_limit?: number | null;
  /** The compute asked for: environment, slots, concurrency, time_reservation (B2-06). */
  compute?: Record<string, unknown>;
  elapsed_ms?: number | null;
  /** Why the run is `blocked`, when it is (B2-06). */
  blocked_reason?: string;
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
  /** The credits the launch may spend; null is no cap (B2-06). */
  budget_limit?: number | null;
  /** The compute asked for: environment, slots, concurrency, time_reservation (B2-06). */
  compute?: Record<string, unknown>;
  /** Why the launch is `blocked`, when it is (B2-06). */
  blocked_reason?: string;
  /**
   * The window of live traffic an interactive launch is (B2-13):
   * `{size, starts_at, ends_at}`. Empty on a batch launch.
   */
  window?: { size?: string; starts_at?: string; ends_at?: string };
  archived: boolean;
  started_at: string | null;
  ended_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

/** One problem the pre-launch validation found (B2-07). */
export interface LaunchPlanProblem {
  code: string;
  severity: 'error' | 'warning';
  message: string;
  experiment_id?: string;
}

/** The plan of a launch before it is made (B2-07). */
export interface LaunchPlanResponse {
  success: boolean;
  /** No error-level problem: the launch would run. */
  ok: boolean;
  /** The mode the plan was made for (B2-13). */
  run_mode: EvalKind;
  /**
   * How run mode, run environment and execution target relate, stated by
   * the service so the wizard explains it inline rather than failing after
   * submission (BENCHMARK.md section 9).
   */
  run_mode_constraint: string;
  problems: LaunchPlanProblem[];
  estimate: {
    cases: number;
    experiments: number;
    slots: number;
    duration_seconds: number;
    duration_basis: 'history' | 'assumed' | 'mixed';
    /** Credits the launch would reserve; null when the burning rate is unknown. */
    credits_reserved: number | null;
    credits_available: number | null;
    budget_limit: number | null;
  };
  compute: {
    environment: string;
    slots: number;
    concurrency: number;
    time_reservation: number;
    burning_rate: number | null;
  };
  experiments: Array<{
    id: string;
    name: string;
    subject: EvalSubject | Record<string, never>;
    execution_target: string;
    seconds_per_case: number;
    duration_basis: 'history' | 'assumed';
    duration_seconds: number;
    credits_reserved: number | null;
  }>;
  approvals: { pending_tool_approvals: number; budget_limit: number | null };
  unsupported_evaluators: string[];
}

/** What a claim moved, by document type; empty when it was a repeat (B2-14). */
export interface ClaimTrialResponse {
  success: boolean;
  trial: Record<string, unknown> | null;
  moved: Record<string, number>;
}

/** The subjects an experiment can have and the models offered (B2-11). */
export interface SubjectsResponse {
  success: boolean;
  kinds: Array<{ kind: string; executable: boolean; label: string }>;
  models: string[];
  default_model: string;
  default_provider: string;
  /** False when AI Inference could not be asked. */
  models_available: boolean;
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
  /** The experiment the event was produced for, graded with its evaluators (B2-13). */
  experiment_id?: string;
  evalset_id?: string;
  /** The interactive launch whose window the event fell into, if one was open. */
  launch_id?: string;
  /** The case it answered, when it answered one. */
  case_id?: string;
  /** What the experiment's evaluators said of it, server-side. */
  results?: Array<Record<string, unknown>>;
  created_at: string;
}

/** What the rolling windows raised on a live target (B2-13). */
export interface LiveEvalAlert {
  id: string;
  owner_uid: string;
  target_id: string;
  target_type: string;
  experiment_id: string;
  launch_id: string;
  /** `failure_spike` or `drift`. */
  kind: string;
  message: string;
  /** The failed share, or the pass rate that drifted. */
  value: number | null;
  /** The pass rate before the drift. */
  baseline: number | null;
  threshold: number | null;
  window_events: number;
  created_at: string | null;
}

/** A live target's rolling-window summary. */
export interface LiveEvalTarget {
  target_id: string;
  target_type: string;
  event_count: number;
  passed_count: number;
  failed_count?: number;
  pass_rate: number | null;
  avg_value: number | null;
  last_event_at: string | null;
  /** What the target's newest event is bound to (B2-13). */
  experiment_id?: string;
  evalset_id?: string;
  launch_id?: string;
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

export interface LiveEventCreateResponse {
  success: boolean;
  event: LiveEvalEvent;
  /** The alerts this event's arrival raised, if any (B2-13). */
  alerts: LiveEvalAlert[];
}

export interface LiveAlertListResponse {
  success: boolean;
  window: string;
  alerts: LiveEvalAlert[];
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
  /** Published to the library by its owner, with what it is written in. */
  is_public: boolean;
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

/**
 * A view of an investigation's page kept under a name for everybody on it
 * (B4-11), in the investigation's `metadata.views`.
 */
export interface SavedInvestigationView {
  name: string;
  /** What the page shows: `surface`, and `block`, `case` or `cell`. */
  query: string;
  saved_by_uid?: string;
  saved_at?: string;
}

export interface SaveInvestigationViewRequest {
  name: string;
  query: string;
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

// --- Sharing and permissions (B4-05) ----------------------------------------

/** The records that carry grants, as their routes name them. */
export type SharedEvalsRecord =
  'evalsets' | 'launches' | 'investigations' | 'reports';

/**
 * The levels a grant gives, lowest first, each allowing what the ones before
 * it allow: Viewer, Reviewer, Runner, Editor.
 */
export type EvalsAccessLevel = 'view' | 'review' | 'execute' | 'update';

/** A level, or the owner — which is never granted: only an owner shares or publishes. */
export type EvalsRole = EvalsAccessLevel | 'owner';

export interface EvalsPrincipals {
  userUids: string[];
  teamUids: string[];
  organizationUids: string[];
}

export type EvalsSharingUpdate = Partial<
  Record<EvalsAccessLevel, Partial<EvalsPrincipals>>
>;

export interface EvalsSharingResponse extends SuccessResponse {
  sharing: {
    kind: 'evalset' | 'launch' | 'investigation';
    uid: string;
    /** The account the record belongs to. */
    owner_uid: string;
    access: Record<EvalsAccessLevel, EvalsPrincipals>;
    shared: boolean;
  };
}

export interface EvalsPermissionsResponse extends SuccessResponse {
  kind: string;
  uid: string;
  role: EvalsRole;
  permissions: Record<EvalsRole, boolean>;
}

// --- Reports (B4-04) --------------------------------------------------------

/** The states of a report (section 13.3), in the order a report goes through them. */
export type ReportState =
  | 'draft'
  | 'in_review'
  | 'approved'
  | 'published_private'
  | 'published_public'
  | 'superseded';

/** A report over runs of one benchmark: its document and its state. */
export interface EvalReport {
  id: string;
  owner_uid: string;
  account_uid: string;
  evalset_id: string;
  evalset_version: number | null;
  launch_ids: string[];
  run_ids: string[];
  /** The Lexical document in the benchmarks space people read and edit. */
  document_uid: string;
  title: string;
  state: ReportState;
  version: number;
  /** Who was asked to approve it. */
  reviewer_uids: string[];
  approved_by_uid: string;
  approved_at: string | null;
  /** The version of the document kept when it was approved. */
  approved_version_uid: string;
  published_at: string | null;
  supersedes_uid: string;
  superseded_by_uid: string;
  created_by_uid: string;
  created_at: string | null;
  updated_at: string | null;
}

export interface ReportResponse extends SuccessResponse {
  report: EvalReport;
}

export interface ReportListResponse extends SuccessResponse {
  total: number;
  reports: EvalReport[];
}

export interface CreateReportRequest {
  evalset_id: string;
  launch_ids: string[];
  title?: string;
}

/** A move of a report; `superseded` is not one, a regeneration is. */
export interface MoveReportRequest {
  state: Exclude<ReportState, 'superseded'>;
  /** Who is asked to approve it, when it is sent for review. */
  reviewer_uids?: string[];
  /** What the approval says. */
  message?: string;
}

export interface RegenerateReportResponse extends ReportResponse {
  superseded: EvalReport;
}

export type ReportsQuery = {
  evalset_id?: string;
  launch_id?: string;
  state?: ReportState;
  limit?: number;
  offset?: number;
};

// --- Review decisions (B4-03) -------------------------------------------------

export type DecisionKind =
  | 'accepted_regression'
  | 'expected_change'
  | 'evaluator_issue'
  | 'data_issue'
  | 'action_required';

export type DecisionOutcome =
  'approved' | 'blocked' | 'accepted_with_limitations';

/** What a decision is about: a block of a report, a task, a run, a launch. */
export type DecisionScope = 'block' | 'case' | 'run' | 'launch';

/** The records a decision is made on, as their routes name them. */
export type DecisionSubject = 'reports' | 'investigations';

/** A decision as it was made; decisions are appended, never edited. */
export interface EvalDecision {
  id: string;
  owner_uid: string;
  account_uid: string;
  subject: 'report' | 'investigation';
  subject_uid: string;
  kind: DecisionKind;
  outcome: DecisionOutcome;
  scope: DecisionScope;
  /** What in the scope: the block, the task, the run or the launch. */
  scope_ref: string;
  note: string;
  decided_by_uid: string;
  decided_at: string | null;
  /** The comment thread the decision resolves. */
  thread_uid: string;
  evalset_id: string;
  launch_ids: string[];
}

export interface DecisionRequest {
  kind: DecisionKind;
  outcome: DecisionOutcome;
  scope: DecisionScope;
  scope_ref?: string;
  note?: string;
  thread_uid?: string;
}

export interface DecisionResponse extends SuccessResponse {
  decision: EvalDecision;
}

export interface DecisionListResponse extends SuccessResponse {
  total: number;
  decisions: EvalDecision[];
}

// --- Shared with the caller (B4-07) -------------------------------------------

/** A report or an investigation somebody shared with the caller. */
export interface SharedEvalsItem {
  kind: 'report' | 'investigation';
  uid: string;
  title: string;
  owner_uid: string;
  /** The level the grants give the caller. */
  role: EvalsAccessLevel;
  /** The report's state or the investigation's status. */
  state: string;
  /** The page of the app it opens. */
  link: string;
  updated_at: string | null;
}

export interface SharedWithMeResponse extends SuccessResponse {
  total: number;
  shared: SharedEvalsItem[];
}

// --- CI reports imported as snapshots (B4-09) ---------------------------------

/** A report file CI produced, kept on its benchmark as it was. */
export interface EvalReportImport {
  id: string;
  owner_uid: string;
  account_uid: string;
  evalset_id: string;
  format: 'csv' | 'markdown';
  name: string;
  run_ids: string[];
  launch_ids: string[];
  /** Run ids the file names that are no run of this benchmark here. */
  unmatched_run_ids: string[];
  imported_by_uid: string;
  /** The live report continued from it, once one is. */
  live_report_uid: string;
  investigation_uid: string;
  /** The file's text; left out of a listing. */
  content: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface ReportImportRequest {
  format: 'csv' | 'markdown';
  content: string;
  name?: string;
}

export interface ReportImportResponse extends SuccessResponse {
  import: EvalReportImport;
}

export interface ReportImportListResponse extends SuccessResponse {
  total: number;
  imports: EvalReportImport[];
}

export interface ContinueReportImportResponse extends ReportImportResponse {
  report_link: string;
  investigation_link: string;
}
