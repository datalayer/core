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
  CreateReportRequest,
  MoveReportRequest,
  RegenerateReportResponse,
  ReportListResponse,
  ReportResponse,
  ReportsQuery,
  DecisionListResponse,
  DecisionRequest,
  DecisionResponse,
  DecisionSubject,
  SharedWithMeResponse,
  ContinueReportImportResponse,
  ReportImportListResponse,
  ReportImportRequest,
  ReportImportResponse,
  EvalsPermissionsResponse,
  EvalsSharingResponse,
  EvalsSharingUpdate,
  SharedEvalsRecord,
  EvalEvaluatorRef,
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
  ClaimTrialResponse,
  LaunchPlanResponse,
  LaunchResponse,
  LiveAlertListResponse,
  SubjectsResponse,
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
  EvalsetPackagePreviewResponse,
  EvalsetPublicationResponse,
  EvalsetPublicationListResponse,
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

/**
 * Take a benchmark into the account the options name (B5-03): a private copy
 * of its definition that says what it was taken from. A published benchmark
 * is anybody's to take; an unpublished one, a Viewer's. `derivation` says why:
 * `fork` to change it, `compare` to run it against one's own agent (B5-05).
 */
export const cloneEvalset = (
  options: EvalsClientOptions,
  evalsetId: string,
  body: { name?: string; derivation?: 'fork' | 'compare' } = {},
) =>
  evalsRequest<EvalsetResponse>(
    options,
    `/evalsets/${segment(evalsetId)}/clone`,
    {
      method: 'POST',
      body,
    },
  );

/**
 * Propose the next version of a benchmark's definition, from an investigation
 * (B5-07): a task added or corrected, a corrected evaluator, a threshold
 * moved. The version records the investigation that asked for it.
 */
export const reviseEvalset = (
  options: EvalsClientOptions,
  evalsetId: string,
  body: {
    investigation_id: string;
    note?: string;
    case?: Record<string, unknown>;
    evalset_evaluators?: EvalEvaluatorRef[];
    report_evaluators?: EvalEvaluatorRef[];
  },
) =>
  evalsRequest<EvalsetResponse>(
    options,
    `/evalsets/${segment(evalsetId)}/revisions`,
    {
      method: 'POST',
      body,
    },
  );

/**
 * What publishing this benchmark would put in the library (B5-02): the
 * contents of the package, the enumeration the publication review shows, what
 * is left out and why, and everything that would refuse it — before anybody
 * presses the button, because a publication cannot be taken back from whoever
 * already read it.
 */
export const previewEvalsetPublication = (
  options: EvalsClientOptions,
  evalsetId: string,
  query: {
    /** Launch ids, comma separated; the benchmark's own where empty. */
    launches?: string;
    report?: string;
    /** Comment uids selected for publication; nothing is published unnamed. */
    comments?: string;
    decisions?: string;
    version?: number;
  } = {},
) =>
  evalsRequest<EvalsetPackagePreviewResponse>(
    options,
    `/evalsets/${segment(evalsetId)}/publication/preview`,
    { query },
  );

/**
 * Publish the package: the immutable snapshot of the definition, the data, the
 * subjects, the environment, the results, the report, the evidence and the
 * evaluators (section 14.3). Refused with `detail.problems` where section 14.5
 * says it cannot be published.
 */
export const publishEvalsetPackage = (
  options: EvalsClientOptions,
  evalsetId: string,
  body: {
    launch_ids?: string[];
    report_id?: string;
    comment_uids?: string[];
    decision_uids?: string[];
    note?: string;
    version?: number;
  } = {},
) =>
  evalsRequest<EvalsetPublicationResponse>(
    options,
    `/evalsets/${segment(evalsetId)}/publications`,
    {
      method: 'POST',
      body,
    },
  );

/** Every package published of this benchmark, withdrawn ones included. */
export const listEvalsetPublications = (
  options: EvalsClientOptions,
  evalsetId: string,
  query: { limit?: number; offset?: number } = {},
) =>
  evalsRequest<EvalsetPublicationListResponse>(
    options,
    `/evalsets/${segment(evalsetId)}/publications`,
    { query },
  );

/**
 * Take a package out of the library. What it holds stays as it was written:
 * withdrawing a snapshot does not make it editable.
 */
export const withdrawEvalsetPublication = (
  options: EvalsClientOptions,
  evalsetId: string,
  publicationId: string,
) =>
  evalsRequest<EvalsetPublicationResponse>(
    options,
    `/evalsets/${segment(evalsetId)}/publications/${segment(publicationId)}`,
    { method: 'DELETE' },
  );

