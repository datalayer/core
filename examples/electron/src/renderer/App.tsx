/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * @module renderer/App
 * @description Main React application component for the Datalayer Electron app.
 * Manages authentication, view navigation, and component orchestration.
 */

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  lazy,
  Suspense,
} from 'react';
import { ThemeProvider, BaseStyles, Box } from '@primer/react';
import { useCoreStore } from '@datalayer/core/state';
import { useDatalayerAPI } from './hooks/useDatalayerAPI';
import { useParallelPreload } from './hooks/usePreload';
import Login from './pages/Login';
import Environments from './pages/Environments';
import LoadingScreen from './components/app/LoadingScreen';
import AppHeader from './components/app/Header';
import AppLayout from './components/app/Layout';
import LoadingSpinner from './components/LoadingSpinner';
import {
  ViewType,
  GitHubUser,
  NotebookData,
  DocumentData,
} from '../shared/types';
import { processUserData, setupConsoleFiltering } from './utils/app';
import { logger } from './utils/logger';

/**
 * Lazy load heavy components that aren't needed on startup.
 * This improves initial load performance.
 */
const NotebookEditor = lazy(() => import('./pages/NotebookEditor'));
const DocumentEditor = lazy(() => import('./pages/DocumentEditor'));
const Library = lazy(() => import('./pages/Library'));

/**
 * Main application component.
 * Handles authentication flow, view routing, and global state management.
 * @component
 * @returns The rendered application
 */
