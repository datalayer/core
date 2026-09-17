/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * What the admitted-clients panel is wired to, and what it must not claim.
 *
 * `allowedClients` is the policy rule whose typo fails silently in the
 * direction that matters: a misspelled entry never matches, and every agent
 * from that vendor is refused with "your organization does not admit this
 * client" — which reads to its owner as a deliberate decision. The panel
 * exists to make that visible, so the failures worth hunting are the ones
 * that would make it *reassuring* when it should not be.
 *
 * Two of them. A layer that names no allowlist must never render as "no
 * clients admitted", because the gateway admits every client through a blank
 * list — and somebody reads this panel to check exactly that. And an entry
 * whose document cannot be read must be shown as unreadable rather than left
 * looking like the ones that resolved.
 *
 * The third is the panel being absent where it matters. An organization
 * owner is the person most likely to paste a client id wrong and least
 * likely to see the refusal it causes.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const read = (file: string): string =>
  readFileSync(join(__dirname, '..', file), 'utf8');

const panel = read('AdmittedClients.tsx');

describe('the panel’s readings', () => {
  it('never renders an empty allowlist as a list that admits nothing', () => {
    // The one that would state the opposite of what is enforced. It has to
    // branch on `allowlisted` before it maps the entries at all.
    expect(panel).toMatch(/if \(!answer\.allowlisted\)/);
  });

  it('says every client is admitted when no allowlist is named', () => {
    expect(panel).toMatch(/every client is admitted/);
  });

  it('distinguishes a document that cannot be read from one that resolved', () => {
    // `resolved === false`, not `!resolved` — a hostname entry has no
    // `resolved` at all, and falsy-testing it would mark every host entry
    // as broken.
    expect(panel).toMatch(/resolved === false/);
    expect(panel).not.toMatch(/!client\.resolved\b/);
  });

  it('treats a hostname as a whole-host entry rather than a failure', () => {
    expect(panel).toMatch(/kind === 'hostname'/);
    expect(panel).toMatch(/Whole host/);
  });

  it('flags a client whose redirects go to the reader’s own machine', () => {
    // A document cannot prove which local program is listening on the port.
    expect(panel).toMatch(/localhostOnly/);
    expect(panel).toMatch(/localhost/i);
  });

  it('says it is describing the saved list while a draft is unsaved', () => {
    // Otherwise it is not stale, it is wrong: it would appear to describe a
    // line somebody just typed and has not saved.
    expect(panel).toMatch(/edited &&/);
    expect(panel).toMatch(/saved/i);
  });

  it('does not turn a failed description into a broken page', () => {
    // The field above still works and the policy is unaffected. A blankslate
    // here would look like the policy could not be loaded.
    expect(panel).toMatch(/described\.isError/);
    expect(panel).toMatch(/still what is enforced/);
  });
});

describe('where the panel is rendered', () => {
  const layers: [string, string][] = [
    ['OrganizationPolicy.tsx', 'organization'],
    ['TeamPolicies.tsx', 'team'],
    ['PersonalPolicy.tsx', 'personal'],
  ];

  for (const [file, scope] of layers) {
    it(`is on the ${scope} policy form, for its own layer`, () => {
      // Every layer may name an allowlist and every layer's entries can be
      // mistyped. A panel on one form only would make the other two silently
      // worse than no panel at all — somebody would learn to trust it.
      const source = read(file);
      expect(source).toContain('AdmittedClients');
      expect(source).toContain(`scope="${scope}"`);
    });
  }

  it('describes the layer being edited, not a fixed one', () => {
    // The subject is passed through rather than hardcoded: a team form
    // describing the organization's entries would be confidently wrong.
    expect(read('TeamPolicies.tsx')).toMatch(/subjectUid=\{teamUid\}/);
    expect(read('OrganizationPolicy.tsx')).toMatch(/subjectUid=\{orgUid\}/);
    expect(read('PersonalPolicy.tsx')).toMatch(/subjectUid=\{userUid\}/);
  });
});
