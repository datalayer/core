/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * The scopes a grant carries, as labels.
 *
 * A grant with a dozen scopes would push every other column off the row, so
 * the list shows the first few and says how many more there are; the whole
 * list is in the title, which is where a reader who needs it looks.
 *
 * The `+N` is **not** a Primer `Tooltip`. That component requires an
 * interactive child and warns otherwise, for a good reason: a tooltip on a
 * span appears on hover and nowhere else, so it does not exist for anybody
 * using a keyboard or a screen reader. Wrapping the count in a `<button>`
 * would silence the warning by trading one problem for another — a tab stop
 * that announces itself as a button and does nothing when pressed.
 *
 * So the scopes go where they are actually readable: `title` for the mouse,
 * and the accessible name for everything else. Which is what the sentence
 * above always said.
 *
 * @module components/mcp/ScopeList
 */

import { Label, Text } from '@primer/react';
import { Box } from '@datalayer/primer-addons';

export interface ScopeListProps {
  scopes: string[];
  /** How many are drawn before the rest become a count. */
  max?: number;
}

export const ScopeList = ({ scopes, max = 3 }: ScopeListProps): JSX.Element => {
  if (scopes.length === 0) {
    // A grant with no scope grants nothing, which is worth saying rather
    // than drawing as an empty cell.
    return <Text sx={{ fontSize: 0, color: 'fg.muted' }}>No scope</Text>;
  }
  const shown = scopes.slice(0, max);
  const rest = scopes.length - shown.length;
  return (
    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
      {shown.map(scope => (
        <Label key={scope} size="small" variant="secondary">
          {scope}
        </Label>
      ))}
      {rest > 0 && (
        <Text
          as="span"
          title={scopes.join('\n')}
          // The hidden ones by name, not "3 more scopes". A count is what is
          // already on the screen; the names are the part that is missing,
          // and scopes are the ceiling on what this agent may do.
          aria-label={`and ${rest} more: ${scopes.slice(max).join(', ')}`}
          sx={{ fontSize: 0, color: 'fg.muted' }}
        >
          +{rest}
        </Text>
      )}
    </Box>
  );
};

export default ScopeList;
