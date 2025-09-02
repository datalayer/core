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
  Dialog,
  TextInput,
  FormControl,
  Textarea,
} from '@primer/react';
import {
  FileIcon,
  DownloadIcon,
  PlayIcon,
  ClockIcon,
  AlertIcon,
  FileAddedIcon,
  TrashIcon,
} from '@primer/octicons-react';
import { useRuntimeStore } from '../stores/runtimeStore';
import { COLORS } from '../constants/colors';

interface NotebookItem {
  id: string;
  uid?: string; // Store both id and uid for proper API calls
  name: string;
  path: string;
  createdAt: string;
  modifiedAt: string;
  size?: number;
  kernel?: string;
  cdnUrl?: string;
  description?: string;
}

interface NotebooksListProps {
  onNotebookSelect?: (notebook: {
    id: string;
    name: string;
    path: string;
    cdnUrl?: string;
    description?: string;
  }) => void;
}

const NotebooksList: React.FC<NotebooksListProps> = ({ onNotebookSelect }) => {
  const [notebooks, setNotebooks] = useState<NotebookItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedNotebook, setSelectedNotebook] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newNotebookName, setNewNotebookName] = useState('');
  const [newNotebookDescription, setNewNotebookDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [spaceId, setSpaceId] = useState<string | null>(null);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);

  // Delete dialog state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [notebookToDelete, setNotebookToDelete] = useState<NotebookItem | null>(
    null
  );
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const { canOpenNotebook, getRuntimeForNotebook, setActiveNotebook } =
    useRuntimeStore();

  useEffect(() => {
    fetchNotebooks();
  }, []);

  // Add ESC key handler for dialogs
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();

        if (showDeleteDialog && !isDeleting) {
          setShowDeleteDialog(false);
          setNotebookToDelete(null);
          setDeleteConfirmationText('');
          setError(null);
        } else if (showCreateDialog && !isCreating) {
          setShowCreateDialog(false);
          setNewNotebookName('');
          setNewNotebookDescription('');
          setError(null);
        }
      }
    };

    // Use capture phase to intercept before Dialog component
    document.addEventListener('keydown', handleEscKey, true);
    return () => {
      document.removeEventListener('keydown', handleEscKey, true);
    };
  }, [showDeleteDialog, showCreateDialog, isDeleting, isCreating]);

  const fetchNotebooks = async () => {
    try {
      setLoading(true);
      setError(null);

      // First get user spaces to find the default space ID
      const spacesResponse = await window.datalayerAPI.getUserSpaces();
      if (
        spacesResponse.success &&
        spacesResponse.data &&
        spacesResponse.data.length > 0
      ) {
        const defaultSpace = spacesResponse.data[0];
        setSpaceId(defaultSpace.uid || defaultSpace.id || null);
      }

      // Use the IPC bridge to fetch notebooks
      const response = await window.datalayerAPI.listNotebooks();

      if (response.success && response.data) {
        // Transform the response to our NotebookItem format
        // Based on the Datalayer API item structure
        const notebookItems: NotebookItem[] = response.data.map(
          (nb: Record<string, unknown>) => ({
            id: String(nb.id || nb.uid || nb.path || ''),
            uid: nb.uid as string | undefined,
            name: String(
              nb.name_t ||
                nb.name ||
                (nb.path as string)?.split('/').pop() ||
                'Untitled'
            ),
            path: String(nb.path || `/${nb.name_t || nb.name || 'notebook'}`),
            createdAt: String(
              nb.creation_ts_dt || nb.created_at || new Date().toISOString()
            ),
            modifiedAt: String(
              nb.last_update_ts_dt || nb.modified_at || new Date().toISOString()
            ),
            size:
              (nb.content_length_i as number | undefined) ||
              (nb.size as number | undefined),
            kernel: (nb.kernel_spec as any)?.display_name || 'Python 3',
            cdnUrl: nb.cdn_url_s as string | undefined,
            description: nb.description_t as string | undefined,
          })
        );

        setNotebooks(notebookItems);
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
    setShowCreateDialog(true);
    setNewNotebookName('');
    setNewNotebookDescription('');
  };

  const handleConfirmCreate = async () => {
    if (!newNotebookName.trim()) {
      setError('Notebook name is required');
      return;
    }

    if (!spaceId) {
      setError('No workspace space available. Please try refreshing the page.');
      return;
    }

    try {
      setIsCreating(true);
      setError(null);

      console.info('Creating notebook with params:', {
        spaceId: spaceId,
        name: newNotebookName.trim(),
        description: newNotebookDescription.trim(),
      });

      const result = await window.datalayerAPI.createNotebook(
        spaceId,
        newNotebookName.trim(),
        newNotebookDescription.trim() || undefined
      );

      console.info('Create notebook result:', result);

      if (result.success) {
        // Refresh the notebooks list
        await fetchNotebooks();
        setShowCreateDialog(false);
        setNewNotebookName('');
        setNewNotebookDescription('');

        console.info('Notebook created successfully');
      } else {
        const errorMessage = result.error || 'Failed to create notebook';
        console.error('Create notebook failed:', errorMessage);
        setError(errorMessage);
      }
    } catch (err) {
      console.error('Failed to create notebook:', err);
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'Failed to create notebook. Please try again.';
      setError(errorMessage);
    } finally {
      setIsCreating(false);
    }
  };

  const handleOpenNotebook = (notebook: NotebookItem) => {
    console.info('Opening notebook:', notebook.name);

    // Check if we can open this notebook
    const canOpen = canOpenNotebook(notebook.id);

    if (!canOpen.allowed) {
      setWarningMessage(canOpen.message || 'Cannot open this notebook');
      setTimeout(() => setWarningMessage(null), 5000);
      return;
    }

    // Check if this notebook already has a runtime
    const existingRuntime = getRuntimeForNotebook(notebook.id);
    if (existingRuntime) {
      console.info(
        'Reconnecting to existing runtime for notebook:',
        notebook.name
      );
    }

    setSelectedNotebook(notebook.id);
    setActiveNotebook(notebook.id);

    // Call the parent callback if provided
    if (onNotebookSelect) {
      onNotebookSelect({
        id: notebook.uid || notebook.id, // Use UID for collaboration
        name: notebook.name,
        path: notebook.path,
        cdnUrl: notebook.cdnUrl,
        description: notebook.description,
      });
    }
  };

  const handleDownloadNotebook = async (notebook: NotebookItem) => {
    console.info('Downloading notebook:', notebook.name);

    if (!notebook.cdnUrl) {
      console.error('No CDN URL available for notebook');
      setError('Cannot download notebook - no download URL available');
      return;
    }

    try {
      // Use the proxy API to fetch the notebook
      const response = await window.proxyAPI.httpRequest({
        url: notebook.cdnUrl,
        method: 'GET',
      });

      if (response.status === 200 && response.body) {
        let content;
        if (typeof response.body === 'string') {
          content = response.body;
        } else if (Array.isArray(response.body)) {
          // Handle byte array response
          const jsonString = String.fromCharCode(...response.body);
          content = jsonString;
        } else {
          content = JSON.stringify(response.body);
        }

        // Create a blob and trigger download
        const blob = new Blob([content], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = notebook.name.endsWith('.ipynb')
          ? notebook.name
          : `${notebook.name}.ipynb`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        console.info('Notebook downloaded successfully');
      } else {
        throw new Error('Failed to fetch notebook content');
      }
    } catch (error) {
      console.error('Failed to download notebook:', error);
      setError('Failed to download notebook');
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleDeleteNotebook = (notebook: NotebookItem) => {
    setNotebookToDelete(notebook);
    setDeleteConfirmationText('');
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    if (!notebookToDelete || !spaceId) {
      setError('Unable to delete notebook - missing information');
      return;
    }

    if (deleteConfirmationText !== notebookToDelete.name) {
      setError(
        'Notebook name does not match. Please type the exact name to confirm deletion.'
      );
      return;
    }

    try {
      setIsDeleting(true);
      setError(null);

      console.info('Deleting notebook:', {
        spaceId,
        itemId: notebookToDelete.id,
        name: notebookToDelete.name,
      });

      const result = await window.datalayerAPI.deleteNotebook(
        spaceId,
        notebookToDelete.uid || notebookToDelete.id
      );

      if (result.success) {
        // Refresh the notebooks list
        await fetchNotebooks();
        setShowDeleteDialog(false);
        setNotebookToDelete(null);
        setDeleteConfirmationText('');
        console.info('Notebook deleted successfully');
      } else {
        const errorMessage = result.error || 'Failed to delete notebook';
        console.error('Delete notebook failed:', errorMessage);
        setError(errorMessage);
      }
    } catch (err) {
      console.error('Failed to delete notebook:', err);
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'Failed to delete notebook. Please try again.';
      setError(errorMessage);
    } finally {
      setIsDeleting(false);
    }
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

  return (
    <Box>
      <Box
        sx={{
          mb: 3,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Box>
          <Heading as="h2" sx={{ mb: 1 }}>
            Notebooks
          </Heading>
          <Text sx={{ color: 'fg.subtle' }}>
            Manage your Jupyter notebooks in the cloud
          </Text>
        </Box>
        <Button
          onClick={handleCreateNotebook}
          leadingVisual={FileAddedIcon}
          variant="primary"
          sx={{
            // Override Primer's default primary colors completely
            backgroundColor: `${COLORS.brand.primary} !important`,
            borderColor: `${COLORS.brand.primary} !important`,
            color: 'white !important',
            '&:hover:not([disabled])': {
              backgroundColor: `${COLORS.brand.primaryHover} !important`,
              borderColor: `${COLORS.brand.primaryHover} !important`,
              color: 'white !important',
            },
            '&:active:not([disabled])': {
              backgroundColor: `${COLORS.brand.primaryDark} !important`,
              borderColor: `${COLORS.brand.primaryDark} !important`,
              color: 'white !important',
            },
            '&:focus:not([disabled])': {
              backgroundColor: `${COLORS.brand.primary} !important`,
              borderColor: `${COLORS.brand.primaryLight} !important`,
              boxShadow: `0 0 0 3px ${COLORS.brand.primary}33 !important`,
              color: 'white !important',
            },
          }}
        >
          New Notebook
        </Button>
      </Box>

      {loading ? (
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
          <Spinner size="large" sx={{ color: COLORS.brand.primary }} />
          <Text sx={{ mt: 2, display: 'block', color: 'fg.muted' }}>
            Loading notebooks...
          </Text>
        </Box>
      ) : (
        <>
          {error && (
            <Flash variant="danger" sx={{ mb: 3 }}>
              {error}
            </Flash>
          )}

          {warningMessage && (
            <Flash variant="warning" sx={{ mb: 3 }}>
              <AlertIcon /> {warningMessage}
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
              <Button
                onClick={handleCreateNotebook}
                leadingVisual={FileAddedIcon}
                variant="primary"
                sx={{
                  // Override Primer's default primary colors completely
                  backgroundColor: `${COLORS.brand.primary} !important`,
                  borderColor: `${COLORS.brand.primary} !important`,
                  color: 'white !important',
                  '&:hover:not([disabled])': {
                    backgroundColor: `${COLORS.brand.primaryHover} !important`,
                    borderColor: `${COLORS.brand.primaryHover} !important`,
                    color: 'white !important',
                  },
                  '&:active:not([disabled])': {
                    backgroundColor: `${COLORS.brand.primaryDark} !important`,
                    borderColor: `${COLORS.brand.primaryDark} !important`,
                    color: 'white !important',
                  },
                  '&:focus:not([disabled])': {
                    backgroundColor: `${COLORS.brand.primary} !important`,
                    borderColor: `${COLORS.brand.primaryLight} !important`,
                    boxShadow: `0 0 0 3px ${COLORS.brand.primary}33 !important`,
                    color: 'white !important',
                  },
                }}
              >
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
                {notebooks.map(notebook => (
                  <ActionList.Item
                    key={notebook.id}
                    onSelect={() => handleOpenNotebook(notebook)}
                    sx={{
                      cursor: 'pointer',
                      py: 3,
                      bg:
                        selectedNotebook === notebook.id
                          ? 'accent.subtle'
                          : undefined,
                    }}
                  >
                    <ActionList.LeadingVisual sx={{ alignSelf: 'center' }}>
                      <FileIcon size={20} />
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
                          <ClockIcon size={14} />{' '}
                          {formatDate(notebook.modifiedAt)}
                        </Text>
                        <Label size="small" variant="default">
                          {notebook.kernel}
                        </Label>
                      </Box>
                    </Box>
                    <ActionList.TrailingVisual>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <IconButton
                          aria-label="Open"
                          icon={PlayIcon}
                          size="small"
                          variant="invisible"
                          sx={{
                            color: COLORS.brand.primary,
                            '&:hover': {
                              color: COLORS.brand.primaryHover,
                              backgroundColor: `${COLORS.brand.primary}15`,
                            },
                          }}
                          onClick={e => {
                            e.stopPropagation();
                            handleOpenNotebook(notebook);
                          }}
                        />
                        <IconButton
                          aria-label="Download"
                          icon={DownloadIcon}
                          size="small"
                          variant="invisible"
                          onClick={e => {
                            e.stopPropagation();
                            handleDownloadNotebook(notebook);
                          }}
                        />
                        <IconButton
                          aria-label="Delete"
                          icon={TrashIcon}
                          size="small"
                          variant="invisible"
                          sx={{
                            color: 'danger.fg',
                            '&:hover': {
                              color: 'danger.emphasis',
                              backgroundColor: 'danger.subtle',
                            },
                          }}
                          onClick={e => {
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

      {/* Create Notebook Dialog */}
      <Dialog
        isOpen={showCreateDialog}
        onDismiss={() => {
          if (!isCreating) {
            setShowCreateDialog(false);
            setNewNotebookName('');
            setNewNotebookDescription('');
            setError(null);
          }
        }}
        aria-labelledby="create-notebook-title"
      >
        <Dialog.Header id="create-notebook-title">
          Create New Notebook
        </Dialog.Header>

        <Box sx={{ p: 3 }}>
          <FormControl sx={{ mb: 3 }}>
            <FormControl.Label>Notebook Name</FormControl.Label>
            <TextInput
              value={newNotebookName}
              onChange={e => setNewNotebookName(e.target.value)}
              placeholder="e.g., Data Analysis"
              disabled={isCreating}
              autoFocus
              sx={{ width: '100%' }}
            />
          </FormControl>

          <FormControl>
            <FormControl.Label>Description (Optional)</FormControl.Label>
            <Textarea
              value={newNotebookDescription}
              onChange={e => setNewNotebookDescription(e.target.value)}
              placeholder="Brief description of the notebook"
              disabled={isCreating}
              rows={3}
              sx={{ width: '100%', resize: 'none' }}
            />
          </FormControl>

          {error && (
            <Flash variant="danger" sx={{ mt: 3 }}>
              {error}
            </Flash>
          )}
        </Box>

        <Box
          sx={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 2,
            p: 3,
            borderTop: '1px solid',
            borderColor: 'border.default',
          }}
        >
          <Button
            variant="invisible"
            onClick={() => {
              setShowCreateDialog(false);
              setNewNotebookName('');
              setNewNotebookDescription('');
            }}
            disabled={isCreating}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirmCreate}
            disabled={isCreating || !newNotebookName.trim()}
            sx={{
              backgroundColor: COLORS.brand.primary,
              '&:hover': { backgroundColor: COLORS.brand.primaryHover },
              '&:disabled': { opacity: 0.5 },
              color: 'white',
            }}
          >
            {isCreating ? (
              <>
                <Spinner size="small" sx={{ mr: 1, color: 'white' }} />
                Creating...
              </>
            ) : (
              'Create Notebook'
            )}
          </Button>
        </Box>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        isOpen={showDeleteDialog}
        onDismiss={() => {
          if (!isDeleting) {
            setShowDeleteDialog(false);
            setNotebookToDelete(null);
            setDeleteConfirmationText('');
            setError(null);
          }
        }}
        aria-labelledby="delete-notebook-title"
      >
        <Dialog.Header id="delete-notebook-title">
          Delete Notebook
        </Dialog.Header>

        <Box sx={{ p: 4 }}>
          <Text sx={{ mb: 4, color: 'danger.fg', display: 'block' }}>
            <Box sx={{ mr: 2, display: 'inline-block' }}>
              <AlertIcon />
            </Box>
            This action cannot be undone. This will permanently delete the
            notebook <strong>"{notebookToDelete?.name}"</strong>.
          </Text>

          <FormControl sx={{ width: '100%' }} disabled={isDeleting}>
            <FormControl.Label sx={{ mb: 2, display: 'block' }}>
              Please type <strong>{notebookToDelete?.name}</strong> to confirm:
            </FormControl.Label>
            <TextInput
              value={deleteConfirmationText}
              onChange={e => setDeleteConfirmationText(e.target.value)}
              placeholder="Type notebook name here"
              autoFocus
              sx={{ width: '100%' }}
            />
          </FormControl>

          {error && (
            <Flash variant="danger" sx={{ mt: 3 }}>
              {error}
            </Flash>
          )}
        </Box>

        <Box
          sx={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 2,
            p: 3,
            borderTop: '1px solid',
            borderColor: 'border.default',
          }}
        >
          <Button
            variant="invisible"
            onClick={() => {
              setShowDeleteDialog(false);
              setNotebookToDelete(null);
              setDeleteConfirmationText('');
            }}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleConfirmDelete}
            disabled={
              isDeleting || deleteConfirmationText !== notebookToDelete?.name
            }
          >
            {isDeleting ? (
              <>
                <Spinner size="small" sx={{ mr: 1 }} />
                Deleting...
              </>
            ) : (
              'Delete Notebook'
            )}
          </Button>
        </Box>
      </Dialog>
    </Box>
  );
};

export default NotebooksList;
