/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { describe, expect, it } from 'vitest';
import { availableCredits } from '../Credits';

describe('availableCredits', () => {
  it('reads the balance directly when no quota is set', () => {
    expect(availableCredits({ credits: 13495.734, quota: null })).toBeCloseTo(
      13495.734,
    );
  });

  it('treats an absent quota as no quota', () => {
    /*
     * IAM omits `quota` for an account without one. Testing only against
     * `null` sent `undefined` down the quota branch, and `undefined - credits`
     * is NaN — which reached the sandbox launcher as "10 available minutes"
     * for an account holding thousands of credits.
     */
    const withoutQuota = { credits: 13495.734 } as {
      credits: number;
      quota: number | null;
    };

    expect(availableCredits(withoutQuota)).toBeCloseTo(13495.734);
  });

  it('spends against the quota when one is set', () => {
    expect(availableCredits({ credits: 30, quota: 100 })).toBe(70);
  });

  it('subtracts what outstanding reservations already claimed', () => {
    expect(
      availableCredits({ credits: 100, quota: null }, [
        { credits: 10 },
        { credits: 15 },
      ]),
    ).toBe(75);
  });

  it('never reports a negative balance', () => {
    expect(
      availableCredits({ credits: 5, quota: null }, [{ credits: 40 }]),
    ).toBe(0);
  });

  it('reports nothing available rather than a number nobody can use', () => {
    const unusable = { credits: Number.NaN, quota: null };

    expect(availableCredits(unusable)).toBe(0);
  });

  it('ignores a reservation whose size is unknown', () => {
    expect(
      availableCredits({ credits: 100, quota: null }, [
        { credits: Number.NaN },
        { credits: 10 },
      ]),
    ).toBe(90);
  });
});
