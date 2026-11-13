/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Compute resource shape (CPU / memory / GPU) associated with a usage record.
 * Mirrors the runtime environment resource shape but is declared locally so
 * the account/usage model does not depend on the runtime/content package.
 */
interface IResources {
  cpu: string;
  memory: string;
  'nvidia.com/gpu'?: string;
}

/**
 * What ran and hosted the agent a usage record is for (`runtime_engine`):
 * a Datalayer runtime, kagent, or AWS AgentCore in an organization's AWS
 * account. IAM records it from the launch; a record from before, or of a
 * call with no agent runtime behind it, has none.
 */
export type UsageRuntimeEngine = 'datalayer' | 'kagent' | 'agentcore';

/** The engine a raw record says, or `undefined` when it says none (or one not known). */
export const usageRuntimeEngineOf = (
  value: unknown,
): UsageRuntimeEngine | undefined =>
  value === 'datalayer' || value === 'kagent' || value === 'agentcore'
    ? value
    : undefined;

export interface IRawUsage {
  account_uid: string;
  resource_uid: string;
  resource_type: string;
  burning_rate: number;
  credits_limit: number;
  start_date: string;
  updated_at: string;
  credits?: number;
  end_date?: string | null;
  resource_given_name?: string;
  resource_state?: string;
  pod_resources?: IResources;
  plan?: string;
  usage_period_key?: string;
  usage_period_label?: string;
  usage_period_start?: string;
  usage_period_end?: string;
  runtime_engine?: UsageRuntimeEngine | null;
  metadata: Map<string, string>;
}

export const asUsage = (u: any) => {
  const usagePeriodKey = u.usage_period_key;
  const usagePeriodLabel = u.usage_period_label;
  const usagePeriodStart = u.usage_period_start;
  const usagePeriodEnd = u.usage_period_end;

  return {
    id: u.resource_uid,
    accountId: u.account_uid ?? '',
    type: u.resource_type,
    burningRate: u.burning_rate,
    creditsLimit: u.credits_limit,
    credits: u.credits,
    givenName: u.resource_given_name ?? u.resource_uid,
    startDate: new Date(u.start_date),
    updatedAt: new Date(u.updated_at),
    endDate: u.end_date ? new Date(u.end_date) : undefined,
    resourceState: u.resource_state,
    resources: u.pod_resources,
    plan: u.plan ?? 'free_plan',
    usagePeriodKey,
    usagePeriodLabel,
    usagePeriodStart: usagePeriodStart ? new Date(usagePeriodStart) : undefined,
    usagePeriodEnd: usagePeriodEnd ? new Date(usagePeriodEnd) : undefined,
    runtimeEngine: usageRuntimeEngineOf(u.runtime_engine),
    metadata: new Map(Object.entries(u.metadata ?? {})),
  } satisfies IUsage;
};

export interface IUsage {
  id: string;
  accountId?: string;
  type: string;
  burningRate: number;
  credits?: number;
  creditsLimit: number;
  startDate: Date;
  updatedAt: Date;
  endDate?: Date;
  givenName: string;
  resourceState: string;
  resources?: IResources;
  plan?: string;
  usagePeriodKey?: string;
  usagePeriodLabel?: string;
  usagePeriodStart?: Date;
  usagePeriodEnd?: Date;
  /** What ran and hosted its agent; absent on a record that says none. */
  runtimeEngine?: UsageRuntimeEngine;
  metadata: Map<string, string>;
}
