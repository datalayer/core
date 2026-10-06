/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import {
  AdminLabel,
  AlphaLabel,
  DefaultLabel,
  NAMED_LABEL_TONES,
  SoonLabel,
} from '../StatusLabels';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

describe('the named labels, in the quiet colours (LOOP T-29)', () => {
  it('draws admin quiet, as soon is, never in a verdict’s amber', () => {
    expect(NAMED_LABEL_TONES.admin).toBe('neutral');
    expect(NAMED_LABEL_TONES).toEqual({
      alpha: 'accent',
      admin: 'neutral',
      default: 'accent',
      soon: 'neutral',
    });
    // Success, attention and danger are kept for verdicts.
    for (const tone of Object.values(NAMED_LABEL_TONES)) {
      expect(['accent', 'neutral']).toContain(tone);
    }
  });

  it('says each one’s word', async () => {
    await act(async () =>
      root.render(
        <>
          <AlphaLabel />
          <AdminLabel />
          <DefaultLabel />
          <SoonLabel />
        </>,
      ),
    );
    expect(container.textContent).toBe('alphaadmindefaultsoon');
  });
});
