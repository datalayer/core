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
 * does; while it is anything but `active` or `cancelling` the organization
 * is locked and the API says so on every refused mutation.
 */
export type IOrganizationAwsMarketplace = {
  accountId: string;
  productCode: string;
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
