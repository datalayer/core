/*
 * Copyright (c) 2024-2025 Datalayer, Inc.
 *
 * BSD 3-Clause License
 */

import type { DynamicToolUIPart } from 'ai';
import { Text, Flash } from '@primer/react';

interface IDynamicToolPartProps {
  part: DynamicToolUIPart;
}

export function DynamicToolPart({ part }: IDynamicToolPartProps) {
  return (
    <Flash variant="warning" sx={{ marginBottom: 2 }}>
      <Text>Dynamic Tool: {JSON.stringify(part)}</Text>
    </Flash>
  );
}
