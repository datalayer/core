/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { asArray } from '../utils';
import { asUser } from './User';
import { ITeam } from './Team';
import { ISchool } from './School';
import { IOrganizationMember } from './OrganizationMember';

const AWS_LICENSE_STATUSES: readonly IAwsMarketplaceLicenseStatus[] = [
  'active',
  'ending',
  'ended',
];

function asOptionalDate(value: unknown): Date | undefined {
  if (!value) {
    return undefined;
  }
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function asOptionalString(value: unknown): string | undefined {
  const text = String(value ?? '').trim();
  return text || undefined;
}

/**
 * The agreements (AWS calls each a licence) of an AWS Marketplace organization.
 *
 * Read from `aws_licenses_s`, the JSON string IAM keeps on the organization
 * document: a list of `{arn, status, agreement_id, offer_id, first_seen,
 * deprovisioned_at, ended_at}`. Anything that does not parse is dropped
 * rather than thrown on, and every ARN of `licenseArns` the JSON does not
 * name is appended as an `active` agreement — which is what an organization
 * written before the field existed holds, and what is left when the JSON is
 * invalid. The same reading the services make, so the page and the API never
 * disagree about which agreements exist.
 */
export function asAwsMarketplaceLicenses(
  raw: unknown,
  licenseArns: string[] = [],
): IAwsMarketplaceLicense[] {
  let parsed: unknown = raw;
  if (typeof raw === 'string') {
    try {
      parsed = raw.trim() ? JSON.parse(raw) : [];
    } catch {
      parsed = [];
    }
  }
  const licenses: IAwsMarketplaceLicense[] = [];
  const known = new Set<string>();
  for (const entry of Array.isArray(parsed) ? parsed : []) {
    if (!entry || typeof entry !== 'object') {
      continue;
    }
    const record = entry as Record<string, unknown>;
    const arn = String(record.arn ?? '').trim();
    if (!arn || known.has(arn)) {
      continue;
    }
    known.add(arn);
    const status = String(record.status ?? '')
      .trim()
      .toLowerCase() as IAwsMarketplaceLicenseStatus;
    licenses.push({
      arn,
      status: AWS_LICENSE_STATUSES.includes(status) ? status : 'active',
      agreementId: asOptionalString(record.agreement_id ?? record.agreementId),
      offerId: asOptionalString(record.offer_id ?? record.offerId),
      firstSeen: asOptionalDate(record.first_seen ?? record.firstSeen),
      deprovisionedAt: asOptionalDate(
        record.deprovisioned_at ?? record.deprovisionedAt,
      ),
      endedAt: asOptionalDate(record.ended_at ?? record.endedAt),
    });
  }
  for (const value of licenseArns) {
    const arn = String(value ?? '').trim();
    if (arn && !known.has(arn)) {
      known.add(arn);
      licenses.push({ arn, status: 'active' });
    }
  }
  return licenses;
}

/**
 * Convert the raw user object to {@link IOrganization}.
 *
 * @param org Raw user object from DB
 * @returns Organizatin
 */
export function asOrganization(org: any): IOrganization {
  let members = new Array<IOrganizationMember>();
  if (org.members) {
    members = asArray(org.members).map(m => {
      const member: IOrganizationMember = asUser(m);
      return member;
    });
  }
  const organization: IOrganization = {
    id: org.uid,
    handle: org.handle_s,
    type: 'organization',
    name: org.name_t,
    displayName: org.display_name_t || org.name_t,
    description: org.description_t,
    avatarIcon: org.avatar_icon_s ?? org.avatarIcon,
    banner: org.banner_s ?? org.banner,
    public: org.public_b,
    // Where the organization came from — a URN such as
    // `urn:dla:iam:ext::aws:<account>/<product>` — or nothing for a native one.
    origin: org.origin_s ?? org.origin ?? undefined,
    awsMarketplace: org.aws_account_id_s
      ? {
          accountId: org.aws_account_id_s,
          productCode: org.aws_product_code_s,
          customerIdentifier: org.aws_customer_identifier_s || undefined,
          offerId: org.aws_offer_identifier_s || undefined,
          // Every agreement (licence ARN) seen for this subscription. A
          // subscription may carry several concurrent agreements.
          licenseArns: asArray(org.aws_license_arns_ss ?? []),
          // The same agreements with what is known of each — status,
          // agreement id, dates — read defensively from the JSON IAM keeps.
          licenses: asAwsMarketplaceLicenses(
            org.aws_licenses_s,
            asArray(org.aws_license_arns_ss ?? []),
          ),
          subscriptionStatus: org.aws_subscription_status_s ?? 'pending',
          freeTrial: Boolean(org.aws_free_trial_b),
          dimensions: asArray(org.aws_dimensions_ss ?? []),
          values: asArray(org.aws_values_ss ?? []),
          lastMeteredAt: org.aws_last_metered_ts_dt
            ? new Date(org.aws_last_metered_ts_dt)
            : undefined,
        }
      : undefined,
    members,
    teams: [],
    creationDate: new Date(org.creation_ts_dt),
    setMembers(members: IOrganizationMember[]) {
      this.members = members;
    },
  };
  return organization;
}

export type IAnyOrganization = IOrganization | ISchool;

/**
 * What an organization created from an AWS Marketplace subscription carries.
 *
 * The subscription status is the one AWS last told us, or `pending` until it
 * does. `pending` no longer locks the organization — usage is postpaid and
 * metered by AWS regardless; only `failed` and `cancelled` lock it read-only,
 * and the API says so on every refused mutation. A subscription may carry
 * several concurrent agreements, each identified by a licence ARN.
 */
/**
 * Where an agreement stands: `active` while the buyer is entitled under it,
 * `ending` from the moment AWS says it is deprovisioned — the hour AWS gives
 * to report its last usage — and `ended` once that hour has passed.
 */
export type IAwsMarketplaceLicenseStatus = 'active' | 'ending' | 'ended';

/** One agreement of an AWS Marketplace subscription; AWS calls it a licence. */
export type IAwsMarketplaceLicense = {
  /** The licence ARN, which is how AWS names the agreement. */
  arn: string;
  status: IAwsMarketplaceLicenseStatus;
  agreementId?: string;
  offerId?: string;
  /** When the platform first saw the agreement. */
  firstSeen?: Date;
  /** When AWS said the agreement was deprovisioned. */
  deprovisionedAt?: Date;
  /** When the hour to report its last usage ran out. */
  endedAt?: Date;
};

export type IOrganizationAwsMarketplace = {
  accountId: string;
  productCode: string;
  /** The AWS customer identifier, when the resolve or a notification gave one. */
  customerIdentifier?: string;
  /** The AWS offer this subscription was bought under, when known. */
  offerId?: string;
  /** Every agreement (licence ARN) seen for this subscription. */
  licenseArns: string[];
  /**
   * Every agreement with its status and dates. An organization may hold
   * several at once, and stays usable while at least one is `active`.
   */
  licenses: IAwsMarketplaceLicense[];
  subscriptionStatus:
    'pending' | 'active' | 'failed' | 'cancelling' | 'cancelled' | string;
  freeTrial: boolean;
  dimensions: string[];
  values: string[];
  lastMeteredAt?: Date;
};

export type IBaseOrganization = {
  id: string;
  handle: string;
  type: string;
  name: string;
  displayName?: string;
  description: string;
  avatarIcon?: string;
  banner?: string;
  public: boolean;
  /**
   * Where the organization came from, as a URN — an AWS Marketplace
   * subscription, say. Absent for a native organization.
   */
  origin?: string;
  /** The subscription, for an organization whose origin is the AWS Marketplace. */
  awsMarketplace?: IOrganizationAwsMarketplace;
  creationDate: Date;
  members: IOrganizationMember[];
  setMembers: (members: IOrganizationMember[]) => void;
};

export type IOrganization = IBaseOrganization & {
  type: 'organization';
  teams: ITeam[];
};

export default IOrganization;
