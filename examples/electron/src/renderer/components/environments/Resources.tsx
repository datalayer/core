/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import React from 'react';
import { Box, Text, Label } from '@primer/react';
import { PackageIcon } from '@primer/octicons-react';
import { EnvironmentResourcesProps } from '../../../shared/types';
import { formatResources } from '../../utils/environments';

const Resources: React.FC<EnvironmentResourcesProps> = ({ resources }) => {
  if (!resources) {
    return null;
  }

  const formattedResources = formatResources(resources);

  if (formattedResources.length === 0) {
    return null;
  }

  return (
    <Box
      sx={{
        mt: 2,
        pt: 2,
        borderTop: '1px solid',
        borderColor: 'border.muted',
      }}
    >
      <Text sx={{ fontSize: 0, fontWeight: 'bold', mb: 1 }}>
        <PackageIcon size={14} /> Resources:
      </Text>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        {formattedResources.map((resource, idx) => (
          <Label key={idx} size="small">
            {resource}
          </Label>
        ))}
      </Box>
    </Box>
  );
};

export default Resources;
