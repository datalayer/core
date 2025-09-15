/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * @module Header
 * @description Library page header component with space selection and refresh functionality.
 * Includes title, description, space selector dropdown, and refresh button with custom styling.
 */

import React from 'react';
import {
  Box,
  Heading,
  Text,
  IconButton,
  FormControl,
  Select,
} from '@primer/react';
import { SyncIcon } from '@primer/octicons-react';
import { COLORS } from '../../../shared/constants/colors';
import { HeaderProps } from '../../../shared/types';

/**
 * @component Header
 * @description Renders the library page header with space selection and refresh controls
 * @param {HeaderProps} props - The component props
 * @param {Object | null} props.selectedSpace - Currently selected space object
 * @param {Array} props.userSpaces - Array of available user spaces
 * @param {boolean} props.loading - Whether the page is loading
 * @param {boolean} props.isRefreshing - Whether a refresh operation is in progress
 * @param {function} props.onSpaceChange - Handler for space selection changes
 * @param {function} props.onRefresh - Handler for refresh button clicks
 * @returns {JSX.Element} The rendered header component
 */
const Header: React.FC<HeaderProps> = ({
  selectedSpace,
  userSpaces,
  loading,
  isRefreshing,
  onSpaceChange,
  onRefresh,
}) => {
  return (
    <Box sx={{ mb: 3 }}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          mb: 3,
        }}
      >
        <Box>
          <Heading as="h2" sx={{ mb: 1 }}>
            Documents
          </Heading>
          <Text sx={{ color: 'fg.subtle' }}>
            Manage your documents and notebooks in the cloud
          </Text>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 2 }}>
          <Box
            sx={{
              minWidth: '200px',
              '& .FormControl-select:focus': {
                borderColor: '#117964 !important',
                outline: 'none !important',
                boxShadow: '0 0 0 3px rgba(17, 121, 100, 0.1) !important',
              },
              '& .FormControl-select:focus-visible': {
                borderColor: '#117964 !important',
                outline: 'none !important',
                boxShadow: '0 0 0 3px rgba(17, 121, 100, 0.1) !important',
              },
              '& select:focus': {
                borderColor: '#117964 !important',
                outline: 'none !important',
                boxShadow: '0 0 0 3px rgba(17, 121, 100, 0.1) !important',
              },
            }}
          >
            <FormControl disabled={loading}>
              <FormControl.Label sx={{ mb: 1, fontSize: 1 }}>
                Select Space
              </FormControl.Label>
              <Select
                value={selectedSpace?.uid || selectedSpace?.id || ''}
                onChange={onSpaceChange}
                sx={{
                  minWidth: '200px',
                  '&:focus, &:focus-visible, &:focus-within': {
                    borderColor: '#117964 !important',
                    outline: '2px solid #117964 !important',
                    outlineOffset: '-1px !important',
                    boxShadow: 'none !important',
                  },
                }}
              >
                {userSpaces.length > 0 ? (
                  userSpaces.map(space => (
                    <Select.Option
                      key={space.uid || space.id}
                      value={space.uid || space.id}
                    >
                      {space.name}
                    </Select.Option>
                  ))
                ) : (
                  <Select.Option value="" disabled>
                    Loading spaces...
                  </Select.Option>
                )}
              </Select>
            </FormControl>
          </Box>

          <IconButton
            aria-label="Refresh documents"
            icon={SyncIcon}
            size="medium"
            variant="invisible"
            onClick={onRefresh}
            disabled={loading || isRefreshing}
            sx={{
              color: COLORS.brand.primary + ' !important',
              border: '1px solid',
              borderColor: COLORS.brand.primary,
              borderRadius: '6px',
              '& svg': {
                color: COLORS.brand.primary + ' !important',
                fill: COLORS.brand.primary + ' !important',
              },
              '&:hover:not([disabled])': {
                backgroundColor: `${COLORS.brand.primary}15`,
                borderColor: COLORS.brand.primaryHover,
                color: COLORS.brand.primaryHover + ' !important',
                '& svg': {
                  color: COLORS.brand.primaryHover + ' !important',
                  fill: COLORS.brand.primaryHover + ' !important',
                },
              },
              '&:disabled': {
                opacity: 0.6,
                borderColor: 'border.default',
                color: 'fg.muted',
              },
            }}
          />
        </Box>
      </Box>
    </Box>
  );
};

export default Header;
