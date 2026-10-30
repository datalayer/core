/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { describe, expect, it } from 'vitest';

import * as client from '../client';
import type { ExternalDefinition, ExternalPlan } from '../types';

import definition from './external-definition.golden.json';

const options = { baseUrl: 'https://a.example', accountUid: 'org' };

describe('an imported definition', () => {
  it('reads the record the service keeps', () => {
    // The same file the runtime parses and the service stores: if a field
    // moves, this stops compiling or stops matching.
    const golden = definition.external_definition as ExternalDefinition;
    const plan = definition.external_plan as ExternalPlan;
    expect(golden.source.kind).toBe('archive');
    expect(golden.capabilities[0].status).toBe('framework-run');
    expect(plan.policy.network).toBe('inference');
    expect(plan.reproduction).toContain('inspect-ai==');
  });

  it('downloads its source and its evidence under the account', () => {
    expect(client.externalSourceUrl(options, 'e1', 2)).toBe(
      'https://a.example/api/ai-agents/v1/evals/evalsets/e1/external-source?version=2&account_uid=org',
    );
    expect(client.caseArtifactUrl(options, 'r1', 'c 1', 'abc')).toBe(
      'https://a.example/api/ai-agents/v1/evals/runs/r1/cases/c%201/artifacts/abc?account_uid=org',
    );
  });
});