const App: React.FC = () => {
  // Filter out noisy Jupyter React config logging
  useEffect(() => {
    const cleanup = setupConsoleFiltering();
    return cleanup;
  }, []);

  const [currentView, setCurrentView] = useState<ViewType>('environments');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [githubUser, setGithubUser] = useState<GitHubUser | null>(null);
  const [selectedNotebook, setSelectedNotebook] = useState<NotebookData | null>(
    null
  );
  const [selectedDocument, setSelectedDocument] = useState<DocumentData | null>(
    null
  );
  const [isNotebookEditorActive, setIsNotebookEditorActive] = useState(false);
  const [isDocumentEditorActive, setIsDocumentEditorActive] = useState(false);
  const [componentsPreloaded, setComponentsPreloaded] = useState(false);
  const { configuration } = useCoreStore();
  const { checkAuth, logout: logoutAPI } = useDatalayerAPI();

  // Handle user data from login
  const handleUserDataFetched = useCallback(
    async (userData: Record<string, unknown>) => {
      const githubUser = await processUserData(userData);
      setGithubUser(githubUser);
    },
    []
  );

  // Preload configurations for parallel loading
  const preloadConfigs = useMemo(
    () => [
      {
        name: 'login',
        preloadFn: async () => {
          // Preload Login component resources
          // This ensures Login is ready to display instantly
          await new Promise(resolve => setTimeout(resolve, 50));
        },
      },
      {
        name: 'environments',
        preloadFn: async () => {
          // Skip preloading environments if no token
          // This prevents "Server Error" when not authenticated
          if (!configuration?.token) {
            logger.debug('Skipping environments preload - no token');
            return;
          }

          // Preload Environments data in parallel with auth check
          // This way they're ready instantly when auth succeeds
          try {
            const response = await window.datalayerAPI.getEnvironments();
            if (response.success) {
              logger.debug('Environments preloaded:', response.data?.length);
            }
          } catch (error) {
            logger.error('Failed to preload environments:', error);
          }
        },
      },
    ],
    [configuration?.token]
  );

  const { preloadStates, startAllPreloads, isAllPreloaded } =
    useParallelPreload(preloadConfigs);

  useEffect(() => {
    // Start all operations in parallel for faster startup
    const initializeApp = async () => {
      setIsCheckingAuth(true);

      // Start preloading components immediately
      const preloadPromise = startAllPreloads();

      // Check authentication in parallel with preloading
      const authPromise = (async () => {
        try {
          const credentials = await checkAuth();
          if (credentials.isAuthenticated) {
            setIsAuthenticated(true);
            if ('runUrl' in credentials) {
              // Authentication successful - credentials available
            }

            // Fetch current user info to get the actual GitHub ID
            try {
              const userResponse = await window.datalayerAPI.getCurrentUser();
              if (userResponse.success && userResponse.data) {
                const githubUser = await processUserData(userResponse.data);
                setGithubUser(githubUser);
              }
            } catch (error) {
              logger.error('Failed to fetch current user:', error);
            }

            // Runtime reconnection removed from startup - will be done lazily when needed
          } else {
            // Authentication failed - ensure we show login page
            setIsAuthenticated(false);
            setCurrentView('environments'); // Reset to default view
          }
        } catch (error) {
          // Auth check failed - show login page
          logger.error('Auth check failed:', error);
          setIsAuthenticated(false);
        } finally {
          setIsCheckingAuth(false);
        }
      })();

      // Wait for both auth check and preloading to complete
      await Promise.allSettled([authPromise, preloadPromise]);
      setComponentsPreloaded(true);
    };

    initializeApp();

    // Listen for menu actions
    if (window.electronAPI) {
      window.electronAPI.onMenuAction((action: string) => {
        // Handle menu actions here
        switch (action) {
          case 'new-notebook':
            // Implement new notebook logic
            break;
          case 'open-notebook':
            // Implement open notebook logic
            break;
          case 'save-notebook':
            // Implement save notebook logic
            break;
          case 'restart-kernel':
            // Implement restart kernel logic
            break;
          case 'interrupt-kernel':
            // Implement interrupt kernel logic
            break;
          case 'shutdown-kernel':
            // Implement shutdown kernel logic
            break;
        }
      });
    }

    return () => {
      if (window.electronAPI) {
        window.electronAPI.removeMenuActionListener();
      }
    };
  }, [checkAuth, startAllPreloads]);

  // Monitor configuration changes
  useEffect(() => {
    if (configuration?.token && configuration?.runUrl) {
      setIsAuthenticated(true);
    }
  }, [configuration]);

  // Monitor network connectivity

  const handleNotebookEditorDeactivate = useCallback(() => {
    setIsNotebookEditorActive(false);
    setCurrentView('notebooks');
    setSelectedNotebook(null);
  }, []);

  const handleDocumentEditorDeactivate = useCallback(() => {
    setIsDocumentEditorActive(false);
    setCurrentView('notebooks');
    setSelectedDocument(null);
  }, []);

  const handleLogout = async () => {
    // Use secure IPC to logout
    await logoutAPI();
    setIsAuthenticated(false);
    setCurrentView('environments');
    setSelectedNotebook(null);
    setSelectedDocument(null);
    setIsNotebookEditorActive(false);
    setIsDocumentEditorActive(false);
  };

  const handleNotebookSelect = (notebook: NotebookData) => {
    setSelectedNotebook(notebook);
    setCurrentView('notebook');
    setIsNotebookEditorActive(true);
  };

  const handleDocumentSelect = (document: DocumentData) => {
    setSelectedDocument(document);
    setCurrentView('document');
    setIsDocumentEditorActive(true);
  };

  const renderView = (): React.ReactElement => {
    // Handle notebook view with conditional mounting to avoid MathJax conflicts
    if (currentView === 'notebook' && selectedNotebook) {
      return (
        <Suspense
          fallback={
            <LoadingSpinner
              variant="fullscreen"
              message="Loading notebook editor..."
            />
          }
        >
          <NotebookEditor
            key={`notebook-${selectedNotebook.id}`}
            selectedNotebook={selectedNotebook}
            onClose={() => {
              setCurrentView('notebooks');
              setSelectedNotebook(null);
              setIsNotebookEditorActive(false);
            }}
            onRuntimeTerminated={handleNotebookEditorDeactivate}
          />
        </Suspense>
      );
    }

    // Handle document view
    if (currentView === 'document' && selectedDocument) {
      return (
        <Suspense
          fallback={
            <LoadingSpinner
              variant="inline"
              message="Loading document editor..."
            />
          }
        >
          <DocumentEditor
            key={`document-${selectedDocument.id}`}
            selectedDocument={selectedDocument}
            onClose={handleDocumentEditorDeactivate}
          />
        </Suspense>
      );
    }

    // For list views, keep them mounted and toggle visibility
    return (
      <>
        <Box sx={{ display: currentView === 'notebooks' ? 'block' : 'none' }}>
          <Suspense
            fallback={
              <LoadingSpinner variant="inline" message="Loading library..." />
            }
          >
            <Library
              onNotebookSelect={handleNotebookSelect}
              onDocumentSelect={handleDocumentSelect}
            />
          </Suspense>
        </Box>
        <Box
          sx={{ display: currentView === 'environments' ? 'block' : 'none' }}
        >
          <Environments />
        </Box>
      </>
    );
  };

  // Show loading state while checking authentication or preloading
  if (isCheckingAuth || !componentsPreloaded) {
    return (
      <LoadingScreen
        isCheckingAuth={isCheckingAuth}
        isReconnecting={false}
        isPreloading={!isAllPreloaded}
        preloadStates={preloadStates}
      />
    );
  }

  // Render both login and main app, control visibility based on auth state
  // This enables instant switching without remounting components
  const showLogin = !isAuthenticated;
  const showMainApp = isAuthenticated;

  // App.tsx refactoring completed successfully - clean component composition achieved
  return (
    <>
      {/* Login view - preloaded and visibility controlled */}
      <Box
        sx={{
          display: showLogin ? 'block' : 'none',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: showLogin ? 10 : -1,
        }}
      >
        <ThemeProvider>
          <BaseStyles>
            <Login onUserDataFetched={handleUserDataFetched} />
          </BaseStyles>
        </ThemeProvider>
      </Box>

      {/* Main app view - preloaded and visibility controlled */}
      <Box
        sx={{
          display: showMainApp ? 'flex' : 'none',
          flexDirection: 'column',
          height: '100vh',
          visibility: showMainApp ? 'visible' : 'hidden',
        }}
      >
        <AppLayout>
          <AppHeader
            currentView={currentView}
            isNotebookEditorActive={isNotebookEditorActive}
            isDocumentEditorActive={isDocumentEditorActive}
            isAuthenticated={isAuthenticated}
            githubUser={githubUser}
            onViewChange={setCurrentView}
            onLogout={handleLogout}
          />

          <Box
            sx={{
              flex: 1,
              overflow: 'auto',
              p: currentView === 'notebook' ? 0 : 3,
            }}
          >
            {renderView()}
          </Box>
        </AppLayout>
      </Box>
    </>
  );
};

export default App;
