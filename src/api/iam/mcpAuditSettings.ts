/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * An organization's audit retention, forwarding, and where alerts go.
 *
 * Three things on one document, and they are together because they are all
 * "what this organization has decided about its own record": how long rows
 * are kept, where a copy is shipped, and who is told when a rule fires.
 *
 * The alert destinations live here rather than on each rule because a URL
 * repeated on twenty rules is nineteen places to forget when it rotates,
 * and the rules would disagree about where the organization is reachable.
 *
 * **Writes merge, they do not replace.** Retention and forwarding are set by
 * different people at different times, and making somebody resend a
 * destination in order to change a retention is how a destination gets
 * resent wrong.
 *
 * @module api/iam/mcpAuditSettings
 */

import { requestDatalayerAPI } from '../DatalayerApi';
import { API_BASE_PATHS, DEFAULT_SERVICE_URLS } from '../constants';

/** Where a copy of the audit can be shipped. */
export const AUDIT_DESTINATION_KINDS = ['https', 's3'] as const;
export type AuditDestinationKind = (typeof AUDIT_DESTINATION_KINDS)[number];

export interface McpAuditSettings {
  /** How long rows are kept. Rows a sweep deletes do not come back. */
  retentionDays?: number;
  /** Empty when nothing is forwarded, which is the default. */
  destinationKind: string;
  destinationUrl: string;
  /** The *reference* to a signing secret, never the secret. */
  destinationSecretRef: string;
  /** An endpoint a fired alert is POSTed to, beside the in-app notice. */
  alertWebhookUrl: string;
  /** A Slack incoming webhook. Its own field: Slack gets Block Kit. */
  alertSlackWebhookUrl: string;
  /** Who is emailed, comma-separated. */
  alertEmails: string;
  version?: number;
}

interface WireSettings {
  retention_days?: number | null;
  destination_kind?: string | null;
  destination_url?: string | null;
  destination_secret_ref?: string | null;
  alert_webhook_url?: string | null;
  alert_slack_webhook_url?: string | null;
  alert_emails?: string | null;
  version?: number | null;
}

const fromWire = (settings: WireSettings): McpAuditSettings => ({
  retentionDays: settings.retention_days ?? undefined,
  destinationKind: settings.destination_kind ?? '',
  destinationUrl: settings.destination_url ?? '',
  destinationSecretRef: settings.destination_secret_ref ?? '',
  alertWebhookUrl: settings.alert_webhook_url ?? '',
  alertSlackWebhookUrl: settings.alert_slack_webhook_url ?? '',
  alertEmails: settings.alert_emails ?? '',
  version: settings.version ?? undefined,
});

/** Raised when IAM refused a setting, carrying its reason. */
export class AuditSettingInvalid extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuditSettingInvalid';
  }
}

const settingsUrl = (baseUrl: string, orgUid: string, query = ''): string =>
  `${baseUrl}${API_BASE_PATHS.IAM}/mcp-audit-settings/${encodeURIComponent(orgUid)}${query}`;

/**
 * One organization's settings, or `null` where it has none.
 *
 * `null` is an ordinary answer: an organization with no settings is neither
 * swept nor forwarded, which is the default rather than a failure.
 */
export const getAuditSettings = async (
  token: string,
  orgUid: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.IAM,
): Promise<McpAuditSettings | null> => {
  try {
    const response = await requestDatalayerAPI<{
      success: boolean;
      settings?: WireSettings;
    }>({
      url: settingsUrl(baseUrl, orgUid),
      method: 'GET',
      token,
    });
    return fromWire(response.settings ?? {});
  } catch (error) {
    if (statusOf(error) === 404) {
      return null;
    }
    throw error;
  }
};

/**
 * Change some of the settings. Only what is passed is sent.
 *
 * A partial write, deliberately: IAM merges, so a page that only edits the
 * alert destinations must not send an empty retention and clear it.
 */
export const setAuditSettings = async (
  token: string,
  orgUid: string,
  settings: Partial<{
    retentionDays: number;
    destinationKind: string;
    destinationUrl: string;
    alertWebhookUrl: string;
    alertSlackWebhookUrl: string;
    alertEmails: string;
  }>,
  options: { expectedVersion?: number } = {},
  baseUrl: string = DEFAULT_SERVICE_URLS.IAM,
): Promise<McpAuditSettings> => {
  const body: Record<string, unknown> = {};
  if (settings.retentionDays !== undefined) {
    body.retention_days = settings.retentionDays;
  }
  if (settings.destinationKind !== undefined) {
    body.destination_kind = settings.destinationKind;
  }
  if (settings.destinationUrl !== undefined) {
    body.destination_url = settings.destinationUrl;
  }
  if (settings.alertWebhookUrl !== undefined) {
    body.alert_webhook_url = settings.alertWebhookUrl;
  }
  if (settings.alertSlackWebhookUrl !== undefined) {
    body.alert_slack_webhook_url = settings.alertSlackWebhookUrl;
  }
  if (settings.alertEmails !== undefined) {
    body.alert_emails = settings.alertEmails;
  }

  const query =
    options.expectedVersion === undefined
      ? ''
      : `?expected_version=${encodeURIComponent(String(options.expectedVersion))}`;
  try {
    const response = await requestDatalayerAPI<{
      success: boolean;
      settings?: WireSettings;
    }>({
      url: settingsUrl(baseUrl, orgUid, query),
      method: 'PUT',
      token,
      body,
    });
    return fromWire(response.settings ?? {});
  } catch (error) {
    if (statusOf(error) === 422) {
      throw new AuditSettingInvalid(
        (error as { message?: string }).message ||
          'IAM refused one of these settings.',
      );
    }
    throw error;
  }
};

const statusOf = (error: unknown): number | undefined => {
  const candidate = error as { status?: number; response?: { status?: number } };
  return candidate?.status ?? candidate?.response?.status;
};
