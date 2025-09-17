/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * @module LibrarySection
 * @description Section component for organizing library items by type (notebooks, folders, etc.).
 * Handles loading states, empty states, and renders collections of LibraryItem components.
 */

import React from 'react';
import { Box, Heading, Text, ActionList } from '@primer/react';
import LibraryItem from './LibraryItem';
import SkeletonItem from './SkeletonItem';

/**
 * @interface LibrarySectionProps
 * @description Props for the LibrarySection component
 */
export interface LibrarySectionProps {
  title: string;
  icon: React.ComponentType<{ size?: number }>;
  items: Array<{
    id: string;
    name: string;
    modifiedAt: string;
    description?: string;
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
  previousItemCount?: number;
}

/**
 * @component LibrarySection
 * @description Renders a section of library items with header, loading states, and empty states
 * @param {LibrarySectionProps} props - The component props
 * @param {string} props.title - Section title
 * @param {React.ComponentType} props.icon - Icon component for the section
 * @param {Array} props.items - Array of items to display
 * @param {boolean} props.loading - Whether the section is loading
 * @param {string | null} props.selectedItemId - ID of the currently selected item
 * @param {string} props.emptyMessage - Message to show when no items
 * @param {function} props.onItemSelect - Handler for item selection
 * @param {function} props.onItemDownload - Handler for item download
 * @param {function} props.onItemDelete - Handler for item deletion
 * @param {boolean} [props.showOpenButton=false] - Whether to show open button on items
 * @param {function} [props.getItemIcon] - Function to get icon for specific items
 * @param {number} [props.previousItemCount=0] - Previous item count for skeleton loading
 * @returns {JSX.Element} The rendered library section component
 */
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
  previousItemCount = 0,
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
        <Box
          sx={{
            border: '1px solid',
            borderColor: 'border.default',
            borderRadius: 2,
            overflow: 'hidden',
          }}
        >
          <ActionList>
            <SkeletonItem count={previousItemCount || 3} />
          </ActionList>
        </Box>
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
