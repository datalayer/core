/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Box, Heading, Text, Button } from '@primer/react';
import { INotebookContent } from '@jupyterlab/nbformat';
import { Notebook2 } from '@datalayer/jupyter-react';
import { useCoreStore } from '@datalayer/core';
import { createProxyServiceManager } from '../services/proxyServiceManager';
import { ElectronCollaborationProvider } from '../services/electronCollaborationProvider';
import { XIcon } from '@primer/octicons-react';
import { useRuntimeStore } from '../stores/runtimeStore';
import type { ServiceManager } from '@jupyterlab/services';

// Error boundary component to catch and handle Notebook2 errors
class NotebookErrorBoundary extends React.Component<
  { children: React.ReactNode; onError: (error: Error) => void },
  { hasError: boolean }
> {
  constructor(props: {
    children: React.ReactNode;
    onError: (error: Error) => void;
  }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(
      '[NotebookErrorBoundary] Caught notebook error:',
      error,
      errorInfo
    );

    // Log specific error types for better debugging
    if (error.message.includes('Disposed')) {
      console.info(
        '[NotebookErrorBoundary] SessionContext disposal error - likely component lifecycle issue'
      );
    } else if (error.message.includes('removeChild')) {
      console.info(
        '[NotebookErrorBoundary] DOM manipulation error - component mounting/unmounting conflict'
      );
    }

    this.props.onError(error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box sx={{ p: 4, textAlign: 'center', bg: 'canvas.subtle' }}>
          <Text sx={{ color: 'danger.fg', mb: 2 }}>
            Notebook component encountered an error
          </Text>
          <Text sx={{ color: 'fg.muted', fontSize: 1 }}>
            Try refreshing the page or selecting a different notebook
          </Text>
        </Box>
      );
    }

    return this.props.children;
  }
}

// Note: No fallback notebook - we only use real data from Datalayer service

interface NotebookViewProps {
  selectedNotebook?: {
    id: string;
    name: string;
    path: string;
    cdnUrl?: string;
    description?: string;
  } | null;
  onClose?: () => void;
}

