/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import React from 'react';
import { Box, Heading, Text, ActionList } from '@primer/react';
import LoadingSpinner from './LoadingSpinner';
import LibraryItem from './LibraryItem';

export interface LibrarySectionProps {
  title: string;
  icon: React.ComponentType<{ size?: number }>;
  items: Array<{
    id: string;
    name: string;
    modifiedAt: string;
    type?: string;
  }>;
  loading: boolean;
  selectedItemId: string | null;
  emptyMessage: string;
  onItemSelect: (item: any) => void;
  onItemDownload: (item: any) => void;
  onItemDelete: (item: any) => void;
  showOpenButton?: boolean;
  getItemIcon?: (item: any) => React.ComponentType<{ size?: number }>;
}

const LibrarySection: React.FC<LibrarySectionProps> = ({
  title,
  icon: SectionIcon,
  items,
  loading,
  selectedItemId,
  emptyMessage,
  onItemSelect,
  onItemDownload,
  onItemDelete,
  showOpenButton = false,
  getItemIcon,
}) => {
  return (
    <Box sx={{ mb: 3 }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
          mb: 2,
          pb: 1,
          borderBottom: '1px solid',
          borderColor: 'border.subtle',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <SectionIcon size={20} />
          <Heading as="h3" sx={{ fontSize: 2 }}>
            {title} ({loading ? '...' : items.length})
          </Heading>
        </Box>
      </Box>

      {loading ? (
        <LoadingSpinner message={`Loading ${title.toLowerCase()}...`} />
      ) : items.length > 0 ? (
        <Box
          sx={{
            border: '1px solid',
            borderColor: 'border.default',
            borderRadius: 2,
            overflow: 'hidden',
          }}
        >
          <ActionList>
            {items.map(item => (
              <LibraryItem
                key={item.id}
                item={item}
                icon={getItemIcon ? getItemIcon(item) : SectionIcon}
                isSelected={selectedItemId === item.id}
                onSelect={() => onItemSelect(item)}
                onDownload={() => onItemDownload(item)}
                onDelete={() => onItemDelete(item)}
                showOpenButton={showOpenButton}
              />
            ))}
          </ActionList>
        </Box>
      ) : (
        <Box
          sx={{
            p: 4,
            textAlign: 'center',
            bg: 'canvas.subtle',
            border: '1px solid',
            borderColor: 'border.default',
            borderRadius: 2,
          }}
        >
          <SectionIcon size={32} />
          <Text sx={{ mt: 2, color: 'fg.muted' }}>{emptyMessage}</Text>
        </Box>
      )}
    </Box>
  );
};

export default LibrarySection;
