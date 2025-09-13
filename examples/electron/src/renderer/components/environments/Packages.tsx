/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import React from 'react';
import { Box, Text, Label } from '@primer/react';
import { EnvironmentPackagesProps } from '../../../shared/types';

const Packages: React.FC<EnvironmentPackagesProps> = ({
  packages,
  maxVisible = 6,
}) => {
  if (!packages || packages.length === 0) {
    return null;
  }

  return (
    <Box sx={{ mt: 1 }}>
      <Text
        sx={{
          fontSize: 0,
          color: 'fg.subtle',
          mb: 1,
        }}
      >
        <strong>Packages:</strong>
      </Text>
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 1,
        }}
      >
        {packages.slice(0, maxVisible).map((pkg, idx) => (
          <Label key={idx} size="small">
            {pkg}
          </Label>
        ))}
        {packages.length > maxVisible && (
          <Label size="small" variant="default">
            and more
          </Label>
        )}
      </Box>
    </Box>
  );
};

export default Packages;
