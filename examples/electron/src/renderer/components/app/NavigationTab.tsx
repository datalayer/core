/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import React from 'react';
import { Header } from '@primer/react';
import { COLORS } from '../../constants/colors';
import { NavigationTabProps } from '../../../shared/types';

const NavigationTab: React.FC<NavigationTabProps> = ({
  label,
  icon: Icon,
  isActive,
  onClick,
  'aria-label': ariaLabel,
}) => {
  return (
    <Header.Item>
      <Header.Link
        href="#"
        onClick={(e: React.MouseEvent) => {
          e.preventDefault();
          onClick();
        }}
        aria-label={ariaLabel || label}
        sx={{
          fontWeight: 'normal',
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          borderBottom: isActive
            ? `2px solid ${COLORS.brand.primary}`
            : '2px solid transparent',
          paddingBottom: '4px',
          '&:hover': {
            textDecoration: 'none',
            borderBottom: isActive
              ? `2px solid ${COLORS.brand.primary}`
              : '2px solid transparent',
          },
        }}
      >
        <Icon size={16} />
        <span>{label}</span>
      </Header.Link>
    </Header.Item>
  );
};

export default NavigationTab;
