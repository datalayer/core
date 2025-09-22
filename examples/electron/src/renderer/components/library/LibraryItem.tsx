/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * @module LibraryItem
 * @description Individual library item component with actions (open, download, delete).
 * Displays item information and provides action buttons with custom styling and accessibility features.
 */

import React from 'react';
import { Box, Text, ActionList, IconButton } from '@primer/react';
import { PlayIcon, DownloadIcon, TrashIcon } from '@primer/octicons-react';
import { COLORS } from '../../../shared/constants/colors';

/**
 * @interface LibraryItemProps
 * @description Props for the LibraryItem component
 */
export interface LibraryItemProps {
  item: {
    id: string;
    name: string;
    modifiedAt: string;
    description?: string;
    type?: string;
  };
  icon: React.ComponentType<{ size?: number }>;
  isSelected: boolean;
  onSelect: () => void;
  onDownload: () => void;
  onDelete: () => void;
  showOpenButton?: boolean;
}

/**
 * @component LibraryItem
 * @description Renders a single library item with action buttons
 * @param {LibraryItemProps} props - The component props
 * @param {Object} props.item - The library item data
 * @param {React.ComponentType} props.icon - Icon component to display
 * @param {boolean} props.isSelected - Whether the item is selected
 * @param {function} props.onSelect - Handler for item selection
 * @param {function} props.onDownload - Handler for download action
 * @param {function} props.onDelete - Handler for delete action
 * @param {boolean} [props.showOpenButton=false] - Whether to show the open button
 * @returns {JSX.Element} The rendered library item component
 */
const LibraryItem: React.FC<LibraryItemProps> = ({
  item,
  icon: _Icon,
  isSelected,
  onSelect,
  onDownload,
  onDelete,
  showOpenButton = false,
}) => {
  return (
    <ActionList.Item
      key={item.id}
      sx={{
        cursor: 'default',
        py: 3,
        bg: isSelected ? 'accent.subtle' : undefined,
        '&:hover': {
          bg: 'canvas.subtle',
        },
        '&:focus': {
          outline: 'none !important',
          boxShadow: 'inset 0 0 0 2px #117964 !important',
        },
        '&:focus-visible': {
          outline: 'none !important',
          boxShadow: 'inset 0 0 0 2px #117964 !important',
        },
        '&:focus:not(:hover)': {
          outline: 'none !important',
          boxShadow: 'inset 0 0 0 2px #117964 !important',
        },
      }}
    >
      <Box sx={{ flex: 1 }}>
        <Text sx={{ fontWeight: 'semibold', fontSize: 2, mb: 1 }}>
          {item.name}
        </Text>
        {item.description && (
          <Text
            sx={{
              fontSize: 1,
              color: 'fg.subtle',
              display: 'block',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: '100%',
            }}
          >
            {item.description}
          </Text>
        )}
      </Box>
      <ActionList.TrailingVisual>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {showOpenButton && (
            <IconButton
              aria-label="Open"
              icon={PlayIcon}
              size="large"
              variant="invisible"
              sx={{
                color: COLORS.brand.primary + ' !important',
                '& svg': {
                  color: COLORS.brand.primary + ' !important',
                  fill: COLORS.brand.primary + ' !important',
                  width: '20px',
                  height: '20px',
                },
                '&:hover': {
                  color: COLORS.brand.primaryHover + ' !important',
                  backgroundColor: `${COLORS.brand.primary}15`,
                  '& svg': {
                    color: COLORS.brand.primaryHover + ' !important',
                    fill: COLORS.brand.primaryHover + ' !important',
                  },
                },
              }}
              onClick={e => {
                e.stopPropagation();
                onSelect();
              }}
            />
          )}
          <IconButton
            aria-label="Download"
            icon={DownloadIcon}
            size="large"
            variant="invisible"
            sx={{
              '& svg': {
                width: '20px',
                height: '20px',
              },
            }}
            onClick={e => {
              e.stopPropagation();
              onDownload();
            }}
          />
          <IconButton
            aria-label="Delete"
            icon={TrashIcon}
            size="large"
            variant="invisible"
            sx={{
              color: COLORS.palette.redPrimary + ' !important',
              '& svg': {
                color: COLORS.palette.redPrimary + ' !important',
                fill: COLORS.palette.redPrimary + ' !important',
                width: '20px',
                height: '20px',
              },
              '&:hover': {
                color: COLORS.palette.redHover + ' !important',
                backgroundColor: `${COLORS.palette.redPrimary}10`,
                '& svg': {
                  color: COLORS.palette.redHover + ' !important',
                  fill: COLORS.palette.redHover + ' !important',
                },
              },
            }}
            onClick={e => {
              e.stopPropagation();
              onDelete();
            }}
          />
        </Box>
      </ActionList.TrailingVisual>
    </ActionList.Item>
  );
};

export default LibraryItem;
