/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Box } from '@primer/react';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { ListItemNode, ListNode } from '@lexical/list';
import { CodeHighlightNode, CodeNode } from '@lexical/code';
import { AutoLinkNode, LinkNode } from '@lexical/link';
import {
  JupyterCellNode,
  JupyterInputNode,
  JupyterOutputNode,
  JupyterInputHighlightNode,
} from '@datalayer/jupyter-lexical/lib/nodes';
import { Jupyter, loadJupyterConfig } from '@datalayer/jupyter-react';
import { useCoreStore } from '@datalayer/core/state';
import { createProxyServiceManager } from '../services/proxyServiceManager';
import { useRuntimeStore } from '../stores/runtimeStore';
import { DocumentViewProps, CollaborationStatus } from '../../shared/types';
import { waitForRuntimeReady, onLexicalError } from '../utils/document';
import { logger } from '../utils/logger';
import Header from '../components/document/Header';
import LoadingSpinner from '../components/document/LoadingSpinner';
import TerminateRuntimeDialog from '../components/TerminateRuntimeDialog';
import LexicalEditorComponent from '../components/document/LexicalEditor';
import { type LexicalEditor as LexicalEditorType } from 'lexical';

// Import Jupyter theme - will be fixed by Vite plugin at build time
import jupyterTheme from '@datalayer/jupyter-lexical/lib/themes/Theme';

// Use the Jupyter theme directly - the Vite plugin will fix any 'class-name' issues
const theme = jupyterTheme;

// Lexical editor configuration - use minimal theme to isolate the error
const initialConfig = {
  namespace: 'DatalayerDocumentEditor',
  theme: theme,
  onError: onLexicalError,
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

const DocumentEditor: React.FC<DocumentViewProps> = ({
  selectedDocument,
  onClose,
}) => {
  return (
    <LexicalProvider>
      <DocumentEditorContent
        selectedDocument={selectedDocument}
        onClose={onClose}
      />
    </LexicalProvider>
  );
};

const DocumentEditorContent: React.FC<DocumentViewProps> = ({
  selectedDocument,
  onClose,
}) => {
  const [loading, setLoading] = useState(true);
  const [error] = useState<string | null>(null);
  const [runtimeError, setRuntimeError] = useState<string | null>(null);
  const [showTerminateDialog, setShowTerminateDialog] = useState(false);
  const [isTerminating, setIsTerminating] = useState(false);
  const [collaborationEnabled, setCollaborationEnabled] = useState(true);
  const [collaborationStatus, setCollaborationStatus] =
    useState<CollaborationStatus>('connecting');
  const [, setLexicalEditor] = useState<LexicalEditorType | null>(null);
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
  const handleEditorInit = useCallback((editor: LexicalEditorType) => {
    setLexicalEditor(editor);
    logger.debug(
      'Lexical editor initialized - collaboration will handle content loading'
    );
  }, []);

  // Toggle collaboration
  const handleToggleCollaboration = useCallback(() => {
    setCollaborationEnabled(!collaborationEnabled);
  }, [collaborationEnabled]);

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
      <LoadingSpinner
        isCreatingRuntime={true}
        loading={false}
        serviceManager={null}
      />
    );
  }

  // Step 2: Loading document and waiting for serviceManager to be ready (spinner only)
  if (loading || !isServiceManagerReady) {
    return (
      <LoadingSpinner
        isCreatingRuntime={false}
        loading={loading}
        serviceManager={serviceManager}
      />
    );
  }

  // Handle errors by auto-closing
  if (error || runtimeError) {
    return (
      <LoadingSpinner
        isCreatingRuntime={false}
        loading={true}
        serviceManager={null}
      />
    );
  }

  // Main document view - only render Jupyter component when we have a valid ServiceManager
  // This prevents the Jupyter React component from falling back to default hardcoded config
  if (!serviceManager) {
    return (
      <LoadingSpinner
        isCreatingRuntime={false}
        loading={false}
        serviceManager={null}
      />
    );
  }

  return (
    <Jupyter
      serviceManager={serviceManager}
      startDefaultKernel={!!isServiceManagerReady}
    >
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Document Header */}
        <Header
          selectedDocument={selectedDocument}
          serviceManager={serviceManager}
          documentRuntime={documentRuntime}
          isTerminatingRuntime={isTerminatingRuntime}
          collaborationEnabled={collaborationEnabled}
          collaborationStatus={collaborationStatus}
          runtimeError={runtimeError}
          onStopRuntime={handleStopRuntime}
          onToggleCollaboration={handleToggleCollaboration}
        />

        {/* Document Editor - Step 3: Full connected editor visible */}
        <Box sx={{ flex: 1, overflow: 'hidden' }}>
          <LexicalEditorComponent
            selectedDocument={selectedDocument}
            collaborationEnabled={collaborationEnabled}
            collaborationStatus={collaborationStatus}
            onCollaborationStatusChange={setCollaborationStatus}
            onEditorInit={handleEditorInit}
            serviceManager={serviceManager}
          />
        </Box>

        {/* Terminate Runtime Dialog */}
        <TerminateRuntimeDialog
          isOpen={showTerminateDialog}
          isTerminating={isTerminating}
          itemName={selectedDocument?.name || ''}
          itemType="document"
          error={runtimeError}
          onConfirm={handleTerminateRuntime}
          onCancel={() => setShowTerminateDialog(false)}
        />
      </Box>
    </Jupyter>
  );
};

export default DocumentEditor;
