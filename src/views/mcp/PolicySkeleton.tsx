/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import type { JSX } from 'react';
import { SkeletonBox } from '@primer/react/experimental';
import { Box } from '@datalayer/primer-addons';

/**
 * A policy layer while it loads: a few rows of rules, in the shape the
 * table will take, never a spinner (15 November 2026).
 */
export function PolicySkeleton({
  rows = 4,
  what = 'Loading the policy',
}: {
  rows?: number;
  what?: string;
}): JSX.Element {
  const widths = ['62%', '48%', '70%', '55%', '66%'];
  return (
    <Box
      role="status"
      aria-busy
      aria-label={what}
      display="grid"
      gap={3}
      py={3}
      data-policy-skeleton=""
    >
      {Array.from({ length: rows }, (_, index) => (
        <Box key={index} display="flex" alignItems="center" gap={3}>
          <SkeletonBox width="24px" height="24px" />
          <SkeletonBox width={widths[index % widths.length]} height="16px" />
          <Box flex={1} />
          <SkeletonBox width="72px" height="20px" />
        </Box>
      ))}
    </Box>
  );
}

export default PolicySkeleton;
