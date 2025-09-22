/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * @module Packages
 * @description Component for displaying a list of environment packages as labels.
 * Shows a limited number of packages with an "and more" indicator when the list is truncated.
 */

import React from 'react';
import { Box, Text, Label } from '@primer/react';
import { EnvironmentPackagesProps } from '../../../shared/types';

/**
 * @component Packages
 * @description Renders a list of environment packages as small labels
 * @param {EnvironmentPackagesProps} props - The component props
 * @param {string[]} props.packages - Array of package names to display
 * @param {number} [props.maxVisible=6] - Maximum number of packages to show before truncating
 * @returns {JSX.Element | null} The rendered packages component or null if no packages
 */
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
