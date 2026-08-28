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
 * @module components/mcp/ScopeList
 */

import { Label, Text, Tooltip } from '@primer/react';
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
        <Tooltip text={scopes.join('\n')} direction="n">
          <Text sx={{ fontSize: 0, color: 'fg.muted' }}>+{rest}</Text>
        </Tooltip>
      )}
    </Box>
  );
};

export default ScopeList;
