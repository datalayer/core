/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * @module TypeLabel
 * @description Component for displaying environment type as a styled label.
 * Determines the environment type (CPU, GPU, etc.) and displays it as a primer label.
 */

import React from 'react';
import { Label } from '@primer/react';
import { EnvironmentTypeLabelProps } from '../../../shared/types';
import { getEnvironmentType } from '../../utils/environments';

/**
 * @component TypeLabel
 * @description Renders a label showing the environment type (CPU, GPU, etc.)
 * @param {EnvironmentTypeLabelProps} props - The component props
 * @param {Environment} props.environment - The environment object to determine type from
 * @param {'small' | 'large'} [props.size='small'] - Size of the label
 * @returns {JSX.Element} The rendered type label component
 */
const TypeLabel: React.FC<EnvironmentTypeLabelProps> = ({
  environment,
  size = 'small',
}) => {
  const environmentType = getEnvironmentType(environment);

  return (
    <Label size={size} variant="default">
      {environmentType}
    </Label>
  );
};

export default TypeLabel;
