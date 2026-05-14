/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { IResources } from './Environment';

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
  metadata: Map<string, string>;
}
