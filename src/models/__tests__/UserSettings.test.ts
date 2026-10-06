/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { describe, it, expect } from 'vitest';
import { SHOW_ADVANCED_KEY, UserSettings } from '../UserSettings';

describe('UserSettings', () => {
  it('reads Show advanced from the settings IAM keeps (LOOP U-33)', () => {
    expect(SHOW_ADVANCED_KEY).toBe('show_advanced_b');
    expect(new UserSettings({ show_advanced_b: true }).showAdvanced).toBe(true);
    expect(new UserSettings({ show_advanced_b: false }).showAdvanced).toBe(
      false,
    );
  });

  it('leaves Show advanced unset for somebody who never chose', () => {
    expect(new UserSettings({}).showAdvanced).toBeUndefined();
  });

  it('keeps the other settings beside it', () => {
    const settings = new UserSettings({
      docs_in_place_b: false,
      show_advanced_b: true,
    });
    expect(settings.docsInPlace).toBe(false);
    expect(settings.showAdvanced).toBe(true);
  });
});
