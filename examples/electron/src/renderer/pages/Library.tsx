/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import React, { useState, useEffect, useRef } from 'react';
import { Box } from '@primer/react';
import { useRuntimeStore } from '../stores/runtimeStore';
import { testApplicationColors } from '../utils/colorContrast';
import {
  DocumentsListProps,
  SpaceInfo,
  GroupedDocuments,
  DocumentItem,
  NotebookItem,
} from '../../shared/types';
import {
  mapApiItemToDocumentItem,
  groupDocumentsByType,
  createDataHash,
} from '../utils/library';
import Header from '../components/library/Header';
import ErrorMessage from '../components/library/ErrorMessage';
import NotebooksSection from '../components/library/NotebooksSection';
import DocumentsSection from '../components/library/DocumentsSection';
import DeleteConfirmationDialog from '../components/library/DeleteConfirmationDialog';

const Documents: React.FC<DocumentsListProps> = ({
  onNotebookSelect,
  onDocumentSelect,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedNotebook, setSelectedNotebook] = useState<string | null>(null);
  const [spaceId, setSpaceId] = useState<string | null>(null);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);

  const [userSpaces, setUserSpaces] = useState<SpaceInfo[]>([]);
  const [selectedSpace, setSelectedSpace] = useState<SpaceInfo | null>(null);
  const [groupedDocuments, setGroupedDocuments] = useState<GroupedDocuments>({
    notebooks: [],
    documents: [],
  });

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<NotebookItem | null>(null);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastDataHash, setLastDataHash] = useState<string>('');

  const { canOpenNotebook, getRuntimeForNotebook, setActiveNotebook } =
    useRuntimeStore();

  const isInitializedRef = useRef(false);
  const autoRefreshTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isInitializedRef.current) {
      isInitializedRef.current = true;
      initializeComponent();

      if (process.env.NODE_ENV === 'development') {
        testApplicationColors();
      }
    }

    return () => {
      if (autoRefreshTimerRef.current) {
        clearInterval(autoRefreshTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();

        if (showDeleteDialog && !isDeleting) {
          handleCancelDelete();
        }
        return;
      }

      if (
        !showDeleteDialog &&
        event.target &&
        !['INPUT', 'TEXTAREA'].includes((event.target as Element).tagName)
      ) {
        switch (event.key) {
          case 'r':
          case 'R':
            if (event.ctrlKey || event.metaKey) {
              event.preventDefault();
              handleManualRefresh();
            }
            break;
          case 'n':
          case 'N':
            if (event.ctrlKey || event.metaKey) {
              event.preventDefault();
              console.log(
                '🚀 [Accessibility] Create new notebook shortcut activated'
              );
            }
            break;
          case 'F5':
            event.preventDefault();
            handleManualRefresh();
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [showDeleteDialog, isDeleting]);

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
          (space: Record<string, unknown>) => ({
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
          })
        );

        setUserSpaces(spaces);

        const defaultSpace =
          spaces.find(space => {
            const name = (space.name || '').toLowerCase();
            const handle = (space.handle || '').toLowerCase();
            return (
              handle.includes('library') ||
              handle.includes('default') ||
              name.includes('library') ||
              name.includes('default') ||
              name.includes('workspace') ||
              spaces.length === 1
            );
          }) || spaces[0];

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

  const initializeComponent = async () => {
    const result = await fetchUserSpaces();
    if (result?.defaultSpace && result?.spacesData) {
      const spaceId = result.defaultSpace.uid || result.defaultSpace.id;
      await processDocuments(spaceId, result.spacesData);
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

      const currentSpace = spacesData.find(
        (space: any) => (space.uid || space.id) === currentSpaceId
      );

      console.log('🔍 [DEBUG] Found current space:', currentSpace);

      if (currentSpace && currentSpace.items) {
        const items = currentSpace.items;
        console.log('🔍 [DEBUG] Processing', items.length, 'items:', items);

        const documentItems: DocumentItem[] = items.map(
          mapApiItemToDocumentItem
        );
        console.log('🔍 [DEBUG] Mapped document items:', documentItems);

        const groupedResults = groupDocumentsByType(documentItems);
        console.log(
          '🔍 [DEBUG] Grouped results - Notebooks:',
          groupedResults.notebooks.length,
          'Documents:',
          groupedResults.documents.length
        );

        setGroupedDocuments(groupedResults);

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

  const startAutoRefresh = () => {
    if (autoRefreshTimerRef.current) {
      clearInterval(autoRefreshTimerRef.current);
    }

    autoRefreshTimerRef.current = setInterval(async () => {
      if (selectedSpace && !loading && !isRefreshing) {
        await checkForUpdatesAndRefresh();
      }
    }, 60000);
  };

  const checkForUpdatesAndRefresh = async () => {
    if (!selectedSpace) return;

    try {
      const spacesResponse = await window.datalayerAPI.getUserSpaces();

      if (spacesResponse.success && spacesResponse.spaces) {
        const currentSpace = spacesResponse.spaces.find(
          (space: any) =>
            (space.uid || space.id) === (selectedSpace.uid || selectedSpace.id)
        );

        if (currentSpace && currentSpace.items) {
          const newDataHash = createDataHash(currentSpace.items);

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

  const handleOpenNotebook = (notebook: DocumentItem) => {
    console.info('Opening notebook:', notebook.name);

    const canOpen = canOpenNotebook(notebook.id);

    if (!canOpen.allowed) {
      setWarningMessage(canOpen.message || 'Cannot open this notebook');
      setTimeout(() => setWarningMessage(null), 5000);
      return;
    }

    const existingRuntime = getRuntimeForNotebook(notebook.id);
    if (existingRuntime) {
      console.info(
        'Reconnecting to existing runtime for notebook:',
        notebook.name
      );
    }

    setSelectedNotebook(notebook.id);
    setActiveNotebook(notebook.id);

    if (onNotebookSelect) {
      onNotebookSelect({
        id: notebook.uid || notebook.id,
        name: notebook.name,
        path: notebook.path,
        cdnUrl: notebook.cdnUrl,
        description: notebook.description,
      });
    }
  };

  const handleOpenDocument = (document: DocumentItem) => {
    console.info('Opening document:', document.name);

    setSelectedNotebook(document.id);

    if (onDocumentSelect) {
      onDocumentSelect({
        id: document.uid || document.id,
        name: document.name,
        path: document.path,
        cdnUrl: document.cdnUrl,
        description: document.description,
      });
    }
  };

  const handleDownloadItem = async (item: DocumentItem) => {
    console.info('Downloading item:', item.name);

    if (!item.cdnUrl) {
      console.error('No CDN URL available for item');
      setError('Cannot download item - no download URL available');
      return;
    }

    try {
      const response = await window.proxyAPI.httpRequest({
        url: item.cdnUrl,
        method: 'GET',
      });

      if (response.status === 200 && response.body) {
        let content;
        if (typeof response.body === 'string') {
          content = response.body;
        } else if (Array.isArray(response.body)) {
          const jsonString = String.fromCharCode(...response.body);
          content = jsonString;
        } else {
          content = JSON.stringify(response.body);
        }

        const blob = new Blob([content], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = item.name.includes('.') ? item.name : `${item.name}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        console.info('Item downloaded successfully');
      } else {
        throw new Error('Failed to fetch item content');
      }
    } catch (error) {
      console.error('Failed to download item:', error);
      setError('Failed to download item');
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleDeleteItem = (item: DocumentItem) => {
    setItemToDelete(item);
    setDeleteConfirmationText('');
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete || !spaceId) {
      setError('Unable to delete item - missing information');
      return;
    }

    if (deleteConfirmationText !== itemToDelete.name) {
      setError(
        'Item name does not match. Please type the exact name to confirm deletion.'
      );
      return;
    }

    try {
      setIsDeleting(true);
      setError(null);

      console.info('Deleting item:', {
        spaceId,
        itemId: itemToDelete.id,
        name: itemToDelete.name,
      });

      const result = await window.datalayerAPI.deleteNotebook(
        spaceId,
        itemToDelete.uid || itemToDelete.id
      );

      if (result.success) {
        await fetchDocuments(spaceId);
        handleCancelDelete();
        console.info('Item deleted successfully');
      } else {
        const errorMessage = result.error || 'Failed to delete item';
        console.error('Delete item failed:', errorMessage);
        setError(errorMessage);
      }
    } catch (err) {
      console.error('Failed to delete item:', err);
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'Failed to delete item. Please try again.';
      setError(errorMessage);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteDialog(false);
    setItemToDelete(null);
    setDeleteConfirmationText('');
    setError(null);
  };

  return (
    <Box
      sx={{
        scrollbarGutter: 'stable',
        overflowY: 'auto',
        minHeight: '100vh',
      }}
    >
      <Header
        selectedSpace={selectedSpace}
        userSpaces={userSpaces}
        loading={loading}
        isRefreshing={isRefreshing}
        onSpaceChange={handleSpaceChange}
        onRefresh={handleManualRefresh}
      />

      <ErrorMessage error={error} warning={warningMessage} />

      <NotebooksSection
        notebooks={groupedDocuments.notebooks}
        loading={loading}
        selectedNotebook={selectedNotebook}
        onNotebookSelect={handleOpenNotebook}
        onDownloadNotebook={handleDownloadItem}
        onDeleteNotebook={handleDeleteItem}
      />

      <DocumentsSection
        documents={groupedDocuments.documents}
        loading={loading}
        selectedNotebook={selectedNotebook}
        onDocumentSelect={handleOpenDocument}
        onDownloadDocument={handleDownloadItem}
        onDeleteDocument={handleDeleteItem}
      />

      <DeleteConfirmationDialog
        isOpen={showDeleteDialog}
        item={itemToDelete}
        confirmationText={deleteConfirmationText}
        isDeleting={isDeleting}
        error={error}
        onConfirmationTextChange={setDeleteConfirmationText}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />
    </Box>
  );
};

export default Documents;
