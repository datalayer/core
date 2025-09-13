/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import React from 'react';
import { Box, Heading, Text, Button } from '@primer/react';
import { COLORS } from '../../constants/colors';
import { EnvironmentCardProps } from '../../../shared/types';
import Icon from './Icon';
import TypeLabel from './TypeLabel';
import Description from './Description';
import Resources from './Resources';

const Card: React.FC<EnvironmentCardProps> = ({
  environment,
  isSelected,
  onSelect,
}) => {
  return (
    <Box
      key={environment.name}
      sx={{
        p: 3,
        mb: 2,
        bg: 'canvas.subtle',
        border: '1px solid',
        borderColor: isSelected ? COLORS.brand.primary : 'border.default',
        borderRadius: 2,
        cursor: 'pointer',
        transition: 'all 0.2s',
        '&:hover': {
          borderColor: COLORS.brand.primaryLight,
          bg: 'canvas.default',
        },
        '&:focus-visible': {
          outline: '2px solid',
          outlineColor: COLORS.brand.primary,
          outlineOffset: '2px',
        },
      }}
      onClick={() => onSelect(environment.name)}
      onKeyDown={(e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(environment.name);
        }
      }}
      tabIndex={0}
      role="button"
      aria-label={`Select ${environment.title || environment.name} environment`}
      aria-pressed={isSelected}
    >
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'start',
          mb: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'start', gap: 2 }}>
          <Icon environment={environment} size={40} />
          <Box sx={{ flex: 1 }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                mb: 1,
              }}
            >
              <Heading as="h3" sx={{ fontSize: 2 }}>
                {environment.title || environment.name}
              </Heading>
              <TypeLabel environment={environment} />
            </Box>

            <Description environment={environment} />

            {environment.image && (
              <Text
                sx={{
                  fontSize: 0,
                  color: 'fg.subtle',
                  fontFamily: 'mono',
                  mt: 1,
                }}
              >
                Image: {environment.image}
              </Text>
            )}
          </Box>
        </Box>

        {isSelected && (
          <Button
            size="small"
            aria-label={`${environment.title || environment.name} is currently selected`}
            sx={{
              backgroundColor: COLORS.brand.primary,
              color: 'white',
              cursor: 'default',
              '&:hover': {
                backgroundColor: COLORS.brand.primary,
              },
              '&:focus-visible': {
                outline: '2px solid',
                outlineColor: COLORS.palette.white,
                outlineOffset: '2px',
              },
            }}
          >
            Selected
          </Button>
        )}
      </Box>

      <Resources resources={environment.resources} />
    </Box>
  );
};

export default Card;
