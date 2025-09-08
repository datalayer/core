/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import React, { useState, useEffect, useRef } from 'react';
import './LexicalEditor.css';
import { Box, Text, Spinner } from '@primer/react';
import { Editor, LexicalProvider } from '@datalayer/jupyter-lexical';
import { Jupyter } from '@datalayer/jupyter-react';
import { useCoreStore } from '@datalayer/core';
import { COLORS } from '../constants/colors';
import { createProxyServiceManager } from '../services/proxyServiceManager';
import { useRuntimeStore } from '../stores/runtimeStore';
import type { ServiceManager } from '@jupyterlab/services';

// Import lexical editor styles
import '@datalayer/jupyter-lexical/style/index.css';

const LEXICAL_EDITOR_ID = 'lexical-editor';

// Basic empty notebook model for the Lexical editor
const EMPTY_NOTEBOOK = {
  cells: [
    {
      cell_type: 'markdown',
      metadata: {},
      source: [
        '# Welcome to Lexical Editor\n',
        '\n',
        'Start writing your rich text content here...',
      ],
    },
  ],
  metadata: {
    kernelspec: {
      display_name: 'Python 3',
      language: 'python',
      name: 'python3',
    },
    language_info: {
      name: 'python',
      version: '3.9.0',
    },
  },
  nbformat: 4,
  nbformat_minor: 4,
};

