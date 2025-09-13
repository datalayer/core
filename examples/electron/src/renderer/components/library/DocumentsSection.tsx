/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import React from 'react';
import { Box, Heading, Text, ActionList } from '@primer/react';
import { FileIcon } from '@primer/octicons-react';
import { DocumentsSectionProps } from '../../../shared/types';
import LoadingSpinner from './LoadingSpinner';
import DocumentItem from './DocumentItem';

const DocumentsSection: React.FC<DocumentsSectionProps> = ({
  documents,
  loading,
  selectedNotebook,
  onDocumentSelect,
  onDownloadDocument,
  onDeleteDocument,
}) => {
  return (
    <Box sx={{ mb: 3 }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          mb: 2,
          pb: 1,
          borderBottom: '1px solid',
          borderColor: 'border.subtle',
        }}
      >
        <FileIcon size={20} />
        <Heading as="h3" sx={{ fontSize: 2 }}>
          Documents ({loading ? '...' : documents.length})
        </Heading>
      </Box>

      {loading ? (
        <LoadingSpinner message="Loading documents..." />
      ) : documents.length > 0 ? (
        <Box
          sx={{
            border: '1px solid',
            borderColor: 'border.default',
            borderRadius: 2,
            overflow: 'hidden',
          }}
        >
          <ActionList>
            {documents.map(document => (
              <DocumentItem
                key={document.id}
                document={document}
                isSelected={selectedNotebook === document.id}
                onSelect={() => onDocumentSelect(document)}
                onDownload={() => onDownloadDocument(document)}
                onDelete={() => onDeleteDocument(document)}
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
          <FileIcon size={32} />
          <Text sx={{ mt: 2, color: 'fg.muted' }}>No documents yet</Text>
        </Box>
      )}
    </Box>
  );
};

export default DocumentsSection;
