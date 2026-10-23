/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * A deck's specification is YAML: Spacer stores and serves it so, and a
 * deck stored as JSON before reads the same.
 */

import { describe, expect, it } from 'vitest';
import { parseDeckSpec } from '../deckSpec';

const SPEC = {
  deck: { title: 'Seed' },
  slides: [
    { type: 'mermaid', diagram: 'flowchart LR\n  A --> B', notes: 'One line.' },
  ],
};

describe('a deck specification', () => {
  it('is read from the YAML Spacer serves', () => {
    const text = [
      'deck:',
      '  title: Seed',
      'slides:',
      '  - type: mermaid',
      '    diagram: |-',
      '      flowchart LR',
      '        A --> B',
      '    notes: >-',
      '      One',
      '      line.',
      '',
    ].join('\n');
    expect(parseDeckSpec(text)).toEqual(SPEC);
  });

  it('is read from JSON, which is YAML', () => {
    expect(parseDeckSpec(JSON.stringify(SPEC))).toEqual(SPEC);
  });

  it('is nothing when there is no text', () => {
    expect(parseDeckSpec(undefined)).toBeUndefined();
    expect(parseDeckSpec('  ')).toBeUndefined();
  });
});
