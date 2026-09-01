/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * A Primer `Tooltip` never wraps a `Text` or a `Label`.
 *
 * Primer warns about it at runtime — "expects a single React element that
 * contains interactive content" — and the reason is not pedantry: a tooltip
 * on a span appears on hover and nowhere else, so the thing it says does not
 * exist for anybody using a keyboard or a screen reader. It is a way of
 * writing information down that hides it from the readers most likely to
 * need it.
 *
 * Both offenders were on `/mcp/agents`, and both had started life as a
 * `title` attribute that somebody upgraded. The fix went the other way: the
 * text lives in `title` for the mouse and in the accessible name for
 * everything else.
 *
 * Only `Text` and `Label` are refused. They are the two Primer components
 * that render a bare inline element, which makes them the whole population
 * of this mistake — a `Box` with `role="button"` and a tab stop is a
 * deliberate target and passes, as does a variable holding a `<button>`.
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';

const sourceFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap(entry => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      return entry === 'node_modules' || entry === '__tests__'
        ? []
        : sourceFiles(path);
    }
    return path.endsWith('.tsx') ? [path] : [];
  });

/** The line a `<Tooltip` opens on, and the few that follow it. */
const tooltipTargets = (source: string): string[] => {
  const lines = source.split('\n');
  const found: string[] = [];
  lines.forEach((line, index) => {
    if (line.includes('<Tooltip')) {
      found.push(lines.slice(index, index + 8).join('\n'));
    }
  });
  return found;
};

describe('what a Primer Tooltip is allowed to wrap', () => {
  const files = sourceFiles(join(__dirname, '..', '..'));

  it('finds the tooltips at all', () => {
    // So a rename in Primer fails here rather than making the assertion
    // below pass against a file list with nothing in it.
    const total = files.reduce(
      (count, file) => count + tooltipTargets(readFileSync(file, 'utf8')).length,
      0,
    );
    expect(total).toBeGreaterThan(0);
  });

  it('never wraps a Text or a Label', () => {
    const offenders: string[] = [];
    for (const file of files) {
      for (const target of tooltipTargets(readFileSync(file, 'utf8'))) {
        // The element opened immediately after the tooltip's own tag.
        const child = target.slice(target.indexOf('>') + 1);
        if (/^\s*<(Text|Label)[\s>]/.test(child)) {
          offenders.push(file.replace(/.*\/src\//, 'src/'));
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
