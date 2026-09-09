/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * The evals API, one function per endpoint.
 *
 * Paths mirror `tests/test_evals_api_contract.py` in the AI Agents service
 * and `evalsApiContract.spec.ts` in the landings UI. Downloads (export and
 * report) are URLs rather than requests: the browser opens them and the
 * service answers with an attachment.
 *
 * @module api/evals/client
 */

import {
  evalsRequest,
  evalsUrl,
  segment,
  type EvalsClientOptions,
} from './request';
import type {
  CaseListResponse,
  EvalsetVersionListResponse,
  EvalsetVersionResponse,
  InvestigationListResponse,
  InvestigationResponse,
  InvestigationScope,
  InvestigationStatus,
  LexicalReportResponse,
  ReportDocumentResponse,
  ResumeSandboxRequest,
  ResumeSandboxResponse,
  TaskInvestigationResponse,
  UpdateInvestigationRequest,
  EvalsetCategory,
  ImportEvalsetRequest,
  ImportEvalsetResponse,
  CaseResultListResponse,
  CaseResultResponse,
  CreateLaunchRequest,
  LaunchCancelResponse,
  LaunchListResponse,
  LaunchResponse,
  ReviewCaseRequest,
  RunCancelResponse,
  CaseRequest,
  CaseResponse,
  CreateEvalsetRequest,
  CreateExperimentRequest,
  CreateLiveEventRequest,
  CreateRunRequest,
  EvalKind,
  EvalRunEnvironment,
  EvalsetDeleteResponse,
  EvalsetListResponse,
  EvalsetResponse,
  ExperimentDeleteResponse,
  ExperimentListResponse,
  ExperimentResponse,
  LiveEventListResponse,
  LiveEventResponse,
  LiveTargetDeleteResponse,
  LiveTargetListResponse,
  PublicEvalsetDetailsResponse,
  RunListResponse,
  RunResponse,
  SuccessResponse,
  UpdateEvalsetRequest,
  UpdateExperimentRequest,
} from './types';

// --- Evalsets ---------------------------------------------------------------

export type ListEvalsetsQuery = {
  kind?: EvalKind;
  run_environment?: EvalRunEnvironment;
  category?: EvalsetCategory;
  q?: string;
  limit?: number;
  offset?: number;
};

export const listEvalsets = (
  options: EvalsClientOptions,
  query: ListEvalsetsQuery = {},
) => evalsRequest<EvalsetListResponse>(options, '/evalsets', { query });

export const getEvalset = (options: EvalsClientOptions, evalsetId: string) =>
  evalsRequest<EvalsetResponse>(options, `/evalsets/${segment(evalsetId)}`);

export const createEvalset = (
  options: EvalsClientOptions,
  body: CreateEvalsetRequest,
) =>
  evalsRequest<EvalsetResponse>(options, '/evalsets', { method: 'POST', body });

export const updateEvalset = (
  options: EvalsClientOptions,
  evalsetId: string,
  body: UpdateEvalsetRequest,
) =>
  evalsRequest<EvalsetResponse>(options, `/evalsets/${segment(evalsetId)}`, {
    method: 'PATCH',
    body,
  });

export const setEvalsetPublic = (
  options: EvalsClientOptions,
  evalsetId: string,
  isPublic: boolean,
) =>
  evalsRequest<EvalsetResponse>(
    options,
    `/evalsets/${segment(evalsetId)}/public`,
    {
      method: 'PATCH',
      body: { is_public: isPublic },
    },
  );

export const renameEvalset = (
  options: EvalsClientOptions,
  evalsetId: string,
  name: string,
) =>
  evalsRequest<EvalsetResponse>(
    options,
    `/evalsets/${segment(evalsetId)}/rename`,
    {
      method: 'PATCH',
      body: { name },
    },
  );

export const deleteEvalset = (options: EvalsClientOptions, evalsetId: string) =>
  evalsRequest<EvalsetDeleteResponse>(
    options,
    `/evalsets/${segment(evalsetId)}`,
    {
      method: 'DELETE',
    },
  );

// --- Cases ------------------------------------------------------------------

export const listCases = (options: EvalsClientOptions, evalsetId: string) =>
  evalsRequest<CaseListResponse>(
    options,
    `/evalsets/${segment(evalsetId)}/cases`,
  );

export const createCase = (
  options: EvalsClientOptions,
  evalsetId: string,
  body: CaseRequest,
) =>
  evalsRequest<CaseResponse>(options, `/evalsets/${segment(evalsetId)}/cases`, {
    method: 'POST',
    body,
  });

