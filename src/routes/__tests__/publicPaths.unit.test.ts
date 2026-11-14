/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { describe, expect, it } from 'vitest';
import { isPublicPath } from '../publicPaths';

describe('public paths', () => {
  it('lets a signed-out visitor open the presentations and every deck (14 November 2026)', () => {
    expect(isPublicPath('/visitors/decks')).toBe(true);
    expect(isPublicPath('/visitors/decks/agents/marketer-agent')).toBe(true);
    expect(isPublicPath('/visitors/decks/agents/marketer-agent/print')).toBe(
      true,
    );
  });

  it('keeps signed-in pages private', () => {
    expect(isPublicPath('/admin/decks')).toBe(false);
    expect(isPublicPath('/studio')).toBe(false);
    expect(isPublicPath('/visitorsx')).toBe(false);
  });
});
