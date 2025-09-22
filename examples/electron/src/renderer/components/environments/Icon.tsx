/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * @module Icon
 * @description Environment icon component that displays appropriate icons or images for different environment types.
 * Shows custom images when available, or falls back to GPU (ZapIcon) or CPU (CpuIcon) icons based on environment type.
 */

import React from 'react';
import { Box } from '@primer/react';
import { CpuIcon, ZapIcon } from '@primer/octicons-react';
import { EnvironmentIconProps } from '../../../shared/types';
import {
  isGPUEnvironmentType,
  parseEnvironmentDescription,
} from '../../utils/environments';

/**
 * @component Icon
 * @description Renders an icon for an environment, using custom images when available or type-appropriate icons as fallback
 * @param {EnvironmentIconProps} props - The component props
 * @param {Environment} props.environment - The environment object containing name, title, description, etc.
 * @param {number} [props.size=24] - The size of the icon in pixels
 * @returns {JSX.Element} The rendered icon component
 */
const Icon: React.FC<EnvironmentIconProps> = ({ environment, size = 24 }) => {
  const parsed = parseEnvironmentDescription(environment.description || '');

  return (
    <Box
      sx={{
        color: 'fg.muted',
        minWidth: size + 16,
        '&:focus-visible': {
          outline: '2px solid',
          outlineColor: 'accent.emphasis',
          outlineOffset: '2px',
          borderRadius: 1,
        },
      }}
    >
      {parsed?.imageUrl ? (
        <img
          src={parsed.imageUrl}
          width={size}
          height={size}
          alt={`${environment.title || environment.name} environment`}
          style={{ display: 'block' }}
        />
      ) : isGPUEnvironmentType(environment) ? (
        <ZapIcon size={size} />
      ) : (
        <CpuIcon size={size} />
      )}
    </Box>
  );
};

export default Icon;