export const updateCase = (
  options: EvalsClientOptions,
  evalsetId: string,
  caseId: string,
  body: Partial<CaseRequest>,
) =>
  evalsRequest<CaseResponse>(
    options,
    `/evalsets/${segment(evalsetId)}/cases/${segment(caseId)}`,
    {
      method: 'PATCH',
      body,
    },
  );

export const deleteCase = (
  options: EvalsClientOptions,
  evalsetId: string,
  caseId: string,
) =>
  evalsRequest<SuccessResponse>(
    options,
    `/evalsets/${segment(evalsetId)}/cases/${segment(caseId)}`,
    {
      method: 'DELETE',
    },
  );

// --- Downloads --------------------------------------------------------------

export type EvalsetExportFormat = 'json' | 'pydantic-evals';
export type EvalsetReportFormat = 'markdown' | 'csv';

/** The URL the browser opens to download an evalset definition. */
export const evalsetExportUrl = (
  options: EvalsClientOptions,
  evalsetId: string,
  format: EvalsetExportFormat = 'json',
) => evalsUrl(options, `/evalsets/${segment(evalsetId)}/export`, { format });

/** The URL the browser opens to download a generated report. */
export const evalsetReportUrl = (
  options: EvalsClientOptions,
  evalsetId: string,
  format: EvalsetReportFormat = 'markdown',
  runLimit?: number,
) =>
  evalsUrl(options, `/evalsets/${segment(evalsetId)}/report`, {
    format,
    run_limit: runLimit,
  });

// --- Public reads -----------------------------------------------------------

export const getPublicEvalset = (
  options: EvalsClientOptions,
  evalsetId: string,
) =>
  evalsRequest<EvalsetResponse>(
    options,
    `/public/evalsets/${segment(evalsetId)}`,
  );

export const getPublicEvalsetDetails = (
  options: EvalsClientOptions,
  evalsetId: string,
  runsLimit?: number,
) =>
  evalsRequest<PublicEvalsetDetailsResponse>(
    options,
    `/public/evalsets/${segment(evalsetId)}/details`,
    {
      query: { runs_limit: runsLimit },
    },
  );

export const listPublicRuns = (
  options: EvalsClientOptions,
  evalsetId: string,
  experimentId: string,
  query: { limit?: number; offset?: number } = {},
) =>
  evalsRequest<RunListResponse>(
    options,
    `/public/evalsets/${segment(evalsetId)}/experiments/${segment(experimentId)}/runs`,
    { query },
  );

// --- Experiments ------------------------------------------------------------

export type ListExperimentsQuery = {
  evalset_id?: string;
  status?: string;
  limit?: number;
  offset?: number;
};

export const createExperiment = (
  options: EvalsClientOptions,
  body: CreateExperimentRequest,
) =>
  evalsRequest<ExperimentResponse>(options, '/experiments', {
    method: 'POST',
    body,
  });

export const listExperiments = (
  options: EvalsClientOptions,
  query: ListExperimentsQuery = {},
) => evalsRequest<ExperimentListResponse>(options, '/experiments', { query });

export const getExperiment = (
  options: EvalsClientOptions,
  experimentId: string,
) =>
  evalsRequest<ExperimentResponse>(
    options,
    `/experiments/${segment(experimentId)}`,
  );

export const updateExperiment = (
  options: EvalsClientOptions,
  experimentId: string,
  body: UpdateExperimentRequest,
) =>
  evalsRequest<ExperimentResponse>(
    options,
    `/experiments/${segment(experimentId)}`,
    {
      method: 'PATCH',
      body,
    },
  );

export const deleteExperiment = (
  options: EvalsClientOptions,
  experimentId: string,
) =>
  evalsRequest<ExperimentDeleteResponse>(
    options,
    `/experiments/${segment(experimentId)}`,
    {
      method: 'DELETE',
    },
  );

// --- Runs -------------------------------------------------------------------

export const createRun = (
  options: EvalsClientOptions,
  experimentId: string,
  body: CreateRunRequest,
) =>
  evalsRequest<RunResponse>(
    options,
    `/experiments/${segment(experimentId)}/runs`,
    {
      method: 'POST',
      body,
    },
  );

export const listRuns = (
  options: EvalsClientOptions,
  experimentId: string,
  query: { limit?: number; offset?: number } = {},
) =>
  evalsRequest<RunListResponse>(
    options,
    `/experiments/${segment(experimentId)}/runs`,
    { query },
  );

export const getRun = (options: EvalsClientOptions, runId: string) =>
  evalsRequest<RunResponse>(options, `/runs/${segment(runId)}`);

export const deleteRun = (options: EvalsClientOptions, runId: string) =>
  evalsRequest<SuccessResponse>(options, `/runs/${segment(runId)}`, {
    method: 'DELETE',
  });