/** The package a published benchmark stands for, to anybody (B5-02). */
export const getPublicEvalsetPublication = (
  options: EvalsClientOptions,
  evalsetId: string,
) =>
  evalsRequest<EvalsetPublicationResponse>(
    options,
    `/public/evalsets/${segment(evalsetId)}/publication`,
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

export type ListLiveAlertsQuery = {
  target_id?: string;
  target_type?: string;
  experiment_id?: string;
  launch_id?: string;
  window?: string;
  limit?: number;
};

/** The alerts the rolling windows raised: failure spikes and drifts (B2-13). */
export const listLiveAlerts = (
  options: EvalsClientOptions,
  query: ListLiveAlertsQuery = {},
) => evalsRequest<LiveAlertListResponse>(options, '/live/alerts', { query });

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

/**
 * Give an anonymous trial's work to the person who just signed in (B2-14):
 * the benchmark, the launch, its runs and everything under them, moved
 * rather than copied so a link the visitor kept still opens.
 *
 * Takes two credentials: the person's, in the client's options, and the
 * trial's own key, which travels in its header.
 */
export const claimTrial = (
  options: EvalsClientOptions,
  trialUid: string,
  trialToken: string,
) =>
  evalsRequest<ClaimTrialResponse>(options, '/trials/claim', {
    method: 'POST',
    body: { trial_uid: trialUid },
    headers: { 'X-Datalayer-Trial-Token': trialToken },
  });

/** The subjects an experiment can have, and the models offered (B2-11). */
export const listSubjects = (options: EvalsClientOptions) =>
  evalsRequest<SubjectsResponse>(options, '/subjects');

/**
 * What a page may report about what somebody did (B2-25, B3-12).
 *
 * The six lines of the funnel no record answers: nothing is written when
 * somebody opens the Run Benchmark wizard, reads a task, asks the result agent
 * a question, runs a follow-up cell, or pins evidence into a report. A closed
 * set, because a free-form label from a browser is a cardinality bomb with an
 * authenticated route in front of it.
 */
export type ProductEvent =
  | 'wizard.started'
  | 'wizard.completed'
  | 'task.opened'
  | 'question.asked'
  | 'cell.executed'
  | 'evidence.added';

/**
 * Count one of those.
 *
 * Nothing is stored, and the answer says only that it was counted. Never worth
 * failing a page for: a measure that breaks what somebody was doing is worse
 * than a measure nobody has.
 */
export const recordProductEvent = (
  options: EvalsClientOptions,
  event: ProductEvent,
) =>
  evalsRequest<{ success: boolean }>(options, '/measures', {
    method: 'POST',
    body: { event },
  });

/**
 * The plan of a launch before it is made (B2-07): estimated duration and
 * cost, the compute, and the problems that would stop it. Same body as the
 * launch; nothing is created.
 */
export const validateLaunch = (
  options: EvalsClientOptions,
  evalsetId: string,
  body: CreateLaunchRequest,
) =>
  evalsRequest<LaunchPlanResponse>(
    options,
    `/evalsets/${segment(evalsetId)}/launches/validate`,
    {
      method: 'POST',
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

/**
 * Publish an investigation to the library, or take it back: its owner's alone.
 * The document and the notebooks it is written in go public and private with
 * it.
 */
export const setInvestigationPublic = (
  options: EvalsClientOptions,
  investigationId: string,
  isPublic: boolean,
) =>
  evalsRequest<InvestigationResponse>(
    options,
    `/investigations/${segment(investigationId)}/public`,
    { method: 'PATCH', body: { is_public: isPublic } },
  );

/**
 * Keep the investigation's page as it is shown, under a name everybody on
 * the investigation sees; a view of that name is replaced (B4-11).
 */
export const saveInvestigationView = (
  options: EvalsClientOptions,
  investigationId: string,
  body: { name: string; query: string },
) =>
  evalsRequest<InvestigationResponse>(
    options,
    `/investigations/${segment(investigationId)}/views`,
    { method: 'POST', body },
  );

/** Forget a saved view of the investigation's page. */
export const forgetInvestigationView = (
  options: EvalsClientOptions,
  investigationId: string,
  name: string,
) =>
  evalsRequest<InvestigationResponse>(
    options,
    `/investigations/${segment(investigationId)}/views`,
    { method: 'DELETE', query: { name } },
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

// --- Sharing and permissions (B4-05) ----------------------------------------

/** Who a benchmark, one of its runs or an investigation is shared with; its owner's to read. */
export const getEvalsSharing = (
  options: EvalsClientOptions,
  record: SharedEvalsRecord,
  uid: string,
) =>
  evalsRequest<EvalsSharingResponse>(
    options,
    `/${record}/${segment(uid)}/sharing`,
  );

/** Replace the grants at the levels named; the others are kept. Its owner's to do. */
export const updateEvalsSharing = (
  options: EvalsClientOptions,
  record: SharedEvalsRecord,
  uid: string,
  access: EvalsSharingUpdate,
) =>
  evalsRequest<EvalsSharingResponse>(
    options,
    `/${record}/${segment(uid)}/sharing`,
    { method: 'PUT', body: { access } },
  );

/** The caller's role on the record, and what it allows. */
export const getEvalsPermissions = (
  options: EvalsClientOptions,
  record: SharedEvalsRecord,
  uid: string,
) =>
  evalsRequest<EvalsPermissionsResponse>(
    options,
    `/${record}/${segment(uid)}/permissions`,
  );

// --- Reports (B4-04) ----------------------------------------------------------

/** A report over runs of a benchmark, written as a draft. */
export const createReport = (
  options: EvalsClientOptions,
  body: CreateReportRequest,
) =>
  evalsRequest<ReportResponse>(options, '/reports', { method: 'POST', body });

export const listReports = (
  options: EvalsClientOptions,
  query: ReportsQuery = {},
) => evalsRequest<ReportListResponse>(options, '/reports', { query });

export const getReport = (options: EvalsClientOptions, reportId: string) =>
  evalsRequest<ReportResponse>(options, `/reports/${segment(reportId)}`);

/** Send a report for review, send it back, approve it or publish it. */
export const moveReport = (
  options: EvalsClientOptions,
  reportId: string,
  body: MoveReportRequest,
) =>
  evalsRequest<ReportResponse>(options, `/reports/${segment(reportId)}/state`, {
    method: 'POST',
    body,
  });

/** A new version over newer runs, or the same ones; the old report is superseded by it. */
export const regenerateReport = (
  options: EvalsClientOptions,
  reportId: string,
  launchIds?: string[],
) =>
  evalsRequest<RegenerateReportResponse>(
    options,
    `/reports/${segment(reportId)}/regenerate`,
    {
      method: 'POST',
      body: launchIds?.length ? { launch_ids: launchIds } : {},
    },
  );

// --- Review decisions (B4-03) -------------------------------------------------

/** What a reviewer decided about part of a result, recorded on a report or in an investigation. */
export const recordDecision = (
  options: EvalsClientOptions,
  subject: DecisionSubject,
  uid: string,
  body: DecisionRequest,
) =>
  evalsRequest<DecisionResponse>(
    options,
    `/${subject}/${segment(uid)}/decisions`,
    { method: 'POST', body },
  );

/** The decisions made on a report or in an investigation, in the order they were made. */
export const listDecisions = (
  options: EvalsClientOptions,
  subject: DecisionSubject,
  uid: string,
) =>
  evalsRequest<DecisionListResponse>(
    options,
    `/${subject}/${segment(uid)}/decisions`,
  );

export type ReportExportFormat = 'markdown' | 'csv';

/** Where a report is downloaded as it was written, with its decisions (B4-08). */
export const reportExportUrl = (
  options: EvalsClientOptions,
  reportId: string,
  format: ReportExportFormat = 'markdown',
) => evalsUrl(options, `/reports/${segment(reportId)}/export`, { format });

// --- Shared with the caller (B4-07) -------------------------------------------

/** The reports and investigations other people shared with the caller. */
export const listSharedWithMe = (options: EvalsClientOptions) =>
  evalsRequest<SharedWithMeResponse>(options, '/shared');

// --- CI reports imported as snapshots (B4-09) ---------------------------------

/** Keep a report file CI produced on its benchmark, as its text. */
export const importReport = (
  options: EvalsClientOptions,
  evalsetId: string,
  body: ReportImportRequest,
) =>
  evalsRequest<ReportImportResponse>(
    options,
    `/evalsets/${segment(evalsetId)}/reports/import`,
    { method: 'POST', body },
  );

/** The reports imported on a benchmark, newest first, without their text. */
export const listReportImports = (
  options: EvalsClientOptions,
  evalsetId: string,
) =>
  evalsRequest<ReportImportListResponse>(
    options,
    `/evalsets/${segment(evalsetId)}/reports/imports`,
  );

/** One imported report, with its text as it was. */
export const getReportImport = (
  options: EvalsClientOptions,
  importId: string,
) =>
  evalsRequest<ReportImportResponse>(
    options,
    `/report-imports/${segment(importId)}`,
  );

/** Continue investigation: a live report and an investigation over its runs. */
export const continueReportImport = (
  options: EvalsClientOptions,
  importId: string,
) =>
  evalsRequest<ContinueReportImportResponse>(
    options,
    `/report-imports/${segment(importId)}/continue`,
    { method: 'POST' },
  );
