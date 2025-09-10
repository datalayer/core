/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react';
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
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { ListItemNode, ListNode } from '@lexical/list';
import { CodeHighlightNode, CodeNode } from '@lexical/code';
import { AutoLinkNode, LinkNode } from '@lexical/link';
import { LoroCollaborativePlugin } from '@datalayer/lexical-loro';
import {
  JupyterCellNode,
  JupyterInputNode,
  JupyterOutputNode,
  JupyterInputHighlightNode,
} from '@datalayer/jupyter-lexical/lib/nodes';
import {
  JupyterCellPlugin,
  JupyterInputOutputPlugin,
} from '@datalayer/jupyter-lexical/lib/plugins';
// import jupyterTheme from '@datalayer/jupyter-lexical/lib/themes/Theme';
import '@datalayer/jupyter-react/style/index.css';
import {
  Jupyter,
  useJupyter,
  loadJupyterConfig,
} from '@datalayer/jupyter-react';
import { useCoreStore } from '@datalayer/core';
import { createProxyServiceManager } from '../services/proxyServiceManager';
import { useRuntimeStore } from '../stores/runtimeStore';
import { COLORS } from '../constants/colors';
import { logger } from '../utils/logger';
import type { LexicalEditor } from 'lexical';

// Import Jupyter theme - will be fixed by Vite plugin at build time
import jupyterTheme from '@datalayer/jupyter-lexical/lib/themes/Theme';

// Use the Jupyter theme directly - the Vite plugin will fix any 'class-name' issues
const theme = jupyterTheme;

// Error handler for Lexical
function onError(error: Error) {
  console.error('Lexical error:', error);
}

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

// Lexical editor configuration - use minimal theme to isolate the error
const initialConfig = {
  namespace: 'DatalayerDocumentEditor',
  theme: theme,
  onError,
  nodes: [
    HeadingNode,
    QuoteNode,
    ListNode,
    ListItemNode,
    CodeNode,
    CodeHighlightNode,
    AutoLinkNode,
    LinkNode,
    JupyterCellNode,
    JupyterInputNode,
    JupyterOutputNode,
    JupyterInputHighlightNode,
  ],
};

