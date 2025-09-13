/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import React from 'react';
import { Box, Text, ActionList, IconButton } from '@primer/react';
import {
  BookIcon,
  PlayIcon,
  DownloadIcon,
  TrashIcon,
  ClockIcon,
} from '@primer/octicons-react';
import { COLORS } from '../../constants/colors';
import { NotebookItemProps } from '../../../shared/types';
import { formatDate } from '../../utils/library';

const NotebookItem: React.FC<NotebookItemProps> = ({
  notebook,
  isSelected,
  onSelect,
  onDownload,
  onDelete,
}) => {
  return (
    <ActionList.Item
      key={notebook.id}
      onSelect={onSelect}
      sx={{
        cursor: 'pointer',
        py: 3,
        bg: isSelected ? 'accent.subtle' : undefined,
        '&:focus-visible': {
          outline: `2px solid ${COLORS.brand.primary}`,
          outlineOffset: '2px',
          borderRadius: '4px',
        },
      }}
    >
      <ActionList.LeadingVisual sx={{ alignSelf: 'center' }}>
        <BookIcon size={20} />
      </ActionList.LeadingVisual>
      <Box sx={{ flex: 1 }}>
        <Text sx={{ fontWeight: 'semibold', fontSize: 2, mb: 1 }}>
          {notebook.name}
        </Text>
        <Box
          sx={{
            display: 'flex',
            gap: 3,
            mt: 1,
            alignItems: 'center',
          }}
        >
          <Text sx={{ fontSize: 1, color: 'fg.subtle' }}>
            <ClockIcon size={14} /> {formatDate(notebook.modifiedAt)}
          </Text>
        </Box>
      </Box>
      <ActionList.TrailingVisual>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <IconButton
            aria-label="Open"
            icon={PlayIcon}
            size="medium"
            variant="invisible"
            sx={{
              color: COLORS.brand.primary + ' !important',
              '& svg': {
                color: COLORS.brand.primary + ' !important',
                fill: COLORS.brand.primary + ' !important',
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
          <IconButton
            aria-label="Download"
            icon={DownloadIcon}
            size="medium"
            variant="invisible"
            onClick={e => {
              e.stopPropagation();
              onDownload();
            }}
          />
          <IconButton
            aria-label="Delete"
            icon={TrashIcon}
            size="medium"
            variant="invisible"
            sx={{
              color: COLORS.palette.redPrimary + ' !important',
              '& svg': {
                color: COLORS.palette.redPrimary + ' !important',
                fill: COLORS.palette.redPrimary + ' !important',
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

export default NotebookItem;
