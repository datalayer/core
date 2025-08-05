/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { describe, it, expect } from 'vitest';
import { App } from '../App';

describe('App Component', () => {
  it('should be a function component', () => {
    expect(typeof App).toBe('function');
  });

  it('should be defined', () => {
    expect(App).toBeDefined();
  });

  it('component name should be App', () => {
    expect(App.name).toBe('App');
  });
});
