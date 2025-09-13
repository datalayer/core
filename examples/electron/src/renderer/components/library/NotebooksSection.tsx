/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import React from 'react';
import { Box, Heading, Text, ActionList } from '@primer/react';
import { BookIcon } from '@primer/octicons-react';
import { NotebooksSectionProps } from '../../../shared/types';
import LoadingSpinner from './LoadingSpinner';
import NotebookItem from './NotebookItem';

const NotebooksSection: React.FC<NotebooksSectionProps> = ({
  notebooks,
  loading,
  selectedNotebook,
  onNotebookSelect,
  onDownloadNotebook,
  onDeleteNotebook,
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
          <BookIcon size={20} />
          <Heading as="h3" sx={{ fontSize: 2 }}>
            Notebooks ({loading ? '...' : notebooks.length})
          </Heading>
        </Box>
      </Box>

      {loading ? (
        <LoadingSpinner message="Loading notebooks..." />
      ) : notebooks.length > 0 ? (
        <Box
          sx={{
            border: '1px solid',
            borderColor: 'border.default',
            borderRadius: 2,
            overflow: 'hidden',
          }}
        >
          <ActionList>
            {notebooks.map(notebook => (
              <NotebookItem
                key={notebook.id}
                notebook={notebook}
                isSelected={selectedNotebook === notebook.id}
                onSelect={() => onNotebookSelect(notebook)}
                onDownload={() => onDownloadNotebook(notebook)}
                onDelete={() => onDeleteNotebook(notebook)}
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
          <BookIcon size={32} />
          <Text sx={{ mt: 2, color: 'fg.muted' }}>No notebooks yet</Text>
        </Box>
      )}
    </Box>
  );
};

export default NotebooksSection;
