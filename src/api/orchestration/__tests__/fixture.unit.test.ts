/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * TypeScript reads the same canonical fixture Python does
 * (PLAN_ORCHESTRATOR.md, O0-01).
 *
 * `datalayer_core/orchestration/fixtures/orchestration-v1.json` is written
 * and read back by `datalayer_core/tests/test_orchestration_model.py`. Here
 * the same document is walked to its leaves against
 * `ORCHESTRATION_FIELDS`, which is generated from the pydantic models: a
 * field added on one side, or spelled differently, fails in one of the two
 * suites. The types themselves cannot do this on their own — `src/**\/__tests__`
 * is outside the tsconfig and a type vanishes at runtime — which is why the
 * generator emits the field lists as data.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  ORCHESTRATION_ACKNOWLEDGEMENT_ORDER,
  ORCHESTRATION_COMMANDS,
  ORCHESTRATION_FIELDS,
  ORCHESTRATION_LIMITS,
  type Acknowledgement,
  type AgentCardMapping,
  type Artifact,
  type ArtifactCommit,
  type DescriptorMapping,
  type Execution,
  type ExecutionEvent,
  type ExecutionsDelegate,
  type ManifestResolution,
} from '../generated';

const FIXTURE = resolve(
  __dirname,
  '../../../../datalayer_core/orchestration/fixtures/orchestration-v1.json',
);

const fixture = JSON.parse(readFileSync(FIXTURE, 'utf8')) as Record<
  string,
  Record<string, unknown>
>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Hold one document, and everything under it, to the model it claims. */
const check = (model: string, value: unknown, path: string): void => {
  const fields = ORCHESTRATION_FIELDS[model];
  expect(fields, `${path} is a ${model}, which is not generated`).toBeDefined();
  expect(isRecord(value), `${path} is not an object`).toBe(true);
  const record = value as Record<string, unknown>;
  const declared = new Set([...fields.required, ...fields.optional]);
  for (const required of fields.required) {
    expect(Object.keys(record), `${path} is missing ${required}`).toContain(
      required,
    );
  }
  for (const key of Object.keys(record)) {
    expect(declared.has(key), `${path}.${key} is not a field of ${model}`).toBe(
      true,
    );
  }
  for (const [key, nested] of Object.entries(fields.refs)) {
    const held = record[key];
    if (held === undefined || held === null) {
      continue;
    }
    const items = Array.isArray(held) ? held : [held];
    items.forEach((item, index) =>
      check(
        nested,
        item,
        Array.isArray(held) ? `${path}.${key}[${index}]` : `${path}.${key}`,
      ),
    );
  }
};

