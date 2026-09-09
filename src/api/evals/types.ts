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

/** One execution of an experiment. */
export interface EvalRun {
  id: string;
  experiment_id: string;
  owner_uid: string;
  status: string;
  started_at: string | null;
  ended_at: string | null;
  metrics: EvalRunMetrics;
  summary: Record<string, unknown>;
  report: Record<string, unknown>;
  created_at: string;
  updated_at: string;
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
