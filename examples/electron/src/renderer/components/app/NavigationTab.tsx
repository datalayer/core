/**
 * @module renderer/components/app/NavigationTab
 * @description Individual navigation tab component with active state styling.
 */

/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import React from 'react';
import { Header } from '@primer/react';
import { COLORS } from '../../../shared/constants/colors';
import { NavigationTabProps } from '../../../shared/types';

/**
 * Navigation tab component for app header.
 * Displays an icon and label with active state indication.
 * @component
 * @param props - Component props
 * @param props.label - Tab label text
 * @param props.icon - Icon component to display
 * @param props.isActive - Whether this tab is currently active
 * @param props.onClick - Click handler for tab selection
 * @param props.aria-label - Optional ARIA label for accessibility
 * @returns Rendered navigation tab
 */
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
          color: isActive ? COLORS.brand.primary : COLORS.text.primary,
          borderBottom: isActive
            ? `2px solid ${COLORS.brand.primary}`
            : '2px solid transparent',
          paddingBottom: '4px',
          '&:hover': {
            textDecoration: 'none',
            color: `${COLORS.brand.primary} !important`,
            borderBottom: isActive
              ? `2px solid ${COLORS.brand.primary}`
              : '2px solid transparent',
          },
          '&:active': {
            color: `${COLORS.brand.primary} !important`,
          },
          '&:visited': {
            color: isActive
              ? `${COLORS.brand.primary} !important`
              : `${COLORS.text.primary} !important`,
          },
          '&:focus': {
            color: isActive
              ? `${COLORS.brand.primary} !important`
              : `${COLORS.text.primary} !important`,
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
