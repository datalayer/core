/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * What a personal policy page says about a value that will have no effect.
 *
 * A personal layer only narrows. Denying a tool here denies it; *permitting*
 * one an organization denies does nothing, because denials union across
 * layers and cannot be lifted from below. A cap of 60 under an
 * organization's 30 leaves the effective cap at 30.
 *
 * The page says so beside the field rather than refusing the value, and that
 * distinction is what these tests hold: the same personal layer governs
 * personal-scope work, where no organization narrows anything, so refusing
 * would make somebody's own policy unwritable because of where they happen
 * to work.
 */

import { describe, expect, it } from 'vitest';
import { cappedLower, deniedElsewhere } from '../PersonalPolicy';

const ACME = {
  uid: '01ACME',
  name: 'Acme',
  rules: { toolDenylist: ['execute_cell'], maxCallsPerMinute: 30 },
};
const BETA = {
  uid: '01BETA',
  name: 'Beta',
  rules: { toolDenylist: ['delete_file'], maxCallsPerMinute: 10 },
};

describe('permitting a tool an organization denies', () => {
  it('is named, with the organization that denies it', () => {
    expect(deniedElsewhere('execute_cell', [ACME])).toEqual([
      'Acme denies execute_cell',
    ]);
  });

  it('names every organization that denies it, not just the first', () => {
    // Somebody in two organizations needs to know about both; being told
    // about one and surprised by the other is worse than being told nothing.
    const said = deniedElsewhere('execute_cell\ndelete_file', [ACME, BETA]);
    expect(said).toHaveLength(2);
  });

  it('says nothing about a tool nobody denies', () => {
    expect(deniedElsewhere('read_cell', [ACME, BETA])).toEqual([]);
  });

  it('says nothing when the field is empty', () => {
    expect(deniedElsewhere('', [ACME])).toEqual([]);
  });

  it('says nothing for somebody with no organizations', () => {
    expect(deniedElsewhere('execute_cell', [])).toEqual([]);
  });

  it('ignores an organization that has written no policy', () => {
    expect(
      deniedElsewhere('execute_cell', [{ uid: '01X', name: 'X', rules: null }]),
    ).toEqual([]);
  });
});

describe('a limit wider than an organization allows', () => {
  it('is named, with the cap that will actually apply', () => {
    expect(cappedLower('60', [ACME], 'maxCallsPerMinute')).toEqual([
      'Acme caps it at 30',
    ]);
  });

  it('says nothing when the personal limit is stricter', () => {
    // 10 under Acme's 30 is exactly what a personal layer is for.
    expect(cappedLower('10', [ACME], 'maxCallsPerMinute')).toEqual([]);
  });

  it('says nothing when the two agree', () => {
    expect(cappedLower('30', [ACME], 'maxCallsPerMinute')).toEqual([]);
  });

  it('names the strictest of several', () => {
    const said = cappedLower('60', [ACME, BETA], 'maxCallsPerMinute');
    expect(said).toContain('Acme caps it at 30');
    expect(said).toContain('Beta caps it at 10');
  });

  it('says nothing about a blank field', () => {
    // No personal limit is not a wide limit — it is no limit of your own,
    // and the organization's applies untouched.
    expect(cappedLower('', [ACME], 'maxCallsPerMinute')).toEqual([]);
  });

  it('says nothing about nonsense', () => {
    expect(cappedLower('lots', [ACME], 'maxCallsPerMinute')).toEqual([]);
  });

  it('ignores an organization that caps nothing', () => {
    expect(
      cappedLower('60', [{ uid: '01X', name: 'X', rules: {} }], 'maxCallsPerMinute'),
    ).toEqual([]);
  });

  it('ignores a stored zero rather than reading it as the strictest cap', () => {
    // A non-positive limit is *no limit* everywhere in this system. Read as
    // a cap of zero it would be the lowest of all, and the page would tell
    // somebody their organization allows nothing.
    expect(
      cappedLower(
        '60',
        [{ uid: '01X', name: 'X', rules: { maxCallsPerMinute: 0 } }],
        'maxCallsPerMinute',
      ),
    ).toEqual([]);
  });

  it('looks at the rule it was asked about and no other', () => {
    expect(cappedLower('60', [ACME], 'maxCreditsPerDay')).toEqual([]);
  });
});