describe('the canonical orchestration fixture', () => {
  it('is made of records the generated types declare, to their leaves', () => {
    expect(Object.keys(fixture).length).toBeGreaterThan(0);
    for (const [model, record] of Object.entries(fixture)) {
      check(model, record, model);
    }
  });

  it('is the execution of section 5.2, with its tree and its trace', () => {
    const execution = fixture.Execution as unknown as Execution;
    expect(execution.executionId).toBe('exec_8d21c4');
    expect(execution.rootExecutionId).toBe(execution.parentExecutionId);
    expect(execution.depth).toBe(1);
    expect(execution.status).toBe('running');
    expect(execution.agent.protocol).toBe('a2a');
    expect(execution.trace.traceparent).toMatch(/^00-[0-9a-f]{32}-/);
    expect(
      execution.context.references.map(reference => reference.uri),
    ).toEqual([
      'datalayer:notebook/ntb-7f3a91@rev-42',
      'datalayer:dataset/dst-51ce08@v3',
      'datalayer:sandbox/sbx-0d19aa@snapshot-2',
    ]);
  });

  it('carries the correlation an event needs to be placed in a tree', () => {
    const event = fixture.ExecutionEvent as unknown as ExecutionEvent;
    const execution = fixture.Execution as unknown as Execution;
    expect(event.rootExecutionId).toBe(execution.rootExecutionId);
    expect(event.executionId).toBe(execution.executionId);
    expect(event.attemptId).toBe(execution.currentAttemptId);
    expect(event.traceparent).toBe(execution.trace.traceparent);
    expect(event.previousState).toBe('retrying');
    expect(event.state).toBe('running');
  });

  it('keeps every attempt that produced an artifact', () => {
    // 19.8, question 4: the first commit wins and the later attempt is
    // recorded rather than overwriting it.
    const artifact = fixture.Artifact as unknown as Artifact;
    const attempts = (artifact.provenance ?? []).map(one => one.attemptId);
    expect(new Set(attempts).size).toBe(2);
    expect(artifact.status).toBe('committed');
    expect(artifact.supersededBy ?? null).toBeNull();
    // Two provenances cannot say between them whose version was committed.
    expect(artifact.committedBy).toBe(attempts[0]);
  });

  it('arbitrates a conflicting commit the way 19.8 decided (O0-10)', () => {
    // Conformance scenario 13: the second attempt reached commit after the
    // first, so its report is registered with its own provenance, marked
    // superseded and pointed at the artifact that beat it. Nothing is
    // overwritten and nothing is dropped.
    const commit = fixture.ArtifactCommit as unknown as ArtifactCommit;
    expect(commit.won).toBe(false);
    expect(commit.attemptId).not.toBe(commit.winningAttemptId);
    const byStatus = Object.fromEntries(
      (commit.artifacts ?? []).map(one => [one.status, one]),
    );
    expect(byStatus.committed.committedBy).toBe(commit.winningAttemptId);
    expect(byStatus.superseded.supersededBy).toBe(
      byStatus.committed.artifactId,
    );
    expect(byStatus.superseded.committedBy ?? null).toBeNull();
    expect(byStatus.superseded.provenance?.[0].attemptId).toBe(
      commit.attemptId,
    );
  });

  it('resolves the manifest of section 5.3 against what was served (O0-09)', () => {
    const resolution =
      fixture.ManifestResolution as unknown as ManifestResolution;
    const manifest = fixture.ContextManifest as unknown as {
      references: Array<{ uri: string }>;
    };
    // One answer per reference, in the manifest's order, and nothing added.
    expect((resolution.references ?? []).map(one => one.uri)).toEqual(
      manifest.references.map(one => one.uri),
    );
    expect(resolution.usable).toBe(true);
    expect(resolution.errors ?? []).toEqual([]);
    for (const reference of resolution.references ?? []) {
      expect(reference.status).toBe('resolved');
      expect(reference.resolvedVersion).toBe(reference.uri.split('@')[1]);
    }
  });

  it('says what an agent card could not state and could not keep (O0-08)', () => {
    const mapping = fixture.DescriptorMapping as unknown as DescriptorMapping;
    expect(mapping.source).toBe('a2a-agent-card');
    const gaps = new Set((mapping.gaps ?? []).map(one => one.field));
    // The scheduler's fields, which A2A has no way of stating...
    expect(gaps.has('descriptor.cost')).toBe(true);
    expect(gaps.has('descriptor.trustLevel')).toBe(true);
    // ...and they are reported rather than guessed.
    expect(mapping.descriptor.capabilities ?? []).toEqual([]);
    expect(mapping.descriptor.trustLevel ?? 'untrusted').toBe('untrusted');
    // The card written back out drops the Datalayer identity, and says so.
    const written = fixture.AgentCardMapping as unknown as AgentCardMapping;
    expect(Object.keys(written.card)).not.toContain('agentId');
    expect((written.gaps ?? []).map(one => one.field)).toContain(
      'descriptor.agentId',
    );
  });

  it('has an idempotency key on the mutating command and none on the query', () => {
    const delegate =
      fixture.ExecutionsDelegate as unknown as ExecutionsDelegate;
    const acknowledgement =
      fixture.Acknowledgement as unknown as Acknowledgement;
    expect(delegate.idempotencyKey).toBeTruthy();
    expect(acknowledgement.idempotencyKey).toBe(delegate.idempotencyKey);
    expect(Object.keys(fixture.AgentsDiscover)).not.toContain('idempotencyKey');
  });

  it('is generated beside the twelve commands, the five milestones and the limits', () => {
    expect(ORCHESTRATION_COMMANDS).toHaveLength(12);
    expect(
      ORCHESTRATION_COMMANDS.filter(command => command.mutating).map(
        command => command.name,
      ),
    ).toEqual([
      'agents.create',
      'agents.attach',
      'executions.delegate',
      'executions.steer',
      'executions.pause',
      'executions.resume',
      'executions.cancel',
      'executions.checkpoint',
      'executions.terminate',
    ]);
    expect(ORCHESTRATION_ACKNOWLEDGEMENT_ORDER).toEqual([
      'received',
      'accepted',
      'started',
      'checkpointed',
      'completed',
    ]);
    // 19.8, question 7.
    expect(ORCHESTRATION_LIMITS.delegation).toEqual({
      maxDepth: 3,
      maxChildrenPerParent: 8,
      maxExecutionsPerTree: 32,
    });
    expect(ORCHESTRATION_LIMITS.retry.maxRetries).toBe(2);
    expect(ORCHESTRATION_LIMITS.retry.backoffMultiplier).toBeGreaterThan(1);
  });
});
