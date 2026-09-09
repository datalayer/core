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
