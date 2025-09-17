/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * @module renderer/components/environments/Description
 * @description Environment description component with parsing for packages and GPU details.
 */

import React from 'react';
import { Text } from '@primer/react';
import { EnvironmentDescriptionProps } from '../../../shared/types';
import { parseEnvironmentDescription } from '../../utils/environments';
import Packages from './Packages';

/**
 * Environment description component.
 * Parses and displays environment descriptions, including GPU details and package lists.
 * @component
 * @param props - Component props
 * @param props.environment - Environment data containing description to parse
 * @returns Rendered description with parsed packages and GPU information
 */
const Description: React.FC<EnvironmentDescriptionProps> = ({
  environment,
}) => {
  const parsed = parseEnvironmentDescription(environment.description || '');

  if (parsed && parsed.mainDescription) {
    return (
      <>
        <Text
          sx={{
            fontSize: 1,
            color: 'fg.default',
            fontWeight: 'bold',
            mb: 1,
          }}
        >
          {parsed.mainDescription}
        </Text>
        {parsed.gpuDetail && (
          <Text
            sx={{
              fontSize: 1,
              color: 'fg.muted',
              mb: 1,
            }}
          >
            GPU: {parsed.gpuDetail}
          </Text>
        )}
        {parsed.packages && parsed.packages.length > 0 && (
          <Packages packages={parsed.packages} />
        )}
      </>
    );
  }

  return (
    <Text sx={{ fontSize: 1, color: 'fg.muted', mb: 2 }}>
      {environment.description || `Environment: ${environment.name}`}
    </Text>
  );
};

export default Description;