const NotebookView: React.FC<NotebookViewProps> = ({
  selectedNotebook,
  onClose,
}) => {
  const [loading, setLoading] = useState(true);
  const [notebookContent, setNotebookContent] =
    useState<INotebookContent | null>(null);
  const [loadingNotebook, setLoadingNotebook] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notebookError, setNotebookError] = useState<boolean>(false);
  const { configuration } = useCoreStore();

  // Use runtime store for runtime management
  const {
    isCreatingRuntime,
    isTerminatingRuntime,
    runtimeError,
    createRuntimeForNotebook,
    getRuntimeForNotebook,
    terminateRuntimeForNotebook,
    setServiceManagerForNotebook,
    setActiveNotebook,
    loadRuntimesFromStorage,
  } = useRuntimeStore();

  // Get runtime and service manager for current notebook
  const notebookRuntime = selectedNotebook
    ? getRuntimeForNotebook(selectedNotebook.id)
    : null;
  const serviceManager = notebookRuntime?.serviceManager || null;

  // Use refs to prevent race conditions and component lifecycle issues
  const mountedRef = useRef(true);
  const notebookMountedRef = useRef(false);

  // Handle notebook component errors
  const handleNotebookError = (error: Error) => {
    console.error('[NotebookView] Notebook component error:', error);
    setNotebookError(true);
  };

  // Function to terminate and close the runtime
  const handleTerminateRuntime = async () => {
    if (selectedNotebook) {
      // Set a flag to prevent re-creating runtime if component re-mounts
      sessionStorage.setItem(
        `notebook-${selectedNotebook.id}-terminated`,
        'true'
      );
      await terminateRuntimeForNotebook(selectedNotebook.id);
      setNotebookContent(null);
      setError(null);
      // Clear the active notebook from the store
      setActiveNotebook(null);
      // Redirect to notebooks listing after terminating
      if (onClose) {
        onClose();
      }
    }
  };

  // Component mount/unmount tracking
  useEffect(() => {
    mountedRef.current = true;
    // Load any existing runtimes from storage on mount
    loadRuntimesFromStorage();
    return () => {
      mountedRef.current = false;
      notebookMountedRef.current = false;
    };
  }, []); // Empty dependency array - only run on mount

  // Reset notebook error when changing notebooks
  useEffect(() => {
    if (mountedRef.current) {
      setNotebookError(false);
    }
  }, [selectedNotebook?.id]);

  // Fetch notebook content when selected notebook changes
  useEffect(() => {
    const fetchNotebookContent = async () => {
      if (selectedNotebook?.cdnUrl) {
        setLoadingNotebook(true);
        setError(null);
        try {
          // Check if proxyAPI is available
          if (!(window as any).proxyAPI) {
            console.error(
              'proxyAPI not available - cannot fetch notebook content'
            );
            throw new Error('proxyAPI not available');
          }

          // Use the proxy API to fetch the notebook to avoid CORS issues
          const response = await (window as any).proxyAPI.httpRequest({
            url: selectedNotebook.cdnUrl,
            method: 'GET',
          });

          if (response.status === 200 && response.body) {
            let content;
            if (typeof response.body === 'string') {
              try {
                content = JSON.parse(response.body);
              } catch (parseError) {
                console.error(
                  'Failed to parse response as JSON:',
                  response.body.substring(0, 200)
                );
                throw new Error('Invalid JSON response from server');
              }
            } else if (
              Array.isArray(response.body) &&
              typeof response.body[0] === 'number'
            ) {
              // Handle case where response.body is a byte array
              try {
                const jsonString = String.fromCharCode(...response.body);
                content = JSON.parse(jsonString);
              } catch (parseError) {
                console.error(
                  'Failed to parse byte array as JSON:',
                  parseError
                );
                throw new Error(
                  'Failed to parse notebook content from byte array'
                );
              }
            } else {
              content = response.body;
            }

            // Debug the content structure

            // Validate notebook content structure
            if (
              content &&
              content.cells &&
              Array.isArray(content.cells) &&
              content.nbformat
            ) {
              setNotebookContent(content as INotebookContent);
            } else {
              console.error(
                'Invalid notebook content structure. Content:',
                content
              );
              console.error(
                'Expected: object with cells (array) and nbformat properties'
              );
              throw new Error('Invalid notebook content structure');
            }
          } else {
            console.error(
              'Failed to fetch notebook:',
              response.statusText || response.status,
              'Response body:',
              response.body
            );
            throw new Error('Failed to fetch notebook from server');
          }
        } catch (error) {
          console.error('Error fetching notebook:', error);
          setError('Failed to load notebook content');
          setNotebookContent(null);
        } finally {
          setLoadingNotebook(false);
        }
      } else {
        setNotebookContent(null);
        setError(null);
        setLoadingNotebook(false);
      }
    };

    fetchNotebookContent();
  }, [selectedNotebook]);

  useEffect(() => {
    let cancelled = false;

    const initServiceManager = async () => {
      if (!mountedRef.current) {
        return;
      }
      if (configuration?.token && configuration?.runUrl && !serviceManager) {
        setError(null);
        try {
          console.info('Creating runtime with Datalayer production service...');
          console.info('Using Datalayer run URL:', configuration.runUrl);

          // First, create a runtime using the Datalayer API
          console.info('Creating runtime for notebook execution...');
          if (!(window as any).datalayerAPI) {
            throw new Error('Datalayer API not available');
          }

          // Use runtime from store or create new one for this notebook
          if (!selectedNotebook) {
            console.info('No notebook selected, skipping runtime creation');
            return;
          }

          // Set this notebook as active
          setActiveNotebook(selectedNotebook.id);

          // Get or create runtime for this specific notebook
          const notebookRuntime = getRuntimeForNotebook(selectedNotebook.id);
          let runtime = notebookRuntime?.runtime;

          // Check if this notebook was just terminated
          const wasTerminated = sessionStorage.getItem(
            `notebook-${selectedNotebook.id}-terminated`
          );
          if (wasTerminated) {
            // Clear the flag for next time
            sessionStorage.removeItem(
              `notebook-${selectedNotebook.id}-terminated`
            );
            return;
          }

          // Only create a new runtime if one doesn't exist
          if (!runtime) {
            const newRuntime = await createRuntimeForNotebook(
              selectedNotebook.id,
              selectedNotebook.path,
              {
                environment: 'python-cpu-env',
                credits: 10,
              }
            );

            if (!newRuntime) {
              throw new Error(runtimeError || 'Failed to create runtime');
            }
            runtime = newRuntime;
          } else {
            console.info(
              `Reusing existing runtime for notebook ${selectedNotebook.id}:`,
              runtime.uid
            );
          }

          console.info('Runtime ready:', runtime.uid);
          const jupyterServerUrl = runtime?.ingress;

          if (!jupyterServerUrl) {
            throw new Error(
              'No Jupyter server URL provided in runtime response'
            );
          }

          console.info('Connecting to Jupyter server:', jupyterServerUrl);

          // Use the runtime token for Jupyter server authentication
          const jupyterToken = runtime?.token || configuration.token;
          console.info(
            'Using Jupyter token:',
            jupyterToken ? 'Available' : 'Not available'
          );

          if (cancelled || !mountedRef.current) return;

          // Check if we already have a service manager for this runtime
          const cacheKey = `serviceManager-${runtime.uid}`;
          let manager = (window as Record<string, any>)[cacheKey] as
            | ServiceManager.IManager
            | undefined;

          if (!manager) {
            console.info(
              'Creating new ServiceManager for runtime:',
              runtime.uid
            );
            manager = createProxyServiceManager(jupyterServerUrl, jupyterToken);
            await manager.ready;

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

            // Cache the service manager but add disposal cleanup
            (window as Record<string, any>)[cacheKey] = manager;

            // Add cleanup function to prevent disposal conflicts
            if (manager && typeof (manager as any).dispose === 'function') {
              const originalDispose = (manager as any).dispose.bind(manager);
              (manager as any).dispose = () => {
                console.info(
                  'Disposing ServiceManager for runtime:',
                  runtime.uid
                );
                delete (window as Record<string, any>)[cacheKey];
                try {
                  originalDispose();
                } catch (e) {
                  console.error('Error in original dispose:', e);
                }
              };
            }
          } else {
            console.info(
              'Reusing existing ServiceManager for runtime:',
              runtime.uid
            );
            // Verify the manager is still valid
            if ((manager as any).isDisposed) {
              console.info(
                'Cached ServiceManager was disposed, creating new one'
              );
              delete (window as Record<string, any>)[cacheKey];
              manager = createProxyServiceManager(
                jupyterServerUrl,
                jupyterToken
              );
              await manager.ready;

              if (cancelled || !mountedRef.current) {
                try {
                  if (manager && !(manager as any).isDisposed) {
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
              (window as Record<string, any>)[cacheKey] = manager;
            }
          }

          if (cancelled || !mountedRef.current) {
            // Don't dispose cached managers immediately on cancellation
            return;
          }

          setServiceManagerForNotebook(selectedNotebook.id, manager);
          console.info('ServiceManager ready with runtime Jupyter server');
        } catch (error) {
          console.error('Failed to create ProxyServiceManager:', error);
          if (!cancelled) {
            // Provide more specific error information
            const errorMessage = (error as Error).message;
            if (errorMessage.includes('Failed to create runtime')) {
              setError(
                'Datalayer runtime service is temporarily unavailable. Please try again later.'
              );
            } else if (errorMessage.includes('Server Error')) {
              setError(
                'Datalayer infrastructure is experiencing issues. Please try again later.'
              );
            } else {
              setError('Failed to initialize notebook environment');
            }
          }
        }
      } else if (!configuration?.token || !configuration?.runUrl) {
        console.info('No Datalayer credentials configured');
      }
      setLoading(false);
    };

    initServiceManager();

    return () => {
      cancelled = true;
    };
  }, [
    configuration?.token,
    configuration?.runUrl,
    selectedNotebook?.id,
    selectedNotebook?.path,
    // Don't include functions or derived values that change frequently
  ]);

  // Store the collaboration provider in a ref to prevent component re-renders
  const collaborationProviderRef = useRef<ElectronCollaborationProvider | null>(
    null
  );

  // Force recreation for testing token handling changes
  const collaborationProviderVersion = useRef(0);

  // Create collaboration provider instance when configuration is available
  useEffect(() => {
    if (configuration?.runUrl && configuration?.token) {
      // Dispose existing provider
      if (collaborationProviderRef.current) {
        collaborationProviderRef.current.dispose();
        collaborationProviderRef.current = null;
      }

      collaborationProviderVersion.current++;
      console.info(
        '[NotebookView] Creating Electron collaboration provider v' +
          collaborationProviderVersion.current
      );
      console.info(
        '[NotebookView] Configuration token:',
        configuration.token?.substring(0, 10) + '...'
      );
      console.info(
        '[NotebookView] Configuration runUrl:',
        configuration.runUrl
      );
      const provider = new ElectronCollaborationProvider({
        runUrl: configuration.runUrl,
        token: configuration.token,
      });

      // Listen for collaboration errors but don't let them break the notebook
      provider.events.errorOccurred.connect((_sender, error) => {
        console.error('[NotebookView] Collaboration error (non-fatal):', error);
      });

      collaborationProviderRef.current = provider;
    }
  }, [configuration?.runUrl, configuration?.token, selectedNotebook?.id]); // Add selectedNotebook as dependency to force recreation

  // Create a stable key that uses the notebook UID (needed for collaboration)
  const stableNotebookKey = useMemo(() => {
    // Must use the notebook's UID as the ID when collaboration is enabled
    // This is what gets passed as documentId to the collaboration provider
    if (selectedNotebook?.id) {
      return selectedNotebook.id;
    }
    // Fallback to path if no ID available
    const path =
      selectedNotebook?.path || `${selectedNotebook?.name || 'untitled'}.ipynb`;
    return path;
  }, [selectedNotebook?.id, selectedNotebook?.path, selectedNotebook?.name]);

  // Track if notebook component is mounted to prevent re-initialization
  const notebookComponentRef = useRef<unknown>(null);

  // Create notebook props with collaboration always enabled - NEVER changes
  const notebookProps = useMemo(() => {
    console.info('[NotebookView] Creating notebook props:', {
      hasServiceManager: !!serviceManager,
      hasNotebookContent: !!notebookContent,
      hasCells: notebookContent?.cells
        ? Array.isArray(notebookContent.cells)
        : false,
      cellsCount: notebookContent?.cells?.length,
      hasCollaborationProvider: !!collaborationProviderRef.current,
      notebookId: selectedNotebook?.id,
    });

    if (
      !serviceManager ||
      !notebookContent ||
      !notebookContent.cells ||
      !Array.isArray(notebookContent.cells)
    ) {
      return null;
    }

    const props = {
      id: stableNotebookKey, // Use notebook UID for both collaboration and kernel session
      height: '100%' as const,
      nbformat: notebookContent,
      readonly: false,
      serviceManager: serviceManager,
      startDefaultKernel: true,
      collaborative: true, // Enable Jupyter RTC collaboration
      collaborationEnabled: true, // Enable collaboration
      collaborationProvider: collaborationProviderRef.current || undefined, // Add collaboration provider
    };

    console.info('[NotebookView] Notebook props created:', props);
    console.info(
      '[NotebookView] ServiceManager isReady:',
      serviceManager.isReady
    );
    console.info(
      '[NotebookView] ServiceManager isDisposed:',
      serviceManager.isDisposed
    );

    // Log available kernelspecs only once
    if (serviceManager && !notebookComponentRef.current) {
      serviceManager.kernelspecs.ready
        .then(() => {
          console.info(
            '[NotebookView] Available kernelspecs:',
            serviceManager.kernelspecs.specs
          );
        })
        .catch(error => {
          console.error('[NotebookView] Error getting kernelspecs:', error);
        });
    }

    return props;
  }, [
    stableNotebookKey,
    serviceManager,
    notebookContent,
    selectedNotebook?.id,
    collaborationProviderRef.current, // Add collaboration provider as dependency
  ]);

  if (loading || loadingNotebook || isCreatingRuntime) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Text>
          {loadingNotebook
            ? 'Loading notebook...'
            : isCreatingRuntime
              ? 'Creating runtime environment...'
              : 'Loading notebook environment...'}
        </Text>
      </Box>
    );
  }

  if (error || runtimeError) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Text sx={{ color: 'danger.fg' }}>{error || runtimeError}</Text>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box
        sx={{
          p: 3,
          pb: 2,
          borderBottom: '1px solid',
          borderColor: 'border.default',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Box>
            <Heading as="h2" sx={{ mb: 1 }}>
              {selectedNotebook?.name || 'Jupyter Notebook'}
            </Heading>
            <Text sx={{ color: 'fg.subtle', fontSize: 1 }}>
              {selectedNotebook?.description ||
                'Interactive notebook environment powered by Datalayer'}
              {configuration?.token && (
                <Text as="span" sx={{ color: 'success.fg', ml: 2 }}>
                  ✓ Real-time collaboration enabled
                </Text>
              )}
            </Text>
          </Box>
          <Button
            variant="danger"
            size="small"
            onClick={handleTerminateRuntime}
            disabled={isTerminatingRuntime || !serviceManager}
            leadingVisual={XIcon}
          >
            {isTerminatingRuntime ? 'Terminating...' : 'Terminate Runtime'}
          </Button>
        </Box>
      </Box>

      <Box
        sx={{
          flex: 1,
          overflow: 'auto',
        }}
      >
        {!notebookError ? (
          notebookProps ? (
            <NotebookErrorBoundary onError={handleNotebookError}>
              <Notebook2
                key={`notebook-${stableNotebookKey}`} // Add prefix to ensure stability
                {...notebookProps}
              />
            </NotebookErrorBoundary>
          ) : (
            <Box sx={{ p: 4, textAlign: 'center', bg: 'canvas.subtle' }}>
              <Text sx={{ color: 'fg.muted' }}>
                Service manager not available. Please configure Datalayer
                credentials.
              </Text>
            </Box>
          )
        ) : (
          <Box sx={{ p: 4, textAlign: 'center', bg: 'canvas.subtle' }}>
            <Text sx={{ color: 'danger.fg', mb: 2 }}>
              Notebook component encountered an error
            </Text>
            <Text sx={{ color: 'fg.muted', fontSize: 1, mb: 3 }}>
              This may be due to collaboration state conflicts or component
              lifecycle issues
            </Text>
            <Text
              sx={{
                color: 'accent.fg',
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
              onClick={() => {
                setNotebookError(false);
              }}
            >
              Reset notebook
            </Text>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default NotebookView;
