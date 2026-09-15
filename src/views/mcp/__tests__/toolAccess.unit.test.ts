/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * What an agent may actually call.
 *
 * Contents computes the effective policy as `session ∩ source` and refuses
 * anything outside it. These tests hold the page to the same arithmetic,
 * because the failure they prevent is a page that agrees with the person
 * debugging it: a tool sitting in a session's allowlist, drawn as allowed,
 * and refused at every call.
 *
 * @module views/mcp/__tests__/toolAccess.unit.test
 */

import { describe, expect, it } from 'vitest';
import type { ContentSource, McpConfiguration } from '../../../api/contents/generated';
import {
  APPROVAL_POLICY_LOOK,
  effectiveTools,
  mcpConfigOf,
  withdrawnTools,
} from '../ToolAccess';

describe('effectiveTools', () => {
  it('keeps only what both the session and the source allow', () => {
    expect(effectiveTools(['query_source', 'list_secrets'], ['query_source'])).toEqual([
      'query_source',
    ]);
  });

  it('does not let a session widen what the source allows', () => {
    // The rule Contents states outright: a session cannot widen the source.
    expect(effectiveTools(['attach_content'], ['query_source'])).toEqual([]);
  });

  it('allows nothing when the source allows nothing', () => {
    // An empty allowlist is not "unrestricted": `check_tool` refuses every
    // tool that is not in the list, so this session can call none of them.
    expect(effectiveTools(['query_source'], [])).toEqual([]);
    expect(effectiveTools(['query_source'], undefined)).toEqual([]);
  });

  it('allows nothing when the session was granted nothing', () => {
    expect(effectiveTools([], ['query_source'])).toEqual([]);
    expect(effectiveTools(undefined, ['query_source'])).toEqual([]);
  });

  it('sorts, so two sessions of one source read the same way', () => {
    expect(
      effectiveTools(
        ['query_source', 'attach_content'],
        ['query_source', 'attach_content'],
      ),
    ).toEqual(['attach_content', 'query_source']);
  });

  it('counts a tool listed twice once', () => {
    expect(effectiveTools(['query_source', 'query_source'], ['query_source'])).toEqual([
      'query_source',
    ]);
  });
});

describe('withdrawnTools', () => {
  it('names what the session still lists and the source has stopped allowing', () => {
    // The set that makes an agent fail in a way neither record explains on
    // its own, which is the reason to read the two together at all.
    expect(withdrawnTools(['query_source', 'list_secrets'], ['query_source'])).toEqual([
      'list_secrets',
    ]);
  });

  it('is empty when the source still allows everything the session has', () => {
    expect(withdrawnTools(['query_source'], ['query_source', 'attach_content'])).toEqual(
      [],
    );
  });

  it('names every tool when the source allows none', () => {
    expect(withdrawnTools(['a', 'b'], [])).toEqual(['a', 'b']);
  });

  it('has nothing to say about a session that was granted nothing', () => {
    expect(withdrawnTools([], ['query_source'])).toEqual([]);
  });

  it('partitions the session exactly, with the effective set', () => {
    const session = ['a', 'b', 'c'];
    const source = ['b', 'c', 'd'];
    expect(
      [...effectiveTools(session, source), ...withdrawnTools(session, source)].sort(),
    ).toEqual(['a', 'b', 'c']);
  });
});

describe('mcpConfigOf', () => {
  const source = (kind: ContentSource['kind']): ContentSource =>
    ({
      kind,
      uid: '01SRC',
      name: 'a source',
      configuration: { kind: 'mcp', transport: 'streamable-http' } as McpConfiguration,
    }) as ContentSource;

  it('reads the configuration of an MCP source', () => {
    expect(mcpConfigOf(source('mcp'))?.transport).toBe('streamable-http');
  });

  it('reads nothing off a source that is not one', () => {
    // A Dataset's configuration has no approval policy, and treating it as
    // one would draw a policy nobody set.
    expect(mcpConfigOf(source('dataset'))).toBeUndefined();
  });
});

describe('APPROVAL_POLICY_LOOK', () => {
  it('has words for every policy the contract can return', () => {
    for (const policy of ['explicit', 'auto-allowlisted', 'never'] as const) {
      expect(APPROVAL_POLICY_LOOK[policy].label.trim()).toBeTruthy();
      expect(APPROVAL_POLICY_LOOK[policy].note.trim()).toBeTruthy();
    }
  });

  it('draws the policy that stops calls differently from the two that do not', () => {
    expect(APPROVAL_POLICY_LOOK.explicit.variant).not.toBe(
      APPROVAL_POLICY_LOOK.never.variant,
    );
    expect(APPROVAL_POLICY_LOOK.explicit.variant).not.toBe(
      APPROVAL_POLICY_LOOK['auto-allowlisted'].variant,
    );
  });

  it('does not describe any policy as unrestricted', () => {
    // Every one of the three refuses a tool outside the allowlist. A note
    // saying otherwise would be the misreading this page exists to prevent.
    for (const policy of ['explicit', 'auto-allowlisted', 'never'] as const) {
      expect(APPROVAL_POLICY_LOOK[policy].note.toLowerCase()).not.toContain(
        'unrestricted',
      );
    }
  });
});