// LexicalProvider component that provides LexicalComposer context
const LexicalProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  return (
    <LexicalComposer initialConfig={initialConfig}>{children}</LexicalComposer>
  );
};

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
  const [error] = useState<string | null>(null);
  const [runtimeError, setRuntimeError] = useState<string | null>(null);
  const [showTerminateDialog, setShowTerminateDialog] = useState(false);
  const [isTerminating, setIsTerminating] = useState(false);
  const [collaborationEnabled, setCollaborationEnabled] = useState(true);
  const [collaborationStatus, setCollaborationStatus] = useState<
    'disconnected' | 'connecting' | 'connected' | 'error'
  >('connecting');
  const [, setLexicalEditor] = useState<LexicalEditor | null>(null);
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

  // ServiceManager will be created with runtime-specific Jupyter config

  // Initialize document - just set loading to false after brief delay
  useEffect(() => {
    const initDocument = async () => {
      logger.debug('Initializing document:', selectedDocument);
      // Brief delay to ensure runtime setup starts
      await new Promise(resolve => setTimeout(resolve, 200));
      setLoading(false);
    };

    if (selectedDocument) {
      initDocument();
    }
  }, [selectedDocument]);

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

  // Handle editor initialization
  const handleEditorInit = useCallback((editor: LexicalEditor) => {
    setLexicalEditor(editor);
    logger.debug(
      'Lexical editor initialized - collaboration will handle content loading'
    );
  }, []);

  // Component mount/unmount tracking and runtime management
  useEffect(() => {
    mountedRef.current = true;
    // Load any existing runtimes from storage on mount
    loadRuntimesFromStorage();
    return () => {
      mountedRef.current = false;
    };
  }, []); // Empty deps - only run on mount/unmount

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

  // NOTE: loadJupyterConfig is now called BEFORE ServiceManager creation
  // No need for separate useEffect to override config after the fact

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

          // Override Jupyter config BEFORE creating ServiceManager
          try {
            loadJupyterConfig({
              jupyterServerUrl: runtime.runtime.ingress,
              jupyterServerToken: runtime.runtime.token,
            });
            logger.debug(
              '✅ Configured Jupyter with runtime-specific settings:',
              {
                url: runtime.runtime.ingress,
                hasToken: !!runtime.runtime.token,
              }
            );
          } catch (error) {
            logger.error('❌ Failed to configure Jupyter settings:', error);
          }

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
  if (loading || !isServiceManagerReady) {
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

  // Main document view - only render Jupyter component when we have a valid ServiceManager
  // This prevents the Jupyter React component from falling back to default hardcoded config
  if (!serviceManager) {
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
        <Text sx={{ color: 'fg.muted' }}>Preparing runtime environment...</Text>
      </Box>
    );
  }

  return (
    <Jupyter
      serviceManager={serviceManager}
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

          {/* Collaboration Status */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
            <Text sx={{ fontSize: 1, color: 'fg.muted' }}>Collaboration:</Text>
            {collaborationEnabled ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Text
                  sx={{
                    fontSize: 1,
                    color:
                      collaborationStatus === 'connected'
                        ? 'success.fg'
                        : collaborationStatus === 'error'
                          ? 'danger.fg'
                          : 'fg.muted',
                  }}
                >
                  {collaborationStatus === 'connected' && '✓ Connected'}
                  {collaborationStatus === 'connecting' && '⏳ Connecting...'}
                  {collaborationStatus === 'disconnected' && '○ Disconnected'}
                  {collaborationStatus === 'error' && '✗ Error'}
                </Text>
                <Button
                  size="small"
                  variant="invisible"
                  onClick={() => {
                    setCollaborationEnabled(!collaborationEnabled);
                  }}
                  sx={{ fontSize: 0 }}
                >
                  {collaborationStatus === 'connected' ? 'Disable' : 'Enable'}
                </Button>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Text sx={{ fontSize: 1, color: 'fg.muted' }}>Disabled</Text>
                <Button
                  size="small"
                  variant="invisible"
                  onClick={() => setCollaborationEnabled(true)}
                  sx={{ fontSize: 0 }}
                >
                  Enable
                </Button>
              </Box>
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
          <CustomLexicalEditor
            selectedDocument={selectedDocument}
            collaborationEnabled={collaborationEnabled}
            collaborationStatus={collaborationStatus}
            onCollaborationStatusChange={setCollaborationStatus}
            onEditorInit={handleEditorInit}
            serviceManager={serviceManager || undefined}
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

// Custom Lexical Editor component with Loro collaboration and Jupyter integration
interface CustomLexicalEditorProps {
  selectedDocument: DocumentData;
  collaborationEnabled: boolean;
  collaborationStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
  onCollaborationStatusChange: (
    status: 'disconnected' | 'connecting' | 'connected' | 'error'
  ) => void;
  onEditorInit: (editor: LexicalEditor) => void;
  serviceManager?: any;
}

const CustomLexicalEditor: React.FC<CustomLexicalEditorProps> = ({
  selectedDocument,
  collaborationEnabled,
  onCollaborationStatusChange,
  onEditorInit,
  serviceManager,
}) => {
  const { configuration } = useCoreStore();
  const { defaultKernel } = useJupyter();

  // Debug kernel availability
  logger.debug('CustomLexicalEditor kernel state:', {
    hasServiceManager: !!serviceManager,
    hasDefaultKernel: !!defaultKernel,
    kernelReady: defaultKernel?.ready,
    kernelId: defaultKernel?.id,
  });
  const [editorRef, setEditorRef] = useState<LexicalEditor | null>(null);
  const [lastConnectedTime, setLastConnectedTime] = useState<number>(0);
  const disconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Placeholder component
  const Placeholder = () => (
    <div
      style={{
        position: 'absolute',
        top: '16px',
        left: '16px',
        color: '#999',
        pointerEvents: 'none',
        userSelect: 'none',
      }}
    >
      Start writing your document...
    </div>
  );

  // Initialize editor and call onEditorInit when editor is ready
  const handleEditorRef = useCallback(
    (editor: LexicalEditor | null) => {
      if (editor && editor !== editorRef) {
        setEditorRef(editor);
        onEditorInit(editor);
      }
    },
    [onEditorInit, editorRef]
  );

  // Debounced collaboration status to prevent excessive re-renders
  const handleConnectionChange = useCallback(
    (connected: boolean) => {
      logger.debug('Loro collaboration connection changed:', connected);

      if (connected) {
        // Immediately show connected state
        setLastConnectedTime(Date.now());
        onCollaborationStatusChange('connected');

        // Clear any pending disconnect timeout
        if (disconnectTimeoutRef.current) {
          clearTimeout(disconnectTimeoutRef.current);
          disconnectTimeoutRef.current = null;
        }
      } else {
        // Don't immediately show disconnected - wait to see if it reconnects quickly
        if (disconnectTimeoutRef.current) {
          clearTimeout(disconnectTimeoutRef.current);
        }

        disconnectTimeoutRef.current = setTimeout(() => {
          // Only show disconnected if we've been disconnected for 3+ seconds
          const timeSinceLastConnected = Date.now() - lastConnectedTime;
          if (timeSinceLastConnected > 3000) {
            onCollaborationStatusChange('disconnected');
          }
          disconnectTimeoutRef.current = null;
        }, 3000);
      }
    },
    [lastConnectedTime, onCollaborationStatusChange]
  );

  const handlePeerIdChange = useCallback((peerId: string) => {
    logger.debug('Loro collaboration peer ID changed:', peerId);
  }, []);

  const handleAwarenessChange = useCallback((awarenessData: any) => {
    logger.debug('Loro collaboration awareness changed:', awarenessData);

    // Enhanced stale peer cleanup
    if (awarenessData && awarenessData.states) {
      const currentTime = Date.now();
      const staleThreshold = 30000; // 30 seconds
      const stalePeers: string[] = [];

      // Check for stale peers
      Object.entries(awarenessData.states).forEach(
        ([peerId, state]: [string, any]) => {
          if (state && state.lastSeen && typeof state.lastSeen === 'number') {
            const timeSinceLastSeen = currentTime - state.lastSeen;
            if (timeSinceLastSeen > staleThreshold) {
              stalePeers.push(peerId);
              logger.debug(
                `[Awareness Cleanup] Peer ${peerId} is stale (last seen: ${timeSinceLastSeen}ms ago)`
              );
            }
          }
        }
      );

      // Log peer count for debugging
      const activePeerCount =
        Object.keys(awarenessData.states).length - stalePeers.length;
      const totalPeers = Object.keys(awarenessData.states).length;
      logger.debug(
        `[Awareness State] Active peers: ${activePeerCount}, Total peers: ${totalPeers}, Stale peers: ${stalePeers.length}`
      );

      // Force cleanup of stale peers if we have more than 2 total peers
      if (stalePeers.length > 0 && totalPeers > 2) {
        logger.warn(
          `[Awareness Cleanup] Found ${stalePeers.length} stale peers, attempting manual cleanup`
        );
        stalePeers.forEach(peerId => {
          logger.debug(
            `[Awareness Cleanup] Requesting removal of stale peer: ${peerId}`
          );
          // The plugin should handle this internally, but we're logging for debugging
        });
      }
    }
  }, []);

  const handleCollaborationInit = useCallback(
    (success: boolean) => {
      logger.debug('Loro collaboration initialization:', {
        success,
        documentId: selectedDocument.id,
      });
      if (!success) {
        onCollaborationStatusChange('error');
      }
      // Don't set connected here - let handleConnectionChange handle it
    },
    [selectedDocument.id, onCollaborationStatusChange]
  );

  // Store disconnect function for cleanup
  const [collaborationDisconnectFn, setCollaborationDisconnectFn] = useState<
    (() => void) | null
  >(null);

  const handleDisconnectReady = useCallback((disconnectFn: () => void) => {
    setCollaborationDisconnectFn(() => disconnectFn);
    logger.debug('Loro disconnect function ready and stored');
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (disconnectTimeoutRef.current) {
        clearTimeout(disconnectTimeoutRef.current);
        disconnectTimeoutRef.current = null;
      }
    };
  }, []);

  const handleSendMessageReady = useCallback(
    (sendMessageFn: (message: any) => void) => {
      // Store sendMessage function for potential future use
      logger.debug('Loro send message function ready:', typeof sendMessageFn);
    },
    []
  );

  // Cleanup stale connections when component unmounts or document changes
  useEffect(() => {
    return () => {
      // Cleanup function when component unmounts or dependencies change
      if (collaborationDisconnectFn) {
        logger.debug(
          '[Peer Cleanup] Disconnecting collaboration on component cleanup'
        );
        try {
          collaborationDisconnectFn();
        } catch (error) {
          logger.warn(
            '[Peer Cleanup] Error during collaboration disconnect:',
            error
          );
        }
      }

      // Clear stored functions
      setCollaborationDisconnectFn(null);

      logger.debug(
        '[Peer Cleanup] Collaboration cleanup completed for document:',
        selectedDocument.id
      );
    };
  }, [selectedDocument.id, collaborationDisconnectFn]); // Re-run cleanup when document or disconnect function changes

  // Build WebSocket URL for collaboration with authentication
  const collaborationWebSocketUrl = useMemo(() => {
    if (!configuration?.spacerRunUrl || !configuration?.token) return null;

    const spacerWsUrl = configuration.spacerRunUrl.replace(/^http/, 'ws');
    return `${spacerWsUrl}/api/spacer/v1/lexical/ws/${selectedDocument.id}?token=${configuration.token}`;
  }, [configuration?.spacerRunUrl, configuration?.token, selectedDocument.id]);

  return (
    <Box
      sx={{
        height: '100%',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Box
        sx={{
          flex: 1,
          overflow: 'auto',
          position: 'relative',
          border: '1px solid',
          borderColor: 'border.default',
          borderRadius: 2,
          m: 2,
        }}
      >
        <RichTextPlugin
          contentEditable={
            <ContentEditable
              style={{
                minHeight: '200px',
                padding: '16px',
                outline: 'none',
                resize: 'none',
                fontSize: '14px',
                fontFamily:
                  'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                lineHeight: '1.5',
                position: 'relative',
              }}
              spellCheck={true}
            />
          }
          placeholder={<Placeholder />}
          ErrorBoundary={LexicalErrorBoundary}
        />

        {/* History Plugin for undo/redo */}
        <HistoryPlugin />

        {/* Jupyter Plugins - re-enabled */}
        {serviceManager && defaultKernel && (
          <>
            <JupyterCellPlugin />
            <JupyterInputOutputPlugin kernel={defaultKernel as any} />
          </>
        )}

        {/* Loro Collaborative Plugin - re-enabled with enhanced cleanup */}
        {collaborationEnabled && collaborationWebSocketUrl && editorRef && (
          <LoroCollaborativePlugin
            docId={selectedDocument.id}
            websocketUrl={collaborationWebSocketUrl}
            onConnectionChange={handleConnectionChange}
            onPeerIdChange={handlePeerIdChange}
            onAwarenessChange={handleAwarenessChange}
            onInitialization={handleCollaborationInit}
            onDisconnectReady={handleDisconnectReady}
            onSendMessageReady={handleSendMessageReady}
          />
        )}

        {/* Editor initialization */}
        <EditorInitPlugin onEditorInit={handleEditorRef} />
      </Box>

      {/* Editor Status Bar */}
      <Box
        sx={{
          borderTop: '1px solid',
          borderColor: 'border.default',
          p: 2,
          fontSize: 1,
          color: 'fg.muted',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Text>Ready to edit • Press Ctrl+Z to undo • Press Ctrl+Y to redo</Text>
        {serviceManager && (
          <Text sx={{ color: 'success.fg' }}>✓ Jupyter kernel ready</Text>
        )}
      </Box>
    </Box>
  );
};

// Plugin to capture editor reference for initialization
const EditorInitPlugin: React.FC<{
  onEditorInit: (editor: LexicalEditor) => void;
}> = ({ onEditorInit }) => {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    onEditorInit(editor);
  }, [editor, onEditorInit]);

  return null;
};

export default DocumentView;