// Text-only editor inner component
const TextOnlyEditorInner: React.FC = () => {
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Move table of contents to sidebar when it appears
  useEffect(() => {
    const moveTableOfContents = () => {
      const tocSelectors = [
        '.table-of-contents',
        'div[data-lexical-table-of-contents]',
        '.TableOfContentsPlugin__tableOfContents',
        '[class*="table-of-contents"]',
        '[class*="TableOfContents"]'
      ];

      for (const selector of tocSelectors) {
        const tocElement = document.querySelector(selector);
        if (tocElement && sidebarRef.current) {
          // Check if it's not already in our sidebar
          if (!sidebarRef.current.contains(tocElement)) {
            console.log('Moving table of contents to sidebar (text-only):', selector);
            sidebarRef.current.appendChild(tocElement);
            break;
          }
        }
      }
    };

    // Check periodically for table of contents
    const interval = setInterval(moveTableOfContents, 1000);
    
    // Also check immediately and after a short delay
    setTimeout(moveTableOfContents, 100);
    setTimeout(moveTableOfContents, 500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="lexical-editor-layout">
      <div className="lexical-editor-main">
        <Box
          sx={{
            height: '100%',
            position: 'relative',
          }}
        >
          <Box
            sx={{
              position: 'absolute',
              top: 2,
              right: 2,
              zIndex: 1000,
              fontSize: 0,
              color: 'attention.fg',
              bg: 'attention.subtle',
              px: 2,
              py: 1,
              borderRadius: 2,
            }}
          >
            No Jupyter Runtime (Text-only mode)
          </Box>
          <Editor />
        </Box>
      </div>
      <div className="lexical-editor-sidebar" ref={sidebarRef}>
        {/* Sidebar for text-only mode (table of contents will still work) */}
      </div>
    </div>
  );
};

// Inner component that uses the useLexical hook
const LexicalEditorInner: React.FC = () => {
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Move table of contents to sidebar when it appears
  useEffect(() => {
    const moveTableOfContents = () => {
      const tocSelectors = [
        '.table-of-contents',
        'div[data-lexical-table-of-contents]',
        '.TableOfContentsPlugin__tableOfContents',
        '[class*="table-of-contents"]',
        '[class*="TableOfContents"]'
      ];

      for (const selector of tocSelectors) {
        const tocElement = document.querySelector(selector);
        if (tocElement && sidebarRef.current) {
          // Check if it's not already in our sidebar
          if (!sidebarRef.current.contains(tocElement)) {
            console.log('Moving table of contents to sidebar:', selector);
            sidebarRef.current.appendChild(tocElement);
            break;
          }
        }
      }
    };

    // Check periodically for table of contents
    const interval = setInterval(moveTableOfContents, 1000);
    
    // Also check immediately and after a short delay
    setTimeout(moveTableOfContents, 100);
    setTimeout(moveTableOfContents, 500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="lexical-editor-layout">
      <div className="lexical-editor-main">
        <Editor notebook={EMPTY_NOTEBOOK} />
      </div>
      <div className="lexical-editor-sidebar" ref={sidebarRef}>
        {/* This div will be filled by the moved TableOfContentsPlugin */}
      </div>
    </div>
  );
};

const LexicalEditor: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [runtimeCreationFailed, setRuntimeCreationFailed] = useState(false);
  const { configuration } = useCoreStore();
  const mountedRef = useRef(true);

  // Use runtime store for runtime management
  const {
    isCreatingRuntime,
    runtimeError,
    createRuntimeForEditor,
    getRuntimeForNotebook,
    setServiceManagerForNotebook,
    loadRuntimesFromStorage,
  } = useRuntimeStore();

  // Get runtime and service manager for the lexical editor
  const editorRuntime = getRuntimeForNotebook(LEXICAL_EDITOR_ID);
  const serviceManager = editorRuntime?.serviceManager || null;

  // Component mount/unmount tracking
  useEffect(() => {
    mountedRef.current = true;
    // Load any existing runtimes from storage on mount
    loadRuntimesFromStorage();
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Initialize runtime for lexical editor
  useEffect(() => {
    const initializeRuntime = async (): Promise<void> => {
      if (!mountedRef.current || runtimeCreationFailed) return;

      try {
        setIsLoading(true);
        setError(null);

        // Check if we already have a runtime
        if (serviceManager) {
          setIsLoading(false);
          return;
        }

        const token = configuration.token || '';
        if (!token) {
          throw new Error('No authentication token available');
        }

        const cancelled = false;

        // Get or create runtime for the lexical editor
        let runtime = getRuntimeForNotebook(LEXICAL_EDITOR_ID)?.runtime;

        // Only create a new runtime if one doesn't exist
        if (!runtime) {
          console.log('Creating runtime for lexical editor with parameters:', {
            editorId: LEXICAL_EDITOR_ID,
            editorType: 'lexical',
            config: {
              environment: 'python-cpu-env',
              credits: 3, // Reduce credits even more for editors
            },
          });

          const newRuntime = await createRuntimeForEditor(
            LEXICAL_EDITOR_ID,
            'lexical',
            {
              environment: 'python-cpu-env',
              credits: 3, // Reduce credits even more for editors
            }
          );

          if (!newRuntime) {
            throw new Error(runtimeError || 'Failed to create runtime');
          }
          runtime = newRuntime;
        }

        if (cancelled || !mountedRef.current) return;

        console.info('Runtime ready for lexical editor:', runtime.uid);
        const jupyterServerUrl = runtime?.ingress;

        if (!jupyterServerUrl) {
          throw new Error('No Jupyter server URL provided in runtime response');
        }

        // Use the runtime token for Jupyter server authentication
        const jupyterToken = runtime?.token || configuration.token;

        if (cancelled || !mountedRef.current) return;

        // Check if we already have a service manager for this runtime
        const cacheKey = `serviceManager-${runtime.uid}`;
        let manager = (window as Record<string, any>)[cacheKey] as
          | ServiceManager.IManager
          | undefined;

        if (!manager) {
          console.info(
            'Creating new ServiceManager for lexical editor runtime:',
            runtime.uid
          );
          console.info('ServiceManager parameters:', {
            jupyterServerUrl,
            token: jupyterToken ? 'present' : 'missing',
          });
          try {
            manager = await createProxyServiceManager(
              jupyterServerUrl,
              jupyterToken
            );
            console.info(
              'ServiceManager created successfully:',
              typeof manager,
              !!manager
            );
            if (manager) {
              console.info('Waiting for ServiceManager to be ready...');
              await manager.ready;
              console.info('ServiceManager is ready!');
            }
          } catch (error) {
            console.error('Failed to create ServiceManager:', error);
            throw error;
          }

          if (cancelled || !mountedRef.current) {
            // Clean up if component was unmounted during async operation
            try {
              if (
                manager &&
                typeof (manager as any).dispose === 'function' &&
                !(manager as any).isDisposed
              ) {
                (manager as any).dispose();
              }
            } catch (e) {
              console.warn(
                'Error disposing service manager during cleanup:',
                e
              );
            }
            return;
          }

          // Cache the service manager
          (window as Record<string, any>)[cacheKey] = manager;

          // Store the ServiceManager in the runtime store (this is the missing piece!)
          if (manager) {
            setServiceManagerForNotebook(LEXICAL_EDITOR_ID, manager);
            console.info(
              'ServiceManager stored in runtime store for editor:',
              LEXICAL_EDITOR_ID
            );

            // Create and start a kernel for the Lexical editor
            try {
              console.info('Creating kernel for Lexical editor...');
              const kernelManager = manager.kernels;
              const kernelModel = await kernelManager.startNew({
                name: 'python3',
              });
              console.info('Kernel created successfully:', kernelModel.id);
            } catch (kernelError) {
              console.error('Failed to create kernel:', kernelError);
            }
          }
        }
      } catch (err) {
        if (mountedRef.current) {
          console.error(
            'Failed to initialize runtime for lexical editor:',
            err
          );
          const errorMessage =
            err instanceof Error
              ? err.message
              : 'Failed to initialize Jupyter connection';

          // Mark runtime creation as failed to prevent retries
          setRuntimeCreationFailed(true);

          if (
            errorMessage.includes('500') ||
            errorMessage.includes('Server Error')
          ) {
            setError(
              'Server temporarily unavailable. The platform may be experiencing high load. The editor will work in text-only mode.'
            );
          } else if (errorMessage.includes('404')) {
            setError(
              'Runtime endpoint not found. Please check your network connection. The editor will work in text-only mode.'
            );
          } else {
            setError(
              `${errorMessage}. The editor will work in text-only mode.`
            );
          }
        }
      } finally {
        if (mountedRef.current) {
          setIsLoading(false);
        }
      }
    };

    initializeRuntime();
  }, [configuration.token, serviceManager]);

  if (isLoading || isCreatingRuntime) {
    return (
      <Box
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 3,
        }}
      >
        <Spinner size="large" sx={{ color: COLORS.brand.primary }} />
        <Text sx={{ color: 'fg.muted' }}>
          {isCreatingRuntime
            ? 'Creating runtime for Lexical Editor...'
            : 'Initializing Jupyter Lexical Editor...'}
        </Text>
      </Box>
    );
  }

  // Show error but continue with editor in text-only mode if runtime creation failed
  const showRuntimeWarning = (error || runtimeError) && runtimeCreationFailed;

  // Allow editor to work without serviceManager for basic text editing
  const hasJupyterSupport = !!serviceManager;

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {showRuntimeWarning && (
        <Box
          sx={{
            mb: 2,
            p: 3,
            bg: 'attention.subtle',
            borderColor: 'attention.muted',
            borderWidth: 1,
            borderStyle: 'solid',
            borderRadius: 2,
          }}
        >
          <Text
            sx={{
              color: 'attention.fg',
              fontSize: 1,
              fontWeight: 'bold',
              mb: 1,
            }}
          >
            Runtime Connection Failed
          </Text>
          <Text sx={{ color: 'attention.fg', fontSize: 0 }}>
            {error || runtimeError}
          </Text>
        </Box>
      )}

      <Box sx={{ mb: 3 }}>
        <Text
          sx={{ fontSize: 3, fontWeight: 'bold', color: COLORS.brand.primary }}
        >
          Jupyter Lexical Editor&nbsp;
          {!hasJupyterSupport && (
            <Text as="span" sx={{ fontSize: 1, color: 'attention.fg' }}>
              (Text-only mode)
            </Text>
          )}
        </Text>
        <Text sx={{ fontSize: 1, color: 'fg.muted', mt: 2 }}>
          {hasJupyterSupport
            ? 'Advanced rich text editor with Jupyter integration, supporting code execution, equations, images, and more.'
            : 'Rich text editor for formatting text, creating lists, and adding links. Code execution features are not available.'}
        </Text>
      </Box>

      <Box
        sx={{
          flex: 1,
          border: '1px solid',
          borderColor: 'border.default',
          borderRadius: 2,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {hasJupyterSupport ? (
          <>
            {console.log(
              'LexicalEditor: Rendering with serviceManager:',
              serviceManager
            )}
            <Jupyter serviceManager={serviceManager} startDefaultKernel>
              <LexicalProvider>
                <LexicalEditorInner />
              </LexicalProvider>
            </Jupyter>
          </>
        ) : (
          <LexicalProvider>
            <TextOnlyEditorInner />
          </LexicalProvider>
        )}
      </Box>
    </Box>
  );
};

export default LexicalEditor;
