/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Heading,
  Text,
  Spinner,
  Flash,
  Button,
  Dialog,
} from '@primer/react';
import { AlertIcon, XIcon } from '@primer/octicons-react';
import { $getRoot, $createParagraphNode, $createTextNode } from 'lexical';
import {
  useLexical,
  LexicalProvider,
  Editor,
} from '@datalayer/jupyter-lexical';
import { Jupyter } from '@datalayer/jupyter-react';
import { useCoreStore } from '@datalayer/core';
import { createProxyServiceManager } from '../services/proxyServiceManager';
import { useRuntimeStore } from '../stores/runtimeStore';
import { COLORS } from '../constants/colors';
import { logger } from '../utils/logger';

// Helper function to wait for runtime to be ready by testing Jupyter server connectivity
async function waitForRuntimeReady(
  runtimeIngress: string,
  runtimeToken: string,
  maxWaitTime = 60000,
  pollInterval = 5000
): Promise<boolean> {
  logger.debug(
    `Starting Jupyter server connectivity test for ${runtimeIngress}`
  );

  // For newly created runtimes, wait a bit before first check
  await new Promise(resolve => setTimeout(resolve, 8000));

  const startTime = Date.now();
  let attempts = 0;

  while (Date.now() - startTime < maxWaitTime) {
    attempts++;
    try {
      logger.debug(
        `Jupyter server connectivity test attempt ${attempts} for ${runtimeIngress}`
      );

      // Test Jupyter server connectivity by trying to access /api/kernelspecs
      const testUrl = `${runtimeIngress}/api/kernelspecs`;

      const response = await (window as any).proxyAPI.httpRequest({
        url: testUrl,
        method: 'GET',
        headers: {
          Authorization: `token ${runtimeToken}`,
        },
      });

      if (response.status === 200) {
        logger.debug(
          `Jupyter server is ready after ${attempts} attempts - kernelspecs accessible`
        );
        return true;
      } else {
        logger.debug(
          `Jupyter server not ready yet - kernelspecs returned ${response.status}`
        );
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    } catch (error) {
      logger.debug(
        `Jupyter server connectivity test error (attempt ${attempts}): ${error} - continuing to wait`
      );
      // For connection errors, continue waiting as Jupyter server might still be starting up
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }
  }

  logger.warn(
    `Jupyter server connectivity timeout after ${attempts} attempts - proceeding anyway`
  );
  // Instead of failing, return true to proceed - the ServiceManager will handle connection issues
  return true;
}

interface DocumentData {
  id: string;
  name: string;
  path: string;
  cdnUrl?: string;
  description?: string;
}

interface DocumentViewProps {
  selectedDocument: DocumentData;
  onClose: () => void;
}

const DocumentView: React.FC<DocumentViewProps> = ({
  selectedDocument,
  onClose,
}) => {
  return (
    <LexicalProvider>
      <DocumentViewContent
        selectedDocument={selectedDocument}
        onClose={onClose}
      />
    </LexicalProvider>
  );
};

const DocumentViewContent: React.FC<DocumentViewProps> = ({
  selectedDocument,
  onClose,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const lexicalContext = useLexical();
  const [documentContent, setDocumentContent] = useState<string>('');
  const [contentLoaded, setContentLoaded] = useState(false);
  const [runtimeError, setRuntimeError] = useState<string | null>(null);
  const [showTerminateDialog, setShowTerminateDialog] = useState(false);
  const [isTerminating, setIsTerminating] = useState(false);
  const { configuration } = useCoreStore();
  const mountedRef = useRef(true);

  // Use runtime store for runtime management
  const {
    isCreatingRuntime,
    isTerminatingRuntime,
    runtimeError: storeRuntimeError,
    createRuntimeForNotebook,
    getRuntimeForNotebook,
    terminateRuntimeForNotebook,
    setServiceManagerForNotebook,
    setActiveNotebook,
    loadRuntimesFromStorage,
  } = useRuntimeStore();

  // Get runtime and service manager for current document
  const documentRuntime = selectedDocument
    ? getRuntimeForNotebook(selectedDocument.id)
    : null;
  const serviceManager = documentRuntime?.serviceManager || null;

  // Check if serviceManager is ready but isReady is false - force ready state
  const isServiceManagerReady =
    serviceManager &&
    (serviceManager.isReady ||
      (serviceManager.kernelspecs && serviceManager.sessions));

  // Load document when component mounts
  useEffect(() => {
    const loadDocument = async () => {
      try {
        setLoading(true);
        setError(null);
        logger.debug('Loading document:', selectedDocument);

        // For now, we'll just simulate loading
        // TODO: Implement actual document loading from API
        await new Promise(resolve => setTimeout(resolve, 500));

        logger.debug('Document loaded successfully');

        // Auto-start runtime for document after loading
        logger.debug(
          'Auto-starting runtime for document:',
          selectedDocument.name
        );
        // The runtime startup will be handled by the auto-start useEffect below
      } catch (err: any) {
        console.error('Failed to load document:', err);
        setError(
          err instanceof Error ? err.message : 'Failed to load document'
        );
        // Auto-close document on load error
        if (onClose) {
          logger.debug('Auto-closing document due to load error');
          setTimeout(() => onClose(), 1000); // Small delay to show error briefly
        }
      } finally {
        setLoading(false);
      }
    };

    if (selectedDocument) {
      loadDocument();
    }
  }, [selectedDocument, onClose]);

  // Function to show terminate dialog
  const handleStopRuntime = () => {
    setShowTerminateDialog(true);
  };

  // Function to actually terminate runtime
  const handleTerminateRuntime = async () => {
    if (!selectedDocument) return;

    setIsTerminating(true);
    try {
      logger.debug('Terminating runtime for document:', selectedDocument.name);

      // Set a flag to prevent re-creating runtime if component re-mounts
      sessionStorage.setItem(
        `document-${selectedDocument.id}-terminated`,
        'true'
      );

      // Get current runtime to safely dispose service manager
      const currentRuntime = getRuntimeForNotebook(selectedDocument.id);
      if (currentRuntime?.serviceManager) {
        try {
          // Safely dispose service manager if it exists and isn't already disposed
          if (
            typeof currentRuntime.serviceManager.dispose === 'function' &&
            !(currentRuntime.serviceManager as any).isDisposed
          ) {
            (currentRuntime.serviceManager as any).dispose();
            logger.debug('Service manager disposed successfully');
          }
        } catch (disposeError) {
          logger.warn('Error disposing service manager:', disposeError);
        }
      }

      await terminateRuntimeForNotebook(selectedDocument.id);
      setActiveNotebook(null);
      setShowTerminateDialog(false);

      logger.debug('Runtime terminated successfully');

      // Close the document after successful termination
      if (onClose) {
        onClose();
      }
    } catch (error) {
      logger.error('Failed to terminate runtime:', error);
      setRuntimeError(
        error instanceof Error ? error.message : 'Failed to terminate runtime'
      );
    } finally {
      setIsTerminating(false);
    }
  };

  // Function to populate the Lexical editor with content
  const populateEditor = (content: string, editor: any) => {
    // Ensure content is a string
    const contentStr = typeof content === 'string' ? content : String(content);

    try {
      // Try to parse as Lexical editor state JSON first
      const editorState = JSON.parse(contentStr);

      if (editorState && editorState.root) {
        // This is a Lexical editor state, load it directly
        editor.setEditorState(editor.parseEditorState(contentStr));
        logger.debug('Populated editor with Lexical editor state');
        return;
      }
    } catch (jsonError) {
      // Not valid JSON, treat as plain text
      logger.debug('Content is not valid JSON, treating as plain text');
    }

    // Fallback: treat as plain text
    editor.update(() => {
      const root = $getRoot();

      // Clear existing content
      root.clear();

      // Split content into lines and create paragraph nodes
      const lines = contentStr.split('\n');

      lines.forEach(line => {
        const paragraph = $createParagraphNode();
        if (line.trim()) {
          const textNode = $createTextNode(line);
          paragraph.append(textNode);
        }
        root.append(paragraph);
      });

      logger.debug(
        `Populated editor with ${lines.length} lines of plain text content`
      );
    });
  };

  // Load document content when component mounts or selectedDocument changes
  useEffect(() => {
    const loadDocumentContent = async () => {
      if (!selectedDocument) return;

      try {
        logger.debug('Loading document content for:', selectedDocument.path);

        let content = '';

        // Try to load from CDN URL first if available
        if (selectedDocument.cdnUrl) {
          try {
            // Use Electron's proxy API to bypass CORS
            if ((window as any).proxyAPI?.httpRequest) {
              logger.debug('Using Electron proxy API to fetch CDN URL');
              const response = await (window as any).proxyAPI.httpRequest({
                url: selectedDocument.cdnUrl,
                method: 'GET',
              });
              if (response.status === 200) {
                // Handle different response body types
                if (typeof response.body === 'string') {
                  content = response.body;
                } else if (Array.isArray(response.body)) {
                  // Convert byte array to string
                  const uint8Array = new Uint8Array(response.body);
                  const decoder = new TextDecoder('utf-8');
                  content = decoder.decode(uint8Array);
                } else {
                  content = JSON.stringify(response.body);
                }
                logger.debug(
                  'Loaded document content from CDN URL via Electron proxy'
                );
              } else {
                logger.warn(
                  'CDN URL returned non-200 status:',
                  response.status
                );
              }
            } else {
              // Fallback to direct fetch (may fail due to CORS)
              const response = await fetch(selectedDocument.cdnUrl);
              if (response.ok) {
                content = await response.text();
                logger.debug('Loaded document content from CDN URL');
              }
            }
          } catch (cdnError) {
            logger.warn('Failed to load from CDN URL:', cdnError);
          }
        }

        // If no content from CDN, try local file system (if available through Electron API)
        if (!content && (window as any).electronAPI?.readFile) {
          try {
            content = await (window as any).electronAPI.readFile(
              selectedDocument.path
            );
            logger.debug('Loaded document content from local file');
          } catch (fsError) {
            logger.warn('Failed to load from file system:', fsError);
          }
        }

        // Set the content (even if empty, to indicate loading completed)
        setDocumentContent(content);
        setContentLoaded(true);

        // Initialize the Lexical editor with the content if available
        if (content && lexicalContext?.editor) {
          logger.debug('Initializing Lexical editor with document content');
          // Use setTimeout to avoid setState during render
          setTimeout(() => {
            populateEditor(content, lexicalContext.editor);
          }, 0);
        }
      } catch (error) {
        logger.error('Failed to load document content:', error);
        setDocumentContent('');
        setContentLoaded(true);
      }
    };

    loadDocumentContent();
  }, [selectedDocument, lexicalContext?.editor]);

  // Component mount/unmount tracking and runtime management
  useEffect(() => {
    mountedRef.current = true;
    // Load any existing runtimes from storage on mount
    loadRuntimesFromStorage();
    return () => {
      mountedRef.current = false;
    };
  }, [loadRuntimesFromStorage]);

  // Update runtime error from store
  useEffect(() => {
    if (storeRuntimeError) {
      setRuntimeError(storeRuntimeError);
    }
  }, [storeRuntimeError]);

  // Test API accessibility when serviceManager is ready
  useEffect(() => {
    if (isServiceManagerReady && serviceManager) {
      logger.debug('Service manager is ready, can start kernel operations');
    }
  }, [isServiceManagerReady, serviceManager]);

  // Auto-start runtime when document is selected - using stable reference to avoid double execution
  useEffect(() => {
    let isEffectActive = true;
    let timeoutId: NodeJS.Timeout;

    const autoStartRuntime = async () => {
      // Double-check if effect is still active
      if (!isEffectActive || !mountedRef.current) {
        logger.debug(
          'Effect cancelled or component unmounted, skipping runtime creation'
        );
        return;
      }

      logger.debug('autoStartRuntime called with:', {
        selectedDocument: selectedDocument?.name,
        hasConfiguration: !!configuration,
        configurationReady: configuration?.runUrl && configuration?.token,
      });

      if (!selectedDocument || !configuration) {
        logger.debug(
          'Skipping runtime creation: missing document or configuration'
        );
        return;
      }

      if (!configuration.runUrl || !configuration.token) {
        logger.debug('Skipping runtime creation: incomplete configuration');
        return;
      }

      // Check if we already have a runtime for this document
      const existingRuntime = getRuntimeForNotebook(selectedDocument.id);
      if (existingRuntime?.serviceManager) {
        logger.debug(
          'Runtime already exists for document, skipping auto-start'
        );
        return;
      }

      // Check if user manually terminated this runtime (don't auto-start)
      const wasTerminated = sessionStorage.getItem(
        `document-${selectedDocument.id}-terminated`
      );
      if (wasTerminated === 'true') {
        logger.debug('Runtime was manually terminated, skipping auto-start');
        return;
      }

      logger.debug(
        'Auto-starting runtime for document:',
        selectedDocument.name
      );

      // Inline the runtime creation logic to avoid dependency issues
      setRuntimeError(null);

      try {
        logger.debug('Creating runtime for document:', selectedDocument.name);

        // Check again if effect is still active before proceeding
        if (!isEffectActive || !mountedRef.current) {
          logger.debug('Effect cancelled during runtime creation, aborting');
          return;
        }

        // Use existing runtime or create new one
        let runtime = getRuntimeForNotebook(selectedDocument.id);

        if (!runtime) {
          // Create a new runtime
          logger.debug('No existing runtime found, creating new one');
          await createRuntimeForNotebook(
            selectedDocument.id,
            selectedDocument.name
          );
          runtime = getRuntimeForNotebook(selectedDocument.id);
          logger.debug('Runtime created:', runtime);

          // Wait for runtime to be ready before proceeding
          if (
            runtime?.runtime?.ingress &&
            runtime?.runtime?.token &&
            isEffectActive &&
            mountedRef.current
          ) {
            logger.debug('Waiting for runtime to be ready...');
            const isReady = await waitForRuntimeReady(
              runtime.runtime.ingress,
              runtime.runtime.token
            );
            if (!isReady || !isEffectActive || !mountedRef.current) {
              if (!isEffectActive || !mountedRef.current) {
                logger.debug('Effect cancelled during runtime readiness check');
              } else {
                logger.error('Runtime failed to become ready within timeout');
                onClose?.();
              }
              return;
            }
            logger.debug('Runtime is ready!');
          }
        } else {
          logger.debug('Using existing runtime:', runtime);
        }

        // Final check before creating service manager
        if (!isEffectActive || !mountedRef.current) {
          logger.debug('Effect cancelled before service manager creation');
          return;
        }

        // Create service manager if needed
        if (
          runtime &&
          !runtime.serviceManager &&
          configuration &&
          runtime.runtime.ingress &&
          runtime.runtime.token
        ) {
          logger.debug('Creating service manager for runtime');
          const proxyServiceManager = await createProxyServiceManager(
            runtime.runtime.ingress,
            runtime.runtime.token,
            runtime.runtime?.pod_name || ''
          );

          if (isEffectActive && mountedRef.current) {
            setServiceManagerForNotebook(
              selectedDocument.id,
              proxyServiceManager
            );
            setActiveNotebook(selectedDocument.id);
            logger.debug('Service manager created for document');
          }
        } else if (!runtime) {
          logger.error('Runtime creation failed - no runtime returned');
        } else if (runtime.serviceManager) {
          logger.debug('Service manager already exists');
        }
      } catch (error) {
        if (isEffectActive && mountedRef.current) {
          logger.error('Failed to start runtime:', error);
          setRuntimeError(
            error instanceof Error ? error.message : 'Failed to start runtime'
          );
          // Auto-close document when runtime fails to start
          if (onClose) {
            logger.debug('Auto-closing document due to runtime failure');
            setTimeout(() => onClose(), 1000); // Small delay to show error briefly
          }
        }
      }
    };

    // Wait a moment after component mounts to auto-start
    if (selectedDocument && configuration && !loading) {
      timeoutId = setTimeout(() => {
        if (isEffectActive && mountedRef.current) {
          autoStartRuntime().catch(error => {
            if (isEffectActive && mountedRef.current) {
              logger.error('Failed to auto-start runtime:', error);
            }
          });
        }
      }, 1000);
    } else {
      logger.debug('Not starting timeout for runtime creation:', {
        hasDocument: !!selectedDocument,
        hasConfiguration: !!configuration,
        loading: loading,
      });
    }

    // Cleanup function
    return () => {
      isEffectActive = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [
    selectedDocument?.id, // Only depend on the ID, not the whole object
    configuration?.runUrl,
    configuration?.token,
    loading, // Add loading to prevent running when still loading
  ]);

  // Log serviceManager state for debugging
  logger.debug('ServiceManager state:', {
    hasServiceManager: !!serviceManager,
    isReady: serviceManager?.isReady,
    kernelspecs: serviceManager?.kernelspecs?.isReady,
    sessions: serviceManager?.sessions?.isReady,
    kernelspecsReady: serviceManager?.kernelspecs ? 'exists' : 'missing',
    sessionsReady: serviceManager?.sessions ? 'exists' : 'missing',
    isServiceManagerReady,
  });

  // Step 1: Creating runtime (spinner only)
  if (isCreatingRuntime) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 3,
          height: '100%',
        }}
      >
        <Spinner size="large" sx={{ color: COLORS.brand.primary }} />
        <Text sx={{ color: 'fg.muted' }}>Creating runtime environment...</Text>
      </Box>
    );
  }

  // Step 2: Loading document and waiting for serviceManager to be ready (spinner only)
  if (loading || !contentLoaded || !isServiceManagerReady) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 3,
          height: '100%',
        }}
      >
        <Spinner size="large" sx={{ color: COLORS.brand.primary }} />
        <Text sx={{ color: 'fg.muted' }}>
          {!serviceManager
            ? 'Loading document...'
            : 'Preparing kernel environment...'}
        </Text>
      </Box>
    );
  }

  // Handle errors by auto-closing
  if (error || runtimeError) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 3,
          height: '100%',
        }}
      >
        <Spinner size="large" sx={{ color: COLORS.brand.primary }} />
        <Text sx={{ color: 'fg.muted' }}>Closing document...</Text>
      </Box>
    );
  }

  // Main document view - everything is now in one component
  return (
    <Jupyter
      serviceManager={serviceManager || undefined}
      startDefaultKernel={!!isServiceManagerReady}
    >
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Document Header */}
        <Box
          sx={{
            p: 3,
            borderBottom: '1px solid',
            borderColor: 'border.default',
            bg: 'canvas.subtle',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Heading as="h2" sx={{ fontSize: 3, flex: 1 }}>
              {selectedDocument.name}
            </Heading>

            {/* Runtime Controls */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {serviceManager && (
                <Button
                  variant="danger"
                  size="small"
                  leadingVisual={XIcon}
                  onClick={handleStopRuntime}
                  disabled={isTerminatingRuntime}
                >
                  {isTerminatingRuntime
                    ? 'Terminating...'
                    : 'Terminate Runtime'}
                </Button>
              )}
            </Box>
          </Box>

          {/* Runtime Status */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
            <Text sx={{ fontSize: 1, color: 'fg.muted' }}>Runtime:</Text>
            {serviceManager ? (
              <Text sx={{ fontSize: 1, color: 'success.fg' }}>
                ✓ Connected ({documentRuntime?.runtime?.pod_name})
              </Text>
            ) : (
              <Text sx={{ fontSize: 1, color: 'fg.muted' }}>Not connected</Text>
            )}
          </Box>
          {selectedDocument.description && (
            <Text sx={{ color: 'fg.subtle', mt: 1 }}>
              {selectedDocument.description}
            </Text>
          )}

          {/* Runtime Error Display */}
          {runtimeError && (
            <Flash variant="danger" sx={{ mt: 2 }}>
              Runtime Error: {runtimeError}
            </Flash>
          )}
        </Box>

        {/* Document Editor - Step 3: Full connected editor visible */}
        <Box sx={{ flex: 1, overflow: 'hidden' }}>
          {documentContent && (
            <Box
              sx={{
                p: 2,
                bg: 'canvas.subtle',
                borderBottom: '1px solid',
                borderColor: 'border.default',
              }}
            >
              <Text sx={{ fontSize: 1, color: 'fg.muted' }}>
                Loaded {documentContent.length} characters from{' '}
                {selectedDocument.path}
              </Text>
            </Box>
          )}
          <Editor
            onSessionConnection={session => {
              logger.debug('Document editor session connected:', session);
            }}
          />
        </Box>

        {/* Terminate Runtime Dialog */}
        <Dialog
          isOpen={showTerminateDialog}
          onDismiss={() => setShowTerminateDialog(false)}
          aria-labelledby="terminate-runtime-dialog-title"
        >
          <Dialog.Header id="terminate-runtime-dialog-title">
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <AlertIcon size={16} fill="danger.fg" />
              Terminate Runtime
            </Box>
          </Dialog.Header>
          <Box sx={{ p: 3 }}>
            <Text sx={{ mb: 3 }}>
              Are you sure you want to terminate the runtime for this document?
              This will stop all running processes and cannot be undone.
            </Text>
            <Text sx={{ fontSize: 1, color: 'fg.muted', mb: 3 }}>
              Runtime: {documentRuntime?.runtime?.pod_name}
            </Text>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
              <Button
                variant="default"
                onClick={() => setShowTerminateDialog(false)}
                disabled={isTerminating}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleTerminateRuntime}
                disabled={isTerminating}
                leadingVisual={XIcon}
              >
                {isTerminating ? (
                  <>
                    <Spinner size="small" sx={{ mr: 2 }} />
                    Terminating...
                  </>
                ) : (
                  'Terminate Runtime'
                )}
              </Button>
            </Box>
          </Box>
        </Dialog>
      </Box>
    </Jupyter>
  );
};

export default DocumentView;
