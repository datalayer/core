/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { asArray } from '../utils';
import { asUser } from './User';
import { ITeam } from './Team';
import { ISchool } from './School';
import { IOrganizationMember } from './OrganizationMember';

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
export type IOrganizationAwsMarketplace = {
  accountId: string;
  productCode: string;
  /** The AWS customer identifier, when the resolve or a notification gave one. */
  customerIdentifier?: string;
  /** The AWS offer this subscription was bought under, when known. */
  offerId?: string;
  /** Every agreement (licence ARN) seen for this subscription. */
  licenseArns: string[];
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
