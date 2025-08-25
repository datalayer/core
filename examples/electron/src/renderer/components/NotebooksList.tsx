/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Heading,
  Text,
  Button,
  ActionList,
  IconButton,
  Label,
  Spinner,
  Flash,
} from '@primer/react';
import {
  FileIcon,
  PlusIcon,
  TrashIcon,
  DownloadIcon,
  PencilIcon,
  ClockIcon,
} from '@primer/octicons-react';

interface NotebookItem {
  id: string;
  name: string;
  path: string;
  createdAt: string;
  modifiedAt: string;
  size?: number;
  kernel?: string;
}

const NotebooksList: React.FC = () => {
  const [notebooks, setNotebooks] = useState<NotebookItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedNotebook, setSelectedNotebook] = useState<string | null>(null);

  useEffect(() => {
    fetchNotebooks();
  }, []);

  const fetchNotebooks = async () => {
    try {
      setLoading(true);
      setError(null);

      // Use the IPC bridge to fetch notebooks
      const response = await window.datalayerAPI.listNotebooks();
      
      if (response.success && response.data) {
        // Transform the response to our NotebookItem format
        // Based on the Datalayer API item structure
        const notebookItems: NotebookItem[] = response.data.map((nb: any) => ({
          id: nb.uid || nb.id || nb.path,
          name: nb.name_t || nb.name || nb.path?.split('/').pop() || 'Untitled',
          path: nb.path || `/${nb.name_t || nb.name || 'notebook'}`,
          createdAt: nb.creation_ts_dt || nb.created_at || new Date().toISOString(),
          modifiedAt: nb.last_update_ts_dt || nb.modified_at || new Date().toISOString(),
          size: nb.size,
          kernel: nb.kernel_spec?.display_name || 'Python 3',
        }));

        setNotebooks(notebookItems);
        
        // Log space info if available
        if (response.spaceInfo) {
          console.log('Loaded notebooks from space:', response.spaceInfo.name || response.spaceInfo.handle);
        }
      } else {
        setError(response.error || 'Failed to load notebooks');
      }
    } catch (err) {
      console.error('Failed to fetch notebooks:', err);
      setError('Failed to load notebooks. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNotebook = () => {
    console.log('Creating new notebook...');
    // Implement notebook creation logic
  };

  const handleOpenNotebook = (notebook: NotebookItem) => {
    console.log('Opening notebook:', notebook.name);
    setSelectedNotebook(notebook.id);
    // Implement notebook opening logic
  };

  const handleDeleteNotebook = (notebook: NotebookItem) => {
    console.log('Deleting notebook:', notebook.name);
    // Implement notebook deletion logic
  };

  const handleDownloadNotebook = (notebook: NotebookItem) => {
    console.log('Downloading notebook:', notebook.name);
    // Implement notebook download logic
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffHours < 1) {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      return `${diffMinutes} minutes ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hours ago`;
    } else if (diffHours < 168) {
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const formatSize = (bytes?: number) => {
    if (!bytes) return '--';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Heading as="h2" sx={{ mb: 1 }}>
            Notebooks
          </Heading>
          <Text sx={{ color: 'fg.subtle' }}>
            Manage your Jupyter notebooks in the cloud
          </Text>
        </Box>
        <Button onClick={handleCreateNotebook} leadingVisual={PlusIcon}>
          New Notebook
        </Button>
      </Box>

      {loading ? (
        <Box sx={{ p: 6, textAlign: 'center', bg: 'canvas.subtle', border: '1px solid', borderColor: 'border.default', borderRadius: 2 }}>
          <Spinner size="large" />
          <Text sx={{ mt: 2, display: 'block', color: 'fg.muted' }}>Loading notebooks...</Text>
        </Box>
      ) : (
        <>
          {error && (
            <Flash variant="danger" sx={{ mb: 3 }}>
              {error}
            </Flash>
          )}

          {notebooks.length === 0 ? (
        <Box
          sx={{
            p: 6,
            textAlign: 'center',
            bg: 'canvas.subtle',
            border: '1px solid',
            borderColor: 'border.default',
            borderRadius: 2,
          }}
        >
          <FileIcon size={48} />
          <Heading as="h3" sx={{ mt: 3, mb: 2 }}>
            No notebooks yet
          </Heading>
          <Text sx={{ color: 'fg.subtle', mb: 3 }}>
            Create your first notebook to get started
          </Text>
          <Button onClick={handleCreateNotebook} leadingVisual={PlusIcon}>
            Create Notebook
          </Button>
        </Box>
      ) : (
        <Box
          sx={{
            border: '1px solid',
            borderColor: 'border.default',
            borderRadius: 2,
            overflow: 'hidden',
          }}
        >
          <ActionList>
            {notebooks.map((notebook) => (
              <ActionList.Item
                key={notebook.id}
                onSelect={() => handleOpenNotebook(notebook)}
                sx={{
                  cursor: 'pointer',
                  bg: selectedNotebook === notebook.id ? 'accent.subtle' : undefined,
                }}
              >
                <ActionList.LeadingVisual>
                  <FileIcon />
                </ActionList.LeadingVisual>
                <Box sx={{ flex: 1 }}>
                  <Text sx={{ fontWeight: 'semibold' }}>{notebook.name}</Text>
                  <Box sx={{ display: 'flex', gap: 3, mt: 1 }}>
                    <Text sx={{ fontSize: 0, color: 'fg.subtle' }}>
                      <ClockIcon size={12} /> {formatDate(notebook.modifiedAt)}
                    </Text>
                    <Text sx={{ fontSize: 0, color: 'fg.subtle' }}>
                      Size: {formatSize(notebook.size)}
                    </Text>
                    <Label size="small" variant="accent">
                      {notebook.kernel}
                    </Label>
                  </Box>
                </Box>
                <ActionList.TrailingVisual>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <IconButton
                      aria-label="Edit"
                      icon={PencilIcon}
                      size="small"
                      variant="invisible"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenNotebook(notebook);
                      }}
                    />
                    <IconButton
                      aria-label="Download"
                      icon={DownloadIcon}
                      size="small"
                      variant="invisible"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownloadNotebook(notebook);
                      }}
                    />
                    <IconButton
                      aria-label="Delete"
                      icon={TrashIcon}
                      size="small"
                      variant="invisible"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteNotebook(notebook);
                      }}
                    />
                  </Box>
                </ActionList.TrailingVisual>
              </ActionList.Item>
            ))}
          </ActionList>
        </Box>
      )}
        </>
      )}
    </Box>
  );
};

export default NotebooksList;