/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PlayIcon, ToolsIcon } from '@primer/octicons-react';
import { ViewTabs } from '../tabs';

afterEach(cleanup);

describe('ViewTabs', () => {
  const tabs = [
    { id: 'build', label: 'Build', leadingVisual: ToolsIcon },
    { id: 'try', label: 'Try', leadingVisual: PlayIcon, count: 2 },
    { id: 'ship', label: 'Ship', disabled: true, title: 'Not yet' },
  ] as const;

  it('draws a tablist, the open tab selected and primary, each with its leading visual', () => {
    render(
      <ViewTabs
        label="The app"
        tabs={tabs}
        value="build"
        onChange={() => undefined}
      />,
    );
    expect(screen.getByRole('tablist', { name: 'The app' })).toBeTruthy();
    const build = screen.getByRole('tab', { name: 'Build' });
    expect(build.getAttribute('aria-selected')).toBe('true');
    expect(build.querySelector('svg')).toBeTruthy();
    expect(
      screen.getByRole('tab', { name: /Try/ }).querySelector('svg'),
    ).toBeTruthy();
    // No leading visual asked for, none drawn.
    expect(
      screen.getByRole('tab', { name: 'Ship' }).querySelector('svg'),
    ).toBeNull();
    expect(screen.getByText('2')).toBeTruthy();
  });

  it('opens a tab on click and moves with the arrows, skipping a disabled one', () => {
    const onChange = vi.fn();
    render(
      <ViewTabs
        label="The app"
        tabs={tabs}
        value="build"
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByRole('tab', { name: /Try/ }));
    expect(onChange).toHaveBeenLastCalledWith('try');
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Build' }), {
      key: 'ArrowRight',
    });
    expect(onChange).toHaveBeenLastCalledWith('try');
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Build' }), {
      key: 'ArrowLeft',
    });
    expect(onChange).toHaveBeenLastCalledWith('try');
    fireEvent.click(screen.getByRole('tab', { name: 'Ship' }));
    expect(onChange).not.toHaveBeenCalledWith('ship');
  });
});