export const compareRuns = (options: EvalsClientOptions, runIds: string[]) =>
  evalsRequest<RunListResponse>(options, '/runs/compare', {
    method: 'POST',
    body: { run_ids: runIds },
  });

// --- Live -------------------------------------------------------------------

export type ListLiveEventsQuery = {
  target_id: string;
  target_type?: string;
  window?: string;
  evaluator_name?: string;
  limit?: number;
  offset?: number;
};

export const createLiveEvent = (
  options: EvalsClientOptions,
  body: CreateLiveEventRequest,
) =>
  evalsRequest<LiveEventResponse>(options, '/live/events', {
    method: 'POST',
    body,
  });

export const listLiveTargets = (
  options: EvalsClientOptions,
  query: { window?: string; limit?: number } = {},
) => evalsRequest<LiveTargetListResponse>(options, '/live/targets', { query });

export const listLiveEvents = (
  options: EvalsClientOptions,
  query: ListLiveEventsQuery,
) => evalsRequest<LiveEventListResponse>(options, '/live/events', { query });

export const deleteLiveTarget = (
  options: EvalsClientOptions,
  targetId: string,
  targetType: string = 'agent',
) =>
  evalsRequest<LiveTargetDeleteResponse>(options, '/live/targets', {
    method: 'DELETE',
    query: { target_id: targetId, target_type: targetType },
  });

// --- Runs across experiments, task results, launches (B2-01 to B2-03) -------

export type ListRunsQuery = {
  evalset_id?: string;
  launch_id?: string;
  experiment_id?: string;
  status?: string;
  limit?: number;
  offset?: number;
};

export const listRunsAcross = (
  options: EvalsClientOptions,
  query: ListRunsQuery = {},
) => evalsRequest<RunListResponse>(options, '/runs', { query });

export const cancelRun = (options: EvalsClientOptions, runId: string) =>
  evalsRequest<RunCancelResponse>(options, `/runs/${segment(runId)}/cancel`, {
    method: 'POST',
  });

export type ListCaseResultsQuery = {
  status?: string;
  category?: string;
  difficulty?: string;
  failure_mode?: string;
  min_score?: number;
  max_score?: number;
  q?: string;
  sort?: string;
  limit?: number;
  offset?: number;
};

/** The task grid of a run, filtered and paged by the service. */
export const listCaseResults = (
  options: EvalsClientOptions,
  runId: string,
  query: ListCaseResultsQuery = {},
) =>
  evalsRequest<CaseResultListResponse>(
    options,
    `/runs/${segment(runId)}/cases`,
    { query },
  );

export const getCaseResult = (
  options: EvalsClientOptions,
  runId: string,
  caseId: string,
) =>
  evalsRequest<CaseResultResponse>(
    options,
    `/runs/${segment(runId)}/cases/${segment(caseId)}`,
  );

export const reviewCaseResult = (
  options: EvalsClientOptions,
  runId: string,
  caseId: string,
  body: ReviewCaseRequest,
) =>
  evalsRequest<CaseResultResponse>(
    options,
    `/runs/${segment(runId)}/cases/${segment(caseId)}/review`,
    {
      method: 'PATCH',
      body,
    },
  );

/** One submission of a benchmark across its experiments. */
export const createLaunch = (
  options: EvalsClientOptions,
  evalsetId: string,
  body: CreateLaunchRequest,
) =>
  evalsRequest<LaunchResponse>(
    options,
    `/evalsets/${segment(evalsetId)}/launches`,
    {
      method: 'POST',
      body,
    },
  );

export type ListLaunchesQuery = {
  evalset_id?: string;
  status?: string;
  include_archived?: boolean;
  limit?: number;
  offset?: number;
};

export const listLaunches = (
  options: EvalsClientOptions,
  query: ListLaunchesQuery = {},
) => evalsRequest<LaunchListResponse>(options, '/launches', { query });

export const getLaunch = (options: EvalsClientOptions, launchId: string) =>
  evalsRequest<LaunchResponse>(options, `/launches/${segment(launchId)}`);

export const cancelLaunch = (options: EvalsClientOptions, launchId: string) =>
  evalsRequest<LaunchCancelResponse>(
    options,
    `/launches/${segment(launchId)}/cancel`,
    { method: 'POST' },
  );

export const archiveLaunch = (options: EvalsClientOptions, launchId: string) =>
  evalsRequest<SuccessResponse>(
    options,
    `/launches/${segment(launchId)}/archive`,
    { method: 'POST' },
  );

// --- Spec import and definition versions (B2-08, B2-09) --------------------

/** An evalset from a spec file, the same body the CLI and the action send. */
export const importEvalset = (
  options: EvalsClientOptions,
  body: ImportEvalsetRequest,
) =>
  evalsRequest<ImportEvalsetResponse>(options, '/evalsets/import', {
    method: 'POST',
    body,
  });

