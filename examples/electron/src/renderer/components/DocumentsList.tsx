/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Heading,
  Text,
  Button,
  ActionList,
  IconButton,
  Spinner,
  Flash,
  Dialog,
  TextInput,
  FormControl,
  Select,
} from '@primer/react';
import {
  FileIcon,
  DownloadIcon,
  PlayIcon,
  ClockIcon,
  AlertIcon,
  TrashIcon,
  BookIcon,
  SyncIcon,
} from '@primer/octicons-react';
import { useRuntimeStore } from '../stores/runtimeStore';
import { COLORS } from '../constants/colors';
import { testApplicationColors } from '../utils/colorContrast';

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

interface DocumentItem extends NotebookItem {
  type?: string; // Document type: 'notebook', 'text', 'data', etc.
  type_s?: string; // Alternative type field
  item_type?: string; // Another alternative type field
}

interface SpaceInfo {
  id: string;
  uid?: string;
  name: string;
  handle?: string;
}

interface GroupedDocuments {
  notebooks: DocumentItem[];
  documents: DocumentItem[];
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

const DocumentsList: React.FC<NotebooksListProps> = ({ onNotebookSelect }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedNotebook, setSelectedNotebook] = useState<string | null>(null);
  const [spaceId, setSpaceId] = useState<string | null>(null);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);

  // New state for enhanced functionality
  const [userSpaces, setUserSpaces] = useState<SpaceInfo[]>([]);
  const [selectedSpace, setSelectedSpace] = useState<SpaceInfo | null>(null);
  const [groupedDocuments, setGroupedDocuments] = useState<GroupedDocuments>({
    notebooks: [],
    documents: [],
  });

  // Delete dialog state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [notebookToDelete, setNotebookToDelete] = useState<NotebookItem | null>(
    null
  );
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Refresh functionality state
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastDataHash, setLastDataHash] = useState<string>('');

  const { canOpenNotebook, getRuntimeForNotebook, setActiveNotebook } =
    useRuntimeStore();

  // Prevent duplicate initialization in React Strict Mode
  const isInitializedRef = useRef(false);

  // Auto-refresh timer ref
  const autoRefreshTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isInitializedRef.current) {
      isInitializedRef.current = true;
      initializeComponent();

      // Run accessibility color contrast audit
      if (process.env.NODE_ENV === 'development') {
        testApplicationColors();
      }
    }

    // Cleanup timer on unmount
    return () => {
      if (autoRefreshTimerRef.current) {
        clearInterval(autoRefreshTimerRef.current);
      }
    };
  }, []);

  const fetchUserSpaces = async () => {
    try {
      console.log('🔍 [DEBUG] Fetching user spaces...');
      const spacesResponse = await window.datalayerAPI.getUserSpaces();
      console.log('🔍 [DEBUG] Spaces response:', spacesResponse);

      if (
        spacesResponse.success &&
        spacesResponse.spaces &&
        spacesResponse.spaces.length > 0
      ) {
        console.log(
          '🔍 [DEBUG] Processing',
          spacesResponse.spaces.length,
          'spaces'
        );
        const spaces: SpaceInfo[] = spacesResponse.spaces.map(
          (space: Record<string, unknown>) => {
            const mappedSpace = {
              id: String(space.id || space.uid || ''),
              uid: space.uid as string | undefined,
              name: String(
                space.name_t ||
                  space.name ||
                  space.handle_s ||
                  space.handle ||
                  space.title ||
                  space.display_name ||
                  'Unknown Space'
              ),
              handle: (space.handle_s || space.handle) as string | undefined,
            };
            return mappedSpace;
          }
        );

        setUserSpaces(spaces);

        // Find default/library space
        const defaultSpace =
          spaces.find(space => {
            const name = (space.name || '').toLowerCase();
            const handle = (space.handle || '').toLowerCase();
            return (
              handle.includes('library') ||
              handle.includes('default') ||
              name.includes('library') ||
              name.includes('default') ||
              name.includes('workspace') || // Add workspace as a fallback
              spaces.length === 1 // If only one space, use it as default
            );
          }) || spaces[0]; // Fallback to first space if no match

        setSelectedSpace(defaultSpace);
        setSpaceId(defaultSpace.uid || defaultSpace.id);

        console.log('🔍 [DEBUG] Default space found:', defaultSpace);
        return { defaultSpace, spacesData: spacesResponse.spaces };
      }

      console.log('🔍 [DEBUG] No spaces found or spaces response failed');
      return null;
    } catch (error) {
      console.error('🔍 [DEBUG] Error fetching user spaces:', error);
      setError('Failed to load user spaces');
      return null;
    }
  };

  // Helper function to create a hash of the data for change detection
  const createDataHash = (data: any[]): string => {
    return JSON.stringify(
      data.map(item => ({
        id: item.id || item.uid,
        name: item.name || item.name_t,
        modified: item.last_update_ts_dt || item.modified_at,
      }))
    );
  };

  const initializeComponent = async () => {
    const result = await fetchUserSpaces();
    if (result?.defaultSpace && result?.spacesData) {
      const spaceId = result.defaultSpace.uid || result.defaultSpace.id;
      await processDocuments(spaceId, result.spacesData);

      // Start auto-refresh timer
      startAutoRefresh();
    } else {
      setLoading(false);
    }
  };

  const processDocuments = async (
    currentSpaceId: string,
    spacesData: any[]
  ) => {
    try {
      console.log('🔍 [DEBUG] Processing documents for space:', currentSpaceId);
      console.log('🔍 [DEBUG] Spaces data:', spacesData);

      setLoading(true);
      setError(null);

      // Find the space that contains the items (using already-fetched data)
      const currentSpace = spacesData.find(
        (space: any) => (space.uid || space.id) === currentSpaceId
      );

      console.log('🔍 [DEBUG] Found current space:', currentSpace);

      if (currentSpace && currentSpace.items) {
        const items = currentSpace.items;
        console.log('🔍 [DEBUG] Processing', items.length, 'items:', items);
        // Transform the response to our DocumentItem format
        const documentItems: DocumentItem[] = items.map(
          (item: Record<string, unknown>) => ({
            id: String(item.id || item.uid || item.path || ''),
            uid: item.uid as string | undefined,
            name: String(
              item.name_t ||
                item.name ||
                (item.path as string)?.split('/').pop() ||
                'Untitled'
            ),
            path: String(
              item.path || `/${item.name_t || item.name || 'document'}`
            ),
            createdAt: String(
              item.creation_ts_dt || item.created_at || new Date().toISOString()
            ),
            modifiedAt: String(
              item.last_update_ts_dt ||
                item.modified_at ||
                new Date().toISOString()
            ),
            size:
              (item.content_length_i as number | undefined) ||
              (item.size as number | undefined),
            kernel: (item.kernel_spec as any)?.display_name || 'Python 3',
            cdnUrl: item.cdn_url_s as string | undefined,
            description: item.description_t as string | undefined,
            type: item.type as string | undefined,
            type_s: item.type_s as string | undefined,
            item_type: item.item_type as string | undefined,
          })
        );

        console.log('🔍 [DEBUG] Mapped document items:', documentItems);

        // Group documents by type
        const notebooks = documentItems.filter(item => {
          const itemType = item.type || item.type_s || item.item_type || '';
          return itemType.toLowerCase() === 'notebook';
        });

        const documents = documentItems.filter(item => {
          const itemType = item.type || item.type_s || item.item_type || '';
          return itemType.toLowerCase() === 'document';
        });

        console.log(
          '🔍 [DEBUG] Grouped results - Notebooks:',
          notebooks.length,
          'Documents:',
          documents.length
        );

        // Sort both groups by modification date (newest first)
        const sortByModifiedDate = (a: DocumentItem, b: DocumentItem) => {
          return (
            new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime()
          );
        };

        const sortedNotebooks = notebooks.sort(sortByModifiedDate);
        const sortedDocuments = documents.sort(sortByModifiedDate);

        setGroupedDocuments({
          notebooks: sortedNotebooks,
          documents: sortedDocuments,
        });

        // Update data hash for change detection
        const newDataHash = createDataHash(documentItems);
        setLastDataHash(newDataHash);
      } else {
        setError('No items found in the selected space');
      }
    } catch (err) {
      console.error('Failed to process documents:', err);
      setError('Failed to load documents. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchDocuments = async (currentSpaceId: string) => {
    try {
      setLoading(true);
      setError(null);

      // Fetch fresh data when changing spaces
      const spacesResponse = await window.datalayerAPI.getUserSpaces();

      if (spacesResponse.success && spacesResponse.spaces) {
        await processDocuments(currentSpaceId, spacesResponse.spaces);
      } else {
        setError(spacesResponse.error || 'Failed to load documents');
      }
    } catch (err) {
      console.error('Failed to fetch documents:', err);
      setError('Failed to load documents. Please try again.');
    }
  };

  // Auto-refresh functionality
  const startAutoRefresh = () => {
    // Clear existing timer
    if (autoRefreshTimerRef.current) {
      clearInterval(autoRefreshTimerRef.current);
    }

    // Start new timer for 60 seconds
    autoRefreshTimerRef.current = setInterval(async () => {
      if (selectedSpace && !loading && !isRefreshing) {
        await checkForUpdatesAndRefresh();
      }
    }, 60000); // 60 seconds
  };

  const checkForUpdatesAndRefresh = async () => {
    if (!selectedSpace) return;

    try {
      // Fetch fresh data without updating UI state
      const spacesResponse = await window.datalayerAPI.getUserSpaces();

      if (spacesResponse.success && spacesResponse.spaces) {
        const currentSpace = spacesResponse.spaces.find(
          (space: any) =>
            (space.uid || space.id) === (selectedSpace.uid || selectedSpace.id)
        );

        if (currentSpace && currentSpace.items) {
          const newDataHash = createDataHash(currentSpace.items);

          // Only refresh if data has changed
          if (newDataHash !== lastDataHash) {
            console.log('📋 Documents data changed, auto-refreshing...');
            await processDocuments(
              selectedSpace.uid || selectedSpace.id,
              spacesResponse.spaces
            );
          }
        }
      }
    } catch (error) {
      console.error('Auto-refresh check failed:', error);
      // Don't show error to user for background refresh failures
    }
  };

  const handleManualRefresh = async () => {
    if (!selectedSpace || isRefreshing) return;

    setIsRefreshing(true);
    try {
      console.log('🔄 Manual refresh triggered');
      await fetchDocuments(selectedSpace.uid || selectedSpace.id);
    } catch (error) {
      console.error('Manual refresh failed:', error);
      setError('Failed to refresh documents');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSpaceChange = async (
    event: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const selectedSpaceId = event.target.value;
    const space = userSpaces.find(s => (s.uid || s.id) === selectedSpaceId);

    if (space) {
      setSelectedSpace(space);
      setSpaceId(space.uid || space.id);
      await fetchDocuments(space.uid || space.id);
    }
  };

  const getDocumentIcon = (document: DocumentItem) => {
    const itemType =
      document.type || document.type_s || document.item_type || '';
    if (itemType.toLowerCase() === 'notebook') {
      return BookIcon;
    }
    return FileIcon;
  };

  // Enhanced keyboard navigation and accessibility
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Handle Escape key for dialogs
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();

        if (showDeleteDialog && !isDeleting) {
          setShowDeleteDialog(false);
          setNotebookToDelete(null);
          setDeleteConfirmationText('');
          setError(null);
        }
        return;
      }

      // Global keyboard shortcuts (when not in input fields or dialogs)
      if (
        !showDeleteDialog &&
        event.target &&
        !['INPUT', 'TEXTAREA'].includes((event.target as Element).tagName)
      ) {
        switch (event.key) {
          case 'r':
          case 'R':
            if (event.ctrlKey || event.metaKey) {
              // Ctrl/Cmd+R: Refresh documents
              event.preventDefault();
              handleManualRefresh();
            }
            break;
          case 'n':
          case 'N':
            if (event.ctrlKey || event.metaKey) {
              // Ctrl/Cmd+N: Create new notebook (placeholder for future feature)
              event.preventDefault();
              console.log(
                '🚀 [Accessibility] Create new notebook shortcut activated'
              );
            }
            break;
          case 'F5':
            // F5: Alternative refresh shortcut
            event.preventDefault();
            handleManualRefresh();
            break;
        }
      }
    };

    // Use capture phase to intercept before other components
    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [showDeleteDialog, isDeleting, handleManualRefresh]);

  const fetchNotebooks = async () => {
    try {
      setLoading(true);
      setError(null);

      // First get user spaces to find the default space ID
      const spacesResponse = await window.datalayerAPI.getUserSpaces();
      if (
        spacesResponse.success &&
        spacesResponse.spaces &&
        spacesResponse.spaces.length > 0
      ) {
        const defaultSpace = spacesResponse.spaces[0];
        setSpaceId(defaultSpace.uid || defaultSpace.id || null);
      }

      // Use the IPC bridge to fetch notebooks
      const response = await window.datalayerAPI.listNotebooks();

      if (response.success && response.data) {
        // Transform the response to our NotebookItem format
        // Based on the Datalayer API item structure
        response.data.map((nb: Record<string, unknown>) => ({
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
        }));
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
    <Box
      sx={{
        // Reserve space for scrollbar to prevent content jumping
        scrollbarGutter: 'stable',
        overflowY: 'auto',
        minHeight: '100vh',
      }}
    >
      <Box sx={{ mb: 3 }}>
        {/* Header with title and space dropdown */}
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

          {/* Space selection dropdown and refresh button */}
          <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 2 }}>
            <Box sx={{ minWidth: '200px' }}>
              <FormControl>
                <FormControl.Label sx={{ mb: 1, fontSize: 1 }}>
                  Select Space
                </FormControl.Label>
                <Select
                  value={selectedSpace?.uid || selectedSpace?.id || ''}
                  onChange={handleSpaceChange}
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

            {/* Refresh button */}
            <IconButton
              aria-label="Refresh documents"
              icon={SyncIcon}
              size="medium"
              variant="invisible"
              onClick={handleManualRefresh}
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

      {/* Error and warning messages */}
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

      {/* Notebooks Section - Always visible */}
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
              Notebooks ({loading ? '...' : groupedDocuments.notebooks.length})
            </Heading>
          </Box>
        </Box>

        {/* Notebooks content area */}
        {loading ? (
          <Box
            sx={{
              p: 6,
              py: 8,
              textAlign: 'center',
              bg: 'canvas.subtle',
              border: '1px solid',
              borderColor: 'border.default',
              borderRadius: 2,
            }}
          >
            <Spinner size="medium" sx={{ color: COLORS.brand.primary }} />
            <Text sx={{ mt: 2, display: 'block', color: 'fg.muted' }}>
              Loading notebooks...
            </Text>
          </Box>
        ) : groupedDocuments.notebooks.length > 0 ? (
          <Box
            sx={{
              border: '1px solid',
              borderColor: 'border.default',
              borderRadius: 2,
              overflow: 'hidden',
            }}
          >
            <ActionList>
              {groupedDocuments.notebooks.map(notebook => (
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
                    // Enhanced focus styles for accessibility
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
                        <ClockIcon size={14} />{' '}
                        {formatDate(notebook.modifiedAt)}
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
                          handleOpenNotebook(notebook);
                        }}
                      />
                      <IconButton
                        aria-label="Download"
                        icon={DownloadIcon}
                        size="medium"
                        variant="invisible"
                        onClick={e => {
                          e.stopPropagation();
                          handleDownloadNotebook(notebook);
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
                          handleDeleteNotebook(notebook);
                        }}
                      />
                    </Box>
                  </ActionList.TrailingVisual>
                </ActionList.Item>
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

      {/* Documents Section - Always visible */}
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
            Documents ({loading ? '...' : groupedDocuments.documents.length})
          </Heading>
        </Box>

        {/* Documents content area */}
        {loading ? (
          <Box
            sx={{
              p: 6,
              py: 8,
              textAlign: 'center',
              bg: 'canvas.subtle',
              border: '1px solid',
              borderColor: 'border.default',
              borderRadius: 2,
            }}
          >
            <Spinner size="medium" sx={{ color: COLORS.brand.primary }} />
            <Text sx={{ mt: 2, display: 'block', color: 'fg.muted' }}>
              Loading documents...
            </Text>
          </Box>
        ) : groupedDocuments.documents.length > 0 ? (
          <Box
            sx={{
              border: '1px solid',
              borderColor: 'border.default',
              borderRadius: 2,
              overflow: 'hidden',
            }}
          >
            <ActionList>
              {groupedDocuments.documents.map(document => {
                const DocumentIcon = getDocumentIcon(document);
                return (
                  <ActionList.Item
                    key={document.id}
                    onSelect={() => handleOpenNotebook(document)}
                    sx={{
                      cursor: 'pointer',
                      py: 3,
                      bg:
                        selectedNotebook === document.id
                          ? 'accent.subtle'
                          : undefined,
                      // Enhanced focus styles for accessibility
                      '&:focus-visible': {
                        outline: `2px solid ${COLORS.brand.primary}`,
                        outlineOffset: '2px',
                        borderRadius: '4px',
                      },
                    }}
                  >
                    <ActionList.LeadingVisual sx={{ alignSelf: 'center' }}>
                      <DocumentIcon size={20} />
                    </ActionList.LeadingVisual>
                    <Box sx={{ flex: 1 }}>
                      <Text sx={{ fontWeight: 'semibold', fontSize: 2, mb: 1 }}>
                        {document.name}
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
                          {formatDate(document.modifiedAt)}
                        </Text>
                      </Box>
                    </Box>
                    <ActionList.TrailingVisual>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <IconButton
                          aria-label="Download"
                          icon={DownloadIcon}
                          size="medium"
                          variant="invisible"
                          onClick={e => {
                            e.stopPropagation();
                            handleDownloadNotebook(document);
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
                            handleDeleteNotebook(document);
                          }}
                        />
                      </Box>
                    </ActionList.TrailingVisual>
                  </ActionList.Item>
                );
              })}
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

      {/* Dialogs remain at the bottom */}

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
        aria-describedby="delete-notebook-description"
        role="alertdialog"
      >
        <Dialog.Header id="delete-notebook-title">
          Delete Notebook
        </Dialog.Header>

        <Box sx={{ p: 4 }}>
          <Text
            id="delete-notebook-description"
            sx={{ mb: 4, color: 'danger.fg', display: 'block' }}
            role="alert"
            aria-live="polite"
          >
            <Box sx={{ mr: 2, display: 'inline-block' }} aria-hidden="true">
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
              aria-label={`Type "${notebookToDelete?.name}" to confirm deletion`}
              aria-describedby="delete-confirmation-help"
            />
            <div
              id="delete-confirmation-help"
              style={{
                position: 'absolute',
                width: '1px',
                height: '1px',
                padding: '0',
                margin: '-1px',
                overflow: 'hidden',
                clip: 'rect(0, 0, 0, 0)',
                whiteSpace: 'nowrap',
                border: '0',
              }}
            >
              Type the exact notebook name to enable the delete button
            </div>
          </FormControl>

          {error && (
            <Flash
              variant="danger"
              sx={{ mt: 3 }}
              role="alert"
              aria-live="assertive"
            >
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
            aria-label="Cancel deletion and close dialog"
            sx={{
              color: 'fg.default',
              '&:hover': {
                color: 'fg.default',
              },
              '&:focus-visible': {
                outline: '2px solid',
                outlineColor: COLORS.brand.primary,
                outlineOffset: '2px',
              },
            }}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleConfirmDelete}
            disabled={
              isDeleting || deleteConfirmationText !== notebookToDelete?.name
            }
            aria-label={
              deleteConfirmationText !== notebookToDelete?.name
                ? `Type "${notebookToDelete?.name}" to enable deletion`
                : `Permanently delete notebook "${notebookToDelete?.name}"`
            }
            sx={{
              '&:focus-visible': {
                outline: '2px solid',
                outlineColor: 'white',
                outlineOffset: '-2px',
              },
            }}
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

export default DocumentsList;
