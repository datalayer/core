/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * The orchestration control plane, as a caller reaches it.
 *
 * Every path comes from `ORCHESTRATION_API`, which is generated from the
 * control plane's own OpenAPI document: this module spells no URL itself, so
 * a route that moves on the service moves here when the types are
 * regenerated — or fails the check that they were not. A view calls these
 * functions and never builds an orchestration path of its own.
 *
 * Bodies are the canonical commands as they are and answers the envelopes
 * the service returns; the wire is camel case on both sides, so nothing is
 * converted.
 *
 * @module api/orchestration/client
 */

import { API_BASE_PATHS } from '../constants';
import {
  aiAgentsRequest,
  aiAgentsUrl,
  type EvalsClientOptions,
  type EvalsQuery,
} from '../evals/request';
import {
  ORCHESTRATION_API,
  type AgentsAttach,
  type AgentsCreate,
  type AgentsDiscover,
  type CancelAnswer,
  type CollectAnswer,
  type CommandAnswer,
  type DelegateAnswer,
  type DiscoverAnswer,
  type ExecutionAnswer,
  type ExecutionState,
  type ExecutionsAnswer,
  type ExecutionsCancel,
  type ExecutionsCheckpoint,
  type ExecutionsCollect,
  type ExecutionsDelegate,
  type ExecutionsPause,
  type ExecutionsResume,
  type ExecutionsSteer,
  type ExecutionsTerminate,
  type OrchestrationOperation,
  type WorkerAnswer,
} from './generated';

/** Who calls: the service origin, the caller's token, and the account the executions belong to. */
export type OrchestrationClientOptions = EvalsClientOptions;

/**
 * One operation's method and path under `/api/ai-agents/v1`, with its
 * parameters filled in and encoded.
 *
 * @throws Error when the control plane has no such operation, or a
 * parameter the path names is missing.
 */
export const operationPath = (
  operation: string,
  parameters: Record<string, string> = {},
): { method: OrchestrationOperation['method']; path: string } => {
  const found = ORCHESTRATION_API.find(one => one.operation === operation);
  if (!found) {
    throw new Error(`The control plane has no operation '${operation}'.`);
  }
  const path = found.path.replace(/\{([^}]+)\}/g, (_, name: string) => {
    const value = parameters[name];
    if (value === undefined || value === '') {
      throw new Error(`'${operation}' needs '${name}'.`);
    }
    return encodeURIComponent(value);
  });
  if (!path.startsWith(API_BASE_PATHS.AI_AGENTS)) {
    throw new Error(
      `'${operation}' is not under ${API_BASE_PATHS.AI_AGENTS}: ${found.path}`,
    );
  }
  return {
    method: found.method,
    path: path.slice(API_BASE_PATHS.AI_AGENTS.length),
  };
};

/** The full URL of one operation, with the account scope and a query. */
export const operationUrl = (
  options: OrchestrationClientOptions,
  operation: string,
  parameters: Record<string, string> = {},
  query: EvalsQuery = {},
): string =>
  aiAgentsUrl(options, operationPath(operation, parameters).path, query);

const call = <T>(
  options: OrchestrationClientOptions,
  operation: string,
  init: {
    body?: unknown;
    parameters?: Record<string, string>;
    query?: EvalsQuery;
  } = {},
): Promise<T> => {
  const { method, path } = operationPath(operation, init.parameters);
  return aiAgentsRequest<T>(options, path, {
    method,
    body: init.body,
    query: init.query,
  });
};

/** `agents.discover`: the workers meeting every constraint the command states. */
export const discoverAgents = (
  options: OrchestrationClientOptions,
  command: AgentsDiscover,
): Promise<DiscoverAnswer> =>
  call(options, 'agents.discover', { body: command });

/** `agents.create`: bring a worker's compute up. */
export const createAgent = (
  options: OrchestrationClientOptions,
  command: AgentsCreate,
): Promise<WorkerAnswer> => call(options, 'agents.create', { body: command });

/** `agents.attach`: a worker or a session that is already there. */
export const attachAgent = (
  options: OrchestrationClientOptions,
  command: AgentsAttach,
): Promise<WorkerAnswer> => call(options, 'agents.attach', { body: command });

/** `executions.delegate`: an objective and its context, to a worker. */
export const delegateExecution = (
  options: OrchestrationClientOptions,
  command: ExecutionsDelegate,
): Promise<DelegateAnswer> =>
  call(options, 'executions.delegate', { body: command });

/** `executions.steer`: instructions added while the work runs. */
export const steerExecution = (
  options: OrchestrationClientOptions,
  command: ExecutionsSteer,
): Promise<CommandAnswer> =>
  call(options, 'executions.steer', { body: command });

/** `executions.pause`, where the worker's protocol can pause. */
export const pauseExecution = (
  options: OrchestrationClientOptions,
  command: ExecutionsPause,
): Promise<CommandAnswer> =>
  call(options, 'executions.pause', { body: command });

/** `executions.resume`, from where it stopped or from a checkpoint. */
export const resumeExecution = (
  options: OrchestrationClientOptions,
  command: ExecutionsResume,
): Promise<CommandAnswer> =>
  call(options, 'executions.resume', { body: command });

/** `executions.cancel`: stop the work, and by default everything below it. */
export const cancelExecution = (
  options: OrchestrationClientOptions,
  command: ExecutionsCancel,
): Promise<CancelAnswer> =>
  call(options, 'executions.cancel', { body: command });

/** `executions.checkpoint`, where the worker's protocol keeps state. */
export const checkpointExecution = (
  options: OrchestrationClientOptions,
  command: ExecutionsCheckpoint,
): Promise<CommandAnswer> =>
  call(options, 'executions.checkpoint', { body: command });

/** `executions.collect`: the artifacts of an execution and of its children. */
export const collectExecution = (
  options: OrchestrationClientOptions,
  command: ExecutionsCollect,
): Promise<CollectAnswer> =>
  call(options, 'executions.collect', { body: command });

/** `executions.terminate`: release the worker, where its protocol can. */
export const terminateExecution = (
  options: OrchestrationClientOptions,
  command: ExecutionsTerminate,
): Promise<CommandAnswer> =>
  call(options, 'executions.terminate', { body: command });

/** One execution, its attempts, and the milestones it reached. */
export const getExecution = (
  options: OrchestrationClientOptions,
  executionId: string,
): Promise<ExecutionAnswer> =>
  call(options, 'executions.get', {
    parameters: { execution_id: executionId },
  });

/** The account's executions, oldest first: a tree by its root, a level by its parent. */
export const listExecutions = (
  options: OrchestrationClientOptions,
  filter: {
    rootExecutionId?: string;
    parentExecutionId?: string;
    status?: ExecutionState;
  } = {},
): Promise<ExecutionsAnswer> =>
  call(options, 'executions.list', {
    query: {
      rootExecutionId: filter.rootExecutionId,
      parentExecutionId: filter.parentExecutionId,
      status: filter.status,
    },
  });
