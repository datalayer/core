/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/** A rule after a tab, setting it apart from those after it (28 November 2026). */

import { describe, expect, it } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import { ThemeProvider } from '@primer/react';
import { ViewTabs } from '../ViewTabs';

describe('ViewTabs', () => {
  it('draws a separator after a tab that asks for one, and none otherwise', () => {
    const { container } = render(
      <ThemeProvider>
        <ViewTabs
          label="Runs"
          value="all"
          onChange={() => undefined}
          tabs={[
            { id: 'all', label: 'All', separatorAfter: true },
            { id: 'open', label: 'Open' },
            { id: 'done', label: 'Done' },
          ]}
        />
      </ThemeProvider>,
    );
    const separators = container.querySelectorAll('[data-tab-separator]');
    expect(separators).toHaveLength(1);
    expect(separators[0].getAttribute('role')).toBe('separator');
    // Right after All, before Open.
    expect(separators[0].previousElementSibling?.getAttribute('data-tab')).toBe(
      'all',
    );
    expect(separators[0].nextElementSibling?.getAttribute('data-tab')).toBe(
      'open',
    );
    expect(container.querySelectorAll('[role="tab"]')).toHaveLength(3);
  });
});
