/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
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
          <Box sx={{ minWidth: '200px' }}>
            <FormControl>
              <FormControl.Label sx={{ mb: 1, fontSize: 1 }}>
                Select Space
              </FormControl.Label>
              <Select
                value={selectedSpace?.uid || selectedSpace?.id || ''}
                onChange={onSpaceChange}
                disabled={loading}
                sx={{ minWidth: '200px' }}
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
