/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * OTEL dashboards, read under an account.
 *
 * A panel's numbers come back computed by the OTEL service, which reads
 * each series the way it was exported: a running total's increase over the
 * window, a level's latest reading, a duration's total over its count.
 * Services export counters as running totals, so adding raw metric points up
 * counts every earlier report again; a view reads these summaries instead.
 *
 * @module api/otel/dashboards
 */

import { requestDatalayerAPI } from '../DatalayerApi';
import { API_BASE_PATHS, DEFAULT_SERVICE_URLS } from '../constants';
import { validateToken } from '../utils/validation';

/** What one export of a series added, for a chart. */
export interface DashboardPoint {
  /** Unix nanoseconds, which a JavaScript number holds only approximately. */
  t: number;
  v: number;
}

/** One label value of a panel: its series combined one way. */
export interface DashboardSeries {
  label: string;
  /** `null` when there was nothing to divide by, as for a duration never measured. */
  summary: number | null;
  /** How many series (processes, attribute sets) the summary combines. */
  series: number;
  points: DashboardPoint[];
}

/** One panel and its answer. */
export interface DashboardPanelData {
  id: string;
  title: string;
  metric: string;
  by: string | null;
  where: Record<string, string>;
  agg: string;
  kind: string;
  series: DashboardSeries[];
  /** The limit cut the points a chart draws; the summaries are whole. */
  points_truncated?: boolean;
  /** Why the service could not answer this panel; the others still answer. */
  error?: string;
}

/** A dashboard's every panel, answered under one account. */
export interface DashboardData {
  success: boolean;
  id: string;
  title: string;
  account_uid: string;
  panels: DashboardPanelData[];
}

export interface DashboardDataOptions {
  /** The window opens here; all of the retained history without it. */
  since?: Date;
  /** The window closes here; now without it. */
  until?: Date;
  /** Read as this organization or team rather than the caller. */
  accountUid?: string;
}

/** A date as the unix nanoseconds the service takes, spelled exactly. */
const nanoseconds = (date: Date): string => `${Math.floor(date.getTime())}000000`;

/**
 * Every panel of one dashboard, answered under the caller's account scope.
 *
 * @param token - Authentication token.
 * @param dashboardId - A built-in dashboard's id, or one the account saved.
 * @param options - The window and the account to read as.
 * @param baseUrl - The OTEL service.
 * @returns The panels and their summaries.
 */
export const getDashboardData = async (
  token: string,
  dashboardId: string,
  options: DashboardDataOptions = {},
  baseUrl: string = DEFAULT_SERVICE_URLS.OTEL,
): Promise<DashboardData> => {
  validateToken(token);

  const params = new URLSearchParams();
  if (options.since) params.set('start', nanoseconds(options.since));
  if (options.until) params.set('end', nanoseconds(options.until));
  if (options.accountUid) params.set('account_uid', options.accountUid);

  const queryString = params.toString();
  const url = `${baseUrl}${API_BASE_PATHS.OTEL}/dashboards/${encodeURIComponent(dashboardId)}/data${queryString ? `?${queryString}` : ''}`;

  return requestDatalayerAPI<DashboardData>({
    url,
    method: 'GET',
    token,
  });
};
