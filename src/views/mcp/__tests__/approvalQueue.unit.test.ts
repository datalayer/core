/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Whether an approval can still be acted on, and what its row says.
 *
 * The wrong answer here is a security surface, not a cosmetic one: a button
 * offered on an approval the server will refuse teaches a reader that the
 * page is unreliable, and a row that reads "waiting on you" forever is one
 * somebody keeps coming back to.
 *
 * @module views/mcp/__tests__/approvalQueue.unit.test
 */

import { describe, expect, it } from 'vitest';
import type { McpApproval } from '../../../api/contents/generated';
import { APPROVAL_LOOK, approvalLook, isDecidable } from '../ApprovalQueue';

const NOW = Date.parse('2026-09-07T12:00:00Z');
const at = (offsetSeconds: number): string =>
  new Date(NOW + offsetSeconds * 1000).toISOString();

const approval = (
  patch: Partial<Pick<McpApproval, 'status' | 'expiresAt'>> = {},
): Pick<McpApproval, 'status' | 'expiresAt'> => ({
  status: 'pending',
  expiresAt: at(3600),
  ...patch,
});

describe('isDecidable', () => {
  it('lets a pending approval inside its window be decided', () => {
    expect(isDecidable(approval(), NOW)).toBe(true);
  });

  it('refuses a pending approval whose deadline has passed', () => {
    // Contents expires lazily, so the record still says `pending`. Trusting
    // it would draw buttons whose only outcome is an error.
    expect(isDecidable(approval({ expiresAt: at(-1) }), NOW)).toBe(false);
  });

  it('refuses one that expires exactly now', () => {
    expect(isDecidable(approval({ expiresAt: at(0) }), NOW)).toBe(false);
  });

  it('refuses every state that is not pending', () => {
    for (const status of ['approved', 'rejected', 'expired', 'consumed'] as const) {
      expect(isDecidable(approval({ status }), NOW)).toBe(false);
    }
  });

  it('treats a deadline it cannot read as passed', () => {
    expect(isDecidable(approval({ expiresAt: 'not-a-time' }), NOW)).toBe(false);
  });

  it('reads the clock rather than a fixed moment', () => {
    const one = approval({ expiresAt: at(60) });
    expect(isDecidable(one, NOW)).toBe(true);
    expect(isDecidable(one, NOW + 61_000)).toBe(false);
  });
});

describe('approvalLook', () => {
  it('draws a pending approval that has run out as expired', () => {
    expect(approvalLook(approval({ expiresAt: at(-1) }), NOW)).toEqual(
      APPROVAL_LOOK.expired,
    );
  });

  it('keeps a live pending approval asking', () => {
    expect(approvalLook(approval(), NOW)).toEqual(APPROVAL_LOOK.pending);
  });

  it('leaves a decided approval saying what was decided', () => {
    expect(approvalLook(approval({ status: 'approved' }), NOW)).toEqual(
      APPROVAL_LOOK.approved,
    );
    expect(approvalLook(approval({ status: 'rejected' }), NOW)).toEqual(
      APPROVAL_LOOK.rejected,
    );
  });

  it('does not call a used approval expired just because its window has closed', () => {
    // An approval that was consumed inside its window and read afterwards is
    // used, not expired — the difference is whether the call happened.
    expect(
      approvalLook(approval({ status: 'consumed', expiresAt: at(-1) }), NOW),
    ).toEqual(APPROVAL_LOOK.consumed);
  });

  it('has a drawing for every state the contract can return', () => {
    const states: McpApproval['status'][] = [
      'pending',
      'approved',
      'rejected',
      'expired',
      'consumed',
    ];
    for (const status of states) {
      expect(APPROVAL_LOOK[status]?.label).toBeTruthy();
    }
  });
});
