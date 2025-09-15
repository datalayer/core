/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * @module SelectionSummary
 * @description Component that displays a summary of the currently selected environment.
 * Shows which environment is selected and provides context about its usage.
 */

import React from 'react';
import { Box, Text } from '@primer/react';
import { EnvironmentSelectionSummaryProps } from '../../../shared/types';

/**
 * @component SelectionSummary
 * @description Displays a summary card showing the currently selected environment
 * @param {EnvironmentSelectionSummaryProps} props - The component props
 * @param {string | null} props.selectedEnv - Name of the currently selected environment
 * @param {number} props.environmentsCount - Total number of available environments
 * @returns {JSX.Element | null} The rendered selection summary or null if no environments
 */
const SelectionSummary: React.FC<EnvironmentSelectionSummaryProps> = ({
  selectedEnv,
  environmentsCount,
}) => {
  if (environmentsCount === 0) {
    return null;
  }

  return (
    <Box sx={{ mt: 4, p: 4, bg: 'canvas.subtle', borderRadius: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
        <Text sx={{ fontSize: 1, color: 'fg.muted', fontWeight: 'bold' }}>
          Selected Environment:
        </Text>
        <Text sx={{ fontSize: 1, color: 'fg.default' }}>
          {selectedEnv || 'None'}
        </Text>
      </Box>
      <Text sx={{ fontSize: 0, color: 'fg.subtle', mt: 2, lineHeight: 1.5 }}>
        This environment will be used when creating new runtimes and notebooks.
      </Text>
    </Box>
  );
};

export default SelectionSummary;
