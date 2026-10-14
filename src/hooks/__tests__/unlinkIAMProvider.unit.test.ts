/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Unlinking a provider: one DELETE to IAM, IAM's refusal as the error the
 * page shows (never a toast), and the user read again only once it is done.
 */

import { describe, expect, it, vi } from 'vitest';
import { unlinkIAMProvider } from '../unlinkIAMProvider';

const IAM = 'https://iam.example';

describe('unlinkIAMProvider', () => {
  it('asks IAM to unlink, without a toast, then reads the user again', async () => {
    const request = vi.fn(async () => ({ success: true }));
    const refresh = vi.fn(async () => {});

    await unlinkIAMProvider(request, IAM, 'linkedin', refresh);

    expect(request).toHaveBeenCalledWith({
      url: `${IAM}/api/iam/v1/me/providers/linkedin`,
      method: 'DELETE',
      notifyOnError: false,
    });
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("throws IAM's refusal sentence and leaves the user as it is", async () => {
    const sentence =
      'GitHub is your only way to sign in to Datalayer: set a password or link another sign-in provider before unlinking it.';
    const request = vi.fn(async () => ({
      success: false,
      message: sentence,
    }));
    const refresh = vi.fn(async () => {});

    await expect(
      unlinkIAMProvider(request, IAM, 'github', refresh),
    ).rejects.toThrow(sentence);
    expect(refresh).not.toHaveBeenCalled();
  });

  it('says something when IAM gives no sentence', async () => {
    const request = vi.fn(async () => ({ success: false }));
    const refresh = vi.fn(async () => {});

    await expect(unlinkIAMProvider(request, IAM, 'x', refresh)).rejects.toThrow(
      'The x account could not be unlinked.',
    );
    expect(refresh).not.toHaveBeenCalled();
  });

  it('resolves only after the user is read again', async () => {
    const order: string[] = [];
    const request = vi.fn(async () => ({ success: true }));
    const refresh = vi.fn(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
      order.push('refreshed');
    });

    await unlinkIAMProvider(request, IAM, 'google', refresh);
    order.push('resolved');

    expect(order).toEqual(['refreshed', 'resolved']);
  });
});
