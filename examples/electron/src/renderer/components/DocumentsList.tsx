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

interface DocumentItem {
  id: string;
  uid?: string; // Store both id and uid for proper API calls
  name: string;
  path: string;
  type: string; // document type (notebook, text, etc.)
  createdAt: string;
  modifiedAt: string;
  size?: number;
  kernel?: string;
  cdnUrl?: string;
  description?: string;
}

interface DocumentsListProps {
  onNotebookSelect?: (notebook: {
    id: string;
    name: string;
    path: string;
    cdnUrl?: string;
    description?: string;
  }) => void;
}

const DocumentsList: React.FC<DocumentsListProps> = ({ onNotebookSelect }) => {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [groupedDocuments, setGroupedDocuments] = useState<{
    notebooks: DocumentItem[];
    otherDocuments: DocumentItem[];
  }>({ notebooks: [], otherDocuments: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newDocumentName, setNewDocumentName] = useState('');
  const [newDocumentDescription, setNewDocumentDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [spaceId, setSpaceId] = useState<string | null>(null);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);

  // Delete dialog state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<DocumentItem | null>(
    null
  );
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const { canOpenNotebook, getRuntimeForNotebook, setActiveNotebook } =
    useRuntimeStore();

  useEffect(() => {
    fetchDocuments();
  }, []);

  // Add ESC key handler for dialogs
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();

        if (showDeleteDialog && !isDeleting) {
          setShowDeleteDialog(false);
          setDocumentToDelete(null);
          setDeleteConfirmationText('');
          setError(null);
        } else if (showCreateDialog && !isCreating) {
          setShowCreateDialog(false);
          setNewDocumentName('');
          setNewDocumentDescription('');
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

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      setError(null);

      // First get user spaces to find the default/library space and its items
      const spacesResponse = await window.datalayerAPI.getUserSpaces();
      let currentSpaceId: string | null = null;
      let spaceItems: Record<string, unknown>[] = [];
      
      console.log('getUserSpaces response:', spacesResponse);
      
      if (
        spacesResponse.success &&
        spacesResponse.data &&
        spacesResponse.data.length > 0
      ) {
        // Find the library/default space
        let defaultSpace = spacesResponse.data.find((space: any) => 
          space.handle_s === 'library' || 
          space.variant_s === 'default' || 
          space.tags_ss?.includes('library')
        );
        
        // Fallback to first space if no library space found
        if (!defaultSpace) {
          defaultSpace = spacesResponse.data[0];
        }
        
        console.log('Selected default space:', defaultSpace);
        
        currentSpaceId = defaultSpace.uid || defaultSpace.id || null;
        setSpaceId(currentSpaceId);
        
        // Get items directly from the space response (they're already included)
        spaceItems = (defaultSpace.items as Record<string, unknown>[]) || [];
      }

      if (!currentSpaceId) {
        throw new Error('No default space found');
      }

      console.log('Space items from getUserSpaces:', spaceItems);
      console.log('Number of space items:', spaceItems.length);

      if (spaceItems.length > 0) {
        // Transform the space items to our DocumentItem format
        // Based on the Datalayer API item structure
        const documentItems: DocumentItem[] = spaceItems.map(
          (item: Record<string, unknown>) => {
            // Determine document type based on type_s field or file extension
            const itemName = String(
              item.name_t ||
                item.name ||
                (item.path as string)?.split('/').pop() ||
                'Untitled'
            );
            const path = String(item.path || `/${itemName}`);
            const itemType = String(item.type_s || item.type || '');
            const type = itemType === 'notebook' || path.endsWith('.ipynb') ? 'notebook' : 'document';

            return {
              id: String(item.id || item.uid || item.path || ''),
              uid: item.uid as string | undefined,
              name: itemName,
              path: path,
              type: type,
              createdAt: String(
                item.creation_ts_dt || item.created_at || new Date().toISOString()
              ),
              modifiedAt: String(
                item.last_update_ts_dt || item.modified_at || new Date().toISOString()
              ),
              size:
                (item.content_length_i as number | undefined) ||
                (item.size as number | undefined),
              kernel: (item.kernel_spec as any)?.display_name || 'Python 3',
              cdnUrl: item.cdn_url_s as string | undefined,
              description: item.description_t as string | undefined,
            };
          }
        );

        console.log('Transformed documentItems:', documentItems);
        console.log('Number of documents:', documentItems.length);
        
        setDocuments(documentItems);
        
        // Group documents by type
        const notebooks = documentItems.filter(doc => doc.type === 'notebook');
        const otherDocuments = documentItems.filter(doc => doc.type !== 'notebook');
        
        console.log('Notebooks:', notebooks);
        console.log('Other documents:', otherDocuments);
        
        setGroupedDocuments({ notebooks, otherDocuments });
      } else {
        setError('No documents found in the space');
      }
    } catch (err) {
      console.error('Failed to fetch documents:', err);
      setError('Failed to load documents. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDocument = () => {
    setShowCreateDialog(true);
    setNewDocumentName('');
    setNewDocumentDescription('');
  };

  const handleConfirmCreate = async () => {
    if (!newDocumentName.trim()) {
      setError('Document name is required');
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
        name: newDocumentName.trim(),
        description: newDocumentDescription.trim(),
      });

      const result = await window.datalayerAPI.createNotebook(
        spaceId,
        newDocumentName.trim(),
        newDocumentDescription.trim() || undefined
      );

      console.info('Create notebook result:', result);

      if (result.success) {
        // Refresh the documents list
        await fetchDocuments();
        setShowCreateDialog(false);
        setNewDocumentName('');
        setNewDocumentDescription('');

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

  const handleOpenDocument = (document: DocumentItem) => {
    console.info('Opening document:', document.name);

    // Only notebooks can be opened with runtime
    if (document.type === 'notebook') {
      // Check if we can open this notebook
      const canOpen = canOpenNotebook(document.id);

      if (!canOpen.allowed) {
        setWarningMessage(canOpen.message || 'Cannot open this notebook');
        setTimeout(() => setWarningMessage(null), 5000);
        return;
      }

      // Check if this notebook already has a runtime
      const existingRuntime = getRuntimeForNotebook(document.id);
      if (existingRuntime) {
        console.info(
          'Reconnecting to existing runtime for notebook:',
          document.name
        );
      }

      setSelectedDocument(document.id);
      setActiveNotebook(document.id);

      // Call the parent callback if provided
      if (onNotebookSelect) {
        onNotebookSelect({
          id: document.uid || document.id, // Use UID for collaboration
          name: document.name,
          path: document.path,
          cdnUrl: document.cdnUrl,
          description: document.description,
        });
      }
    } else {
      // For non-notebook documents, just show a message for now
      setWarningMessage('Only notebook documents can be opened in this view');
      setTimeout(() => setWarningMessage(null), 3000);
    }
  };

  const handleDownloadDocument = async (document: DocumentItem) => {
    console.info('Downloading document:', document.name);

    if (!document.cdnUrl) {
      console.error('No CDN URL available for document');
      setError('Cannot download document - no download URL available');
      return;
    }

    try {
      // Use the proxy API to fetch the document
      const response = await window.proxyAPI.httpRequest({
        url: document.cdnUrl,
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
        const mimeType = document.type === 'notebook' ? 'application/json' : 'text/plain';
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        
        // Set appropriate file extension
        let fileName = document.name;
        if (document.type === 'notebook' && !fileName.endsWith('.ipynb')) {
          fileName = `${fileName}.ipynb`;
        }
        a.download = fileName;
        
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        console.info('Document downloaded successfully');
      } else {
        throw new Error('Failed to fetch document content');
      }
    } catch (error) {
      console.error('Failed to download document:', error);
      setError('Failed to download document');
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleDeleteDocument = (document: DocumentItem) => {
    setDocumentToDelete(document);
    setDeleteConfirmationText('');
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    if (!documentToDelete || !spaceId) {
      setError('Unable to delete document - missing information');
      return;
    }

    if (deleteConfirmationText !== documentToDelete.name) {
      setError(
        'Document name does not match. Please type the exact name to confirm deletion.'
      );
      return;
    }

    try {
      setIsDeleting(true);
      setError(null);

      console.info('Deleting document:', {
        spaceId,
        itemId: documentToDelete.id,
        name: documentToDelete.name,
        type: documentToDelete.type,
      });

      const result = await window.datalayerAPI.deleteNotebook(
        spaceId,
        documentToDelete.uid || documentToDelete.id
      );

      if (result.success) {
        // Refresh the documents list
        await fetchDocuments();
        setShowDeleteDialog(false);
        setDocumentToDelete(null);
        setDeleteConfirmationText('');
        console.info('Document deleted successfully');
      } else {
        const errorMessage = result.error || 'Failed to delete document';
        console.error('Delete document failed:', errorMessage);
        setError(errorMessage);
      }
    } catch (err) {
      console.error('Failed to delete document:', err);
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'Failed to delete document. Please try again.';
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
            Documents
          </Heading>
          <Text sx={{ color: 'fg.subtle' }}>
            Manage your documents and Jupyter notebooks in the cloud
          </Text>
        </Box>
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
            Loading documents...
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

          {documents.length === 0 ? (
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
                No documents yet
              </Heading>
              <Text sx={{ color: 'fg.subtle', mb: 3 }}>
                Create your first notebook to get started
              </Text>
              <Button
                onClick={handleCreateDocument}
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
            <>
              {/* Notebooks Section */}
              <Box sx={{ mb: 4 }}>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    mb: 2,
                  }}
                >
                  <Heading as="h3" sx={{ fontSize: 2 }}>
                    Notebooks
                  </Heading>
                  <Button
                    onClick={handleCreateDocument}
                    leadingVisual={FileAddedIcon}
                    size="small"
                    sx={{
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
                {groupedDocuments.notebooks.length > 0 && (
                  <Box
                    sx={{
                      border: '1px solid',
                      borderColor: 'border.default',
                      borderRadius: 2,
                      overflow: 'hidden',
                    }}
                  >
                    <ActionList>
                      {groupedDocuments.notebooks.map(document => (
                        <ActionList.Item
                          key={document.id}
                          onSelect={() => handleOpenDocument(document)}
                          sx={{
                            cursor: 'pointer',
                            py: 3,
                            bg:
                              selectedDocument === document.id
                                ? 'accent.subtle'
                                : undefined,
                          }}
                        >
                          <ActionList.LeadingVisual sx={{ alignSelf: 'center' }}>
                            <FileIcon size={20} />
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
                              <Label size="small" variant="default">
                                {document.kernel}
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
                                  handleOpenDocument(document);
                                }}
                              />
                              <IconButton
                                aria-label="Download"
                                icon={DownloadIcon}
                                size="small"
                                variant="invisible"
                                onClick={e => {
                                  e.stopPropagation();
                                  handleDownloadDocument(document);
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
                                  handleDeleteDocument(document);
                                }}
                              />
                            </Box>
                          </ActionList.TrailingVisual>
                        </ActionList.Item>
                      ))}
                    </ActionList>
                  </Box>
                )}
              </Box>

              {/* Other Documents Section */}
              <Box>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    mb: 2,
                  }}
                >
                  <Heading as="h3" sx={{ fontSize: 2 }}>
                    Documents
                  </Heading>
                  <Button
                    onClick={() => {
                      // TODO: Add handler for creating other document types
                      console.log('Create new document clicked');
                    }}
                    leadingVisual={FileAddedIcon}
                    size="small"
                    sx={{
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
                    New Document
                  </Button>
                </Box>
                {groupedDocuments.otherDocuments.length > 0 && (
                  <Box
                    sx={{
                      border: '1px solid',
                      borderColor: 'border.default',
                      borderRadius: 2,
                      overflow: 'hidden',
                    }}
                  >
                    <ActionList>
                      {groupedDocuments.otherDocuments.map(document => (
                        <ActionList.Item
                          key={document.id}
                          onSelect={() => handleOpenDocument(document)}
                          sx={{
                            cursor: 'pointer',
                            py: 3,
                            bg:
                              selectedDocument === document.id
                                ? 'accent.subtle'
                                : undefined,
                          }}
                        >
                          <ActionList.LeadingVisual sx={{ alignSelf: 'center' }}>
                            <FileIcon size={20} />
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
                              <Label size="small" variant="secondary">
                                {document.type}
                              </Label>
                            </Box>
                          </Box>
                          <ActionList.TrailingVisual>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                              <IconButton
                                aria-label="Download"
                                icon={DownloadIcon}
                                size="small"
                                variant="invisible"
                                onClick={e => {
                                  e.stopPropagation();
                                  handleDownloadDocument(document);
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
                                  handleDeleteDocument(document);
                                }}
                              />
                            </Box>
                          </ActionList.TrailingVisual>
                        </ActionList.Item>
                      ))}
                    </ActionList>
                  </Box>
                )}
              </Box>
            </>
          )}
        </>
      )}

      {/* Create Notebook Dialog */}
      <Dialog
        isOpen={showCreateDialog}
        onDismiss={() => {
          if (!isCreating) {
            setShowCreateDialog(false);
            setNewDocumentName('');
            setNewDocumentDescription('');
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
              value={newDocumentName}
              onChange={e => setNewDocumentName(e.target.value)}
              placeholder="e.g., Data Analysis"
              disabled={isCreating}
              autoFocus
              sx={{ width: '100%' }}
            />
          </FormControl>

          <FormControl>
            <FormControl.Label>Description (Optional)</FormControl.Label>
            <Textarea
              value={newDocumentDescription}
              onChange={e => setNewDocumentDescription(e.target.value)}
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
              setNewDocumentName('');
              setNewDocumentDescription('');
            }}
            disabled={isCreating}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirmCreate}
            disabled={isCreating || !newDocumentName.trim()}
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
            setDocumentToDelete(null);
            setDeleteConfirmationText('');
            setError(null);
          }
        }}
        aria-labelledby="delete-notebook-title"
      >
        <Dialog.Header id="delete-notebook-title">
          Delete Document
        </Dialog.Header>

        <Box sx={{ p: 4 }}>
          <Text sx={{ mb: 4, color: 'danger.fg', display: 'block' }}>
            <Box sx={{ mr: 2, display: 'inline-block' }}>
              <AlertIcon />
            </Box>
            This action cannot be undone. This will permanently delete the
            {documentToDelete?.type === 'notebook' ? ' notebook' : ' document'} <strong>"{documentToDelete?.name}"</strong>.
          </Text>

          <FormControl sx={{ width: '100%' }} disabled={isDeleting}>
            <FormControl.Label sx={{ mb: 2, display: 'block' }}>
              Please type <strong>{documentToDelete?.name}</strong> to confirm:
            </FormControl.Label>
            <TextInput
              value={deleteConfirmationText}
              onChange={e => setDeleteConfirmationText(e.target.value)}
              placeholder="Type document name here"
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
              setDocumentToDelete(null);
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
              isDeleting || deleteConfirmationText !== documentToDelete?.name
            }
          >
            {isDeleting ? (
              <>
                <Spinner size="small" sx={{ mr: 1 }} />
                Deleting...
              </>
            ) : (
              `Delete ${documentToDelete?.type === 'notebook' ? 'Notebook' : 'Document'}`
            )}
          </Button>
        </Box>
      </Dialog>
    </Box>
  );
};

export default DocumentsList;
