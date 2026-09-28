/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import type { IIAMProviderName } from './IAMProvidersSpecs';

/** What an identity provider's account URN starts with, before its name. */
export const IAM_PROVIDER_URN_PREFIX = 'urn:dla:iam:ext::';

export class URN implements IURN {
  private _partition: string;
  private _service: string;
  private _region: string;
  private _account: string;
  private _type: string;
  private _uid: string;
  //  private _path: string;

  constructor(urn: string) {
    const parts = urn.split(':');
    this._partition = parts[1];
    this._service = parts[2];
    this._region = parts[3];
    this._account = parts[4];
    this._type = parts[5];
    // The rest, colons and all: a provider's account id may carry them.
    this._uid = parts.slice(6).join(':');
  }

  get partition() {
    return this._partition;
  }

  get service() {
    return this._service;
  }

  get region() {
    return this._region;
  }

  get account() {
    return this._account;
  }

  get type() {
    return this._type;
  }

  get uid() {
    return this._uid;
  }

  /** An identity provider's account (`urn:dla:iam:ext::github:…`). */
  get isIAMProviderAccount(): boolean {
    return this._service === 'iam' && this._region === 'ext' && !!this._type;
  }

  toString(): string {
    return [
      'urn',
      this._partition,
      this._service,
      this._region,
      this._account,
      this._type,
      this._uid,
    ].join(':');
  }
}

/** A URN, or `undefined` when the value is not one — never a throw. */
export function parseURN(value?: string | null): URN | undefined {
  const text = (value ?? '').trim();
  if (!text.toLowerCase().startsWith('urn:') || text.split(':').length < 7) {
    return undefined;
  }
  return new URN(text);
}

const IAM_PROVIDER_NAMES: ReadonlyArray<IIAMProviderName> = [
  'bluesky',
  'discord',
  'github',
  'google',
  'linkedin',
  'okta',
  'x',
];

/**
 * Where an account came from, read from its `origin`.
 *
 * - `datalayer`: made on Datalayer, with a password.
 * - `iam-provider`: made by signing in with an identity provider, which it
 *   still signs in through (`urn:dla:iam:ext::<provider>:<account id>`).
 * - `urn`: any other URN — an AWS Marketplace or enterprise origin.
 * - `unknown`: nothing recorded, or a value that is none of the above.
 */
export type IAccountOrigin =
  | { kind: 'datalayer' }
  | {
      kind: 'iam-provider';
      provider: IIAMProviderName;
      accountId: string;
      urn: URN;
    }
  | { kind: 'urn'; urn: URN }
  | { kind: 'unknown'; value: string };

export function accountOriginOf(origin?: string | null): IAccountOrigin {
  const value = (origin ?? '').trim();
  if (value === 'datalayer') {
    return { kind: 'datalayer' };
  }
  const urn = parseURN(value);
  if (!urn) {
    return { kind: 'unknown', value };
  }
  const provider = urn.type.toLowerCase() as IIAMProviderName;
  if (urn.isIAMProviderAccount && IAM_PROVIDER_NAMES.includes(provider)) {
    return { kind: 'iam-provider', provider, accountId: urn.uid, urn };
  }
  return { kind: 'urn', urn };
}

/**
 * Whether an account signs in through a provider: disconnecting that
 * provider would leave it nothing to sign in with.
 */
export function signsInWith(
  origin: string | null | undefined,
  provider: IIAMProviderName,
): boolean {
  const parsed = accountOriginOf(origin);
  return parsed.kind === 'iam-provider' && parsed.provider === provider;
}

/**
  Datalayer Uniform Resource Name (URN)

  @see https://en.wikipedia.org/wiki/Uniform_Resource_Name
  @see https://learn.microsoft.com/en-us/linkedin/shared/api-guide/concepts/urns
  @see https://docs.aws.amazon.com/IAM/latest/UserGuide/reference-arns.html

  urn:partition:service:region:account:type:uid
  urn:partition:service:region:account:type:uid/path/subpath

  Examples:
  - Account should be the uid.
  - We are using in the examples some names to make it easier to read.

  IAM Account
  - urn:dla:iam:::user:eric
  - urn:dla:iam:::organization:datalayer
  - urn:dla:iam:::team:developers

  IAM Providers
  - urn:dla:iam:ext::github:xyz

  Objects
  - urn:dla:spacer:::space:space-1
  - urn:dla:spacer:::notebook:data-analysis/data-analysis.ipynb
  - urn:dla:spacer:::cell:a-simple-cell
  - urn:dla:spacer:us-east-1::dataset:cities/cities.csv
  - urn:dla:edu:::course:course-1
  - urn:dla:edu:::lesson:advanced-python/advanced-python.ipynb
  - urn:dla:edu:::exercise:loop-with-python
  - urn:dla:library:::notebook:notebook-1
  - urn:dla:app:::panel:new-york-taxis

  Relations
  - urn:dla:iam::run:relation:CourseInstructor/python-advanced
  - urn:dla:iam::run:relation:OrganizationMember
  - urn:dla:iam::run:relation:ReadCourseNotebook/python-advanced
  - urn:dla:iam::run:relation:SpaceReader/simple-analysis
  - urn:dla:iam::run:relation:TeamMember/developers
*/
export type IURN = {
  partition: string;
  service: string;
  region: string;
  account: string;
  type: string;
  uid: string;
  //  path: string;
};