export const listEvalsetVersions = (
  options: EvalsClientOptions,
  evalsetId: string,
  query: { limit?: number; offset?: number } = {},
) =>
  evalsRequest<EvalsetVersionListResponse>(
    options,
    `/evalsets/${segment(evalsetId)}/versions`,
    { query },
  );

export const getEvalsetVersion = (
  options: EvalsClientOptions,
  evalsetId: string,
  version: number,
) =>
  evalsRequest<EvalsetVersionResponse>(
    options,
    `/evalsets/${segment(evalsetId)}/versions/${segment(String(version))}`,
  );

// --- Reports of a launch and a run, and the report document (B3-03) --------

/** The benchmark's whole report (every launch) as a serialized Lexical editor state. */
export const getEvalsetReportDocument = (
  options: EvalsClientOptions,
  evalsetId: string,
  query: { run_limit?: number } = {},
) =>
  evalsRequest<LexicalReportResponse>(
    options,
    `/evalsets/${segment(evalsetId)}/report`,
    { query: { ...query, format: 'lexical' } },
  );

/** The launch's report as a serialized Lexical editor state. */
export const getLaunchReportDocument = (
  options: EvalsClientOptions,
  launchId: string,
  query: { run_limit?: number } = {},
) =>
  evalsRequest<LexicalReportResponse>(
    options,
    `/launches/${segment(launchId)}/report`,
    { query: { ...query, format: 'lexical' } },
  );

/** Where a launch's Markdown or CSV report is downloaded from. */
export const launchReportUrl = (
  options: EvalsClientOptions,
  launchId: string,
  format: 'markdown' | 'csv',
) => evalsUrl(options, `/launches/${segment(launchId)}/report`, { format });

/** One run's report as a serialized Lexical editor state, with its task documents. */
export const getRunReportDocument = (
  options: EvalsClientOptions,
  runId: string,
) =>
  evalsRequest<LexicalReportResponse>(
    options,
    `/runs/${segment(runId)}/report`,
    { query: { format: 'lexical' } },
  );

export const runReportUrl = (
  options: EvalsClientOptions,
  runId: string,
  format: 'markdown' | 'csv',
) => evalsUrl(options, `/runs/${segment(runId)}/report`, { format });

/** Write the launch's report into the account's benchmarks space. */
export const writeLaunchReportDocument = (
  options: EvalsClientOptions,
  launchId: string,
  body: { name?: string } = {},
) =>
  evalsRequest<ReportDocumentResponse>(
    options,
    `/launches/${segment(launchId)}/report-document`,
    { method: 'POST', body },
  );

// --- Investigations and the task sandbox (B3-02, B3-05) --------------------

/** Open the investigation of one task, or get the one already open. */
export const openTaskInvestigation = (
  options: EvalsClientOptions,
  runId: string,
  caseId: string,
) =>
  evalsRequest<TaskInvestigationResponse>(
    options,
    `/runs/${segment(runId)}/tasks/${segment(caseId)}/investigation`,
    { method: 'POST' },
  );

export const openLaunchInvestigation = (
  options: EvalsClientOptions,
  launchId: string,
) =>
  evalsRequest<InvestigationResponse>(
    options,
    `/launches/${segment(launchId)}/investigation`,
    { method: 'POST' },
  );

export type InvestigationsQuery = {
  evalset_id?: string;
  launch_id?: string;
  run_id?: string;
  scope?: InvestigationScope;
  status?: InvestigationStatus;
  limit?: number;
  offset?: number;
};

export const listInvestigations = (
  options: EvalsClientOptions,
  query: InvestigationsQuery = {},
) =>
  evalsRequest<InvestigationListResponse>(options, '/investigations', {
    query,
  });

export const getInvestigation = (
  options: EvalsClientOptions,
  investigationId: string,
) =>
  evalsRequest<InvestigationResponse>(
    options,
    `/investigations/${segment(investigationId)}`,
  );

export const updateInvestigation = (
  options: EvalsClientOptions,
  investigationId: string,
  body: UpdateInvestigationRequest,
) =>
  evalsRequest<InvestigationResponse>(
    options,
    `/investigations/${segment(investigationId)}`,
    { method: 'PATCH', body },
  );

/** Bring the task's sandbox back from its snapshot, bound to its investigation. */
export const resumeTaskSandbox = (
  options: EvalsClientOptions,
  runId: string,
  caseId: string,
  body: ResumeSandboxRequest = {},
) =>
  evalsRequest<ResumeSandboxResponse>(
    options,
    `/runs/${segment(runId)}/tasks/${segment(caseId)}/sandbox/resume`,
    { method: 'POST', body },
  );
