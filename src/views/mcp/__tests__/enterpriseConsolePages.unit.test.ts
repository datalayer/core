/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Which pages the console has, and who may open each.
 *
 * The wiring, not the components. A page added to the type and to the
 * navigation but missing from a role's list is a tab nobody can reach; one
 * added to a role's list but missing from the navigation is a page with no
 * way in. Both look exactly like the feature not being built.
 */

import { describe, expect, it } from 'vitest';
import {
  ENTERPRISE_CONSOLE_PAGES,
  pagesForRoles,
  type EnterpriseConsolePage,
} from '../EnterpriseConsole';

const OWNER = ['organization_owner'];
const AUDITOR = ['organization_security_auditor'];
const REVIEWER = ['organization_usage_reviewer'];

describe('the console’s pages', () => {
  it('gives an owner every page there is', () => {
    // Not a hardcoded list: adding a page and forgetting the owner is the
    // mistake this catches, and a copy of the list would not catch it.
    const every = ENTERPRISE_CONSOLE_PAGES.map(page => page.id);
    expect(pagesForRoles(OWNER).slice().sort()).toEqual(every.slice().sort());
  });

  it('lists every page a role may open in the navigation', () => {
    const navigable = new Set(ENTERPRISE_CONSOLE_PAGES.map(page => page.id));
    for (const roles of [OWNER, AUDITOR, REVIEWER]) {
      for (const page of pagesForRoles(roles)) {
        expect(navigable.has(page)).toBe(true);
      }
    }
  });

  it('lets an auditor read the service agents', () => {
    // An audit row naming `agent_uid` needs somewhere that says what that
    // agent is, and the list carries no key.
    expect(pagesForRoles(AUDITOR)).toContain('service-agents');
  });

  it('does not let an auditor reach the delegated grants', () => {
    // Somebody else's grant is that person's to revoke.
    expect(pagesForRoles(AUDITOR)).not.toContain('agents');
  });

  it('gives a usage reviewer the overview and nothing else', () => {
    expect(pagesForRoles(REVIEWER)).toEqual(['overview']);
  });

  it('gives somebody with no role in the organization nothing', () => {
    expect(pagesForRoles([])).toEqual([]);
  });

  it('lets an auditor read the policy', () => {
    // Asked why a call was refused, an auditor needs to see the rule that
    // refused it. The page carries no secret.
    expect(pagesForRoles(AUDITOR)).toContain('policy');
  });

  it('has Service Agents as a page of its own', () => {
    const ids: EnterpriseConsolePage[] = ENTERPRISE_CONSOLE_PAGES.map(p => p.id);
    expect(ids).toContain('service-agents');
  });

  it('lets an auditor read the alert rules', () => {
    // What an organization watches for is part of the posture an auditor is
    // there to read.
    expect(pagesForRoles(AUDITOR)).toContain('alerts');
  });

  it('lets an auditor read the team layers', () => {
    // Asked why one team's agents are treated differently, an auditor needs
    // the layer that treats them so.
    expect(pagesForRoles(AUDITOR)).toContain('teams');
  });

  it('has Teams as a page of its own', () => {
    const ids: EnterpriseConsolePage[] = ENTERPRISE_CONSOLE_PAGES.map(p => p.id);
    expect(ids).toContain('teams');
  });

  it('has Alerts as a page of its own', () => {
    const ids: EnterpriseConsolePage[] = ENTERPRISE_CONSOLE_PAGES.map(p => p.id);
    expect(ids).toContain('alerts');
  });

  it('has Policy as a page of its own', () => {
    const ids: EnterpriseConsolePage[] = ENTERPRISE_CONSOLE_PAGES.map(p => p.id);
    expect(ids).toContain('policy');
  });
});
