/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { describe, expect, it } from 'vitest';
import { asAwsMarketplaceLicenses, asOrganization } from '../Organization';

const ARN_A = 'arn:aws:license-manager::111122223333:license:l-aaaa';
const ARN_B = 'arn:aws:license-manager::111122223333:license:l-bbbb';

describe('asAwsMarketplaceLicenses', () => {
  it('reads every agreement of the JSON, with its status and dates', () => {
    const licenses = asAwsMarketplaceLicenses(
      JSON.stringify([
        {
          arn: ARN_A,
          status: 'ending',
          agreement_id: 'agmt-1',
          offer_id: 'offer-1',
          first_seen: '2026-09-01T10:00:00Z',
          deprovisioned_at: '2026-09-17T08:00:00Z',
          ended_at: null,
        },
        { arn: ARN_B, status: 'active', agreement_id: '', offer_id: '' },
      ]),
      [ARN_A, ARN_B],
    );
    expect(licenses).toHaveLength(2);
    expect(licenses[0]).toMatchObject({
      arn: ARN_A,
      status: 'ending',
      agreementId: 'agmt-1',
      offerId: 'offer-1',
    });
    expect(licenses[0].firstSeen?.toISOString()).toBe(
      '2026-09-01T10:00:00.000Z',
    );
    expect(licenses[0].deprovisionedAt?.toISOString()).toBe(
      '2026-09-17T08:00:00.000Z',
    );
    expect(licenses[0].endedAt).toBeUndefined();
    expect(licenses[1]).toEqual({
      arn: ARN_B,
      status: 'active',
      agreementId: undefined,
      offerId: undefined,
      firstSeen: undefined,
      deprovisionedAt: undefined,
      endedAt: undefined,
    });
  });

  it('falls back to one active agreement per ARN when the JSON is invalid', () => {
    expect(asAwsMarketplaceLicenses('{not json', [ARN_A, ARN_B])).toEqual([
      { arn: ARN_A, status: 'active' },
      { arn: ARN_B, status: 'active' },
    ]);
  });

  it('falls back the same way when the field is absent or not a list', () => {
    expect(asAwsMarketplaceLicenses(undefined, [ARN_A])).toEqual([
      { arn: ARN_A, status: 'active' },
    ]);
    expect(asAwsMarketplaceLicenses('{"arn": "x"}', [ARN_A])).toEqual([
      { arn: ARN_A, status: 'active' },
    ]);
    expect(asAwsMarketplaceLicenses('', [])).toEqual([]);
  });

  it('appends an ARN the JSON does not name, as active', () => {
    const licenses = asAwsMarketplaceLicenses(
      JSON.stringify([{ arn: ARN_A, status: 'ended' }]),
      [ARN_A, ARN_B],
    );
    expect(licenses.map(license => [license.arn, license.status])).toEqual([
      [ARN_A, 'ended'],
      [ARN_B, 'active'],
    ]);
  });

  it('drops entries without an ARN, repeats, and reads an unknown status as active', () => {
    const licenses = asAwsMarketplaceLicenses(
      JSON.stringify([
        null,
        'text',
        { status: 'active' },
        { arn: ARN_A, status: 'SOMETHING' },
        { arn: ARN_A, status: 'ended' },
        { arn: ARN_B, status: ' Ending ', first_seen: 'not a date' },
      ]),
    );
    expect(licenses).toEqual([
      expect.objectContaining({ arn: ARN_A, status: 'active' }),
      expect.objectContaining({
        arn: ARN_B,
        status: 'ending',
        firstSeen: undefined,
      }),
    ]);
  });
});

describe('asOrganization', () => {
  it('carries the agreements of an AWS Marketplace organization', () => {
    const organization = asOrganization({
      uid: 'org-1',
      handle_s: 'acme',
      name_t: 'Acme',
      origin_s: 'urn:dla:iam:ext::aws:111122223333/prod-1',
      aws_account_id_s: '111122223333',
      aws_product_code_s: 'prod-1',
      aws_license_arns_ss: [ARN_A, ARN_B],
      aws_licenses_s: JSON.stringify([{ arn: ARN_A, status: 'ending' }]),
    });
    expect(organization.awsMarketplace?.licenseArns).toEqual([ARN_A, ARN_B]);
    expect(
      organization.awsMarketplace?.licenses.map(license => license.status),
    ).toEqual(['ending', 'active']);
  });

  it('leaves a native organization without a subscription', () => {
    const organization = asOrganization({ uid: 'org-2', handle_s: 'native' });
    expect(organization.awsMarketplace).toBeUndefined();
  });
});
