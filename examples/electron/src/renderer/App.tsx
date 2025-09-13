/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { ThemeProvider, BaseStyles, Box } from '@primer/react';
import { useCoreStore } from '@datalayer/core/state';
import { useDatalayerAPI } from './hooks/useDatalayerAPI';
import Login from './pages/Login';
import NotebookEditor from './pages/NotebookEditor';
import DocumentEditor from './pages/DocumentEditor';
import Library from './pages/Library';
import Environments from './pages/Environments';
import { useRuntimeStore } from './stores/runtimeStore';
import LoadingScreen from './components/app/LoadingScreen';
import AppHeader from './components/app/Header';
import AppLayout from './components/app/Layout';
import {
  ViewType,
  GitHubUser,
  NotebookData,
  DocumentData,
} from '../shared/types';
import { processUserData, setupConsoleFiltering } from './utils/app';
import { logger } from './utils/logger';

const App: React.FC = () => {
  // Filter out noisy Jupyter React config logging
  useEffect(() => {
    const cleanup = setupConsoleFiltering();
    return cleanup;
  }, []);

  const [currentView, setCurrentView] = useState<ViewType>('environments');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [githubUser, setGithubUser] = useState<GitHubUser | null>(null);
  const [selectedNotebook, setSelectedNotebook] = useState<NotebookData | null>(
    null
  );
  const [selectedDocument, setSelectedDocument] = useState<DocumentData | null>(
    null
  );
  const [isNotebookEditorActive, setIsNotebookEditorActive] = useState(false);
  const [isDocumentEditorActive, setIsDocumentEditorActive] = useState(false);
  const { configuration } = useCoreStore();
  const { checkAuth, logout: logoutAPI } = useDatalayerAPI();
  const { reconnectToExistingRuntimes } = useRuntimeStore();

  // Handle user data from login
  const handleUserDataFetched = useCallback(
    async (userData: Record<string, unknown>) => {
      const githubUser = await processUserData(userData);
      setGithubUser(githubUser);
    },
    []
  );

  useEffect(() => {
    // Check if already authenticated using secure IPC
    const checkAuthentication = async () => {
      setIsCheckingAuth(true);
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

          // Try to reconnect to existing runtimes after authentication
          try {
            setIsReconnecting(true);
            await reconnectToExistingRuntimes();
          } catch (error) {
            console.error('Failed to reconnect to existing runtimes:', error);
          } finally {
            setIsReconnecting(false);
          }
        }
      } finally {
        setIsCheckingAuth(false);
      }
    };

    checkAuthentication();

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
  }, [checkAuth]);

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
      );
    }

    // Handle document view
    if (currentView === 'document' && selectedDocument) {
      return (
        <DocumentEditor
          key={`document-${selectedDocument.id}`}
          selectedDocument={selectedDocument}
          onClose={handleDocumentEditorDeactivate}
        />
      );
    }

    // For list views, keep them mounted and toggle visibility
    return (
      <>
        <Box sx={{ display: currentView === 'notebooks' ? 'block' : 'none' }}>
          <Library
            onNotebookSelect={handleNotebookSelect}
            onDocumentSelect={handleDocumentSelect}
          />
        </Box>
        <Box
          sx={{ display: currentView === 'environments' ? 'block' : 'none' }}
        >
          <Environments />
        </Box>
      </>
    );
  };

  // Show loading state while checking authentication or reconnecting
  if (isCheckingAuth || isReconnecting) {
    return (
      <LoadingScreen
        isCheckingAuth={isCheckingAuth}
        isReconnecting={isReconnecting}
      />
    );
  }

  // Show login view if not authenticated
  if (!isAuthenticated) {
    return (
      <ThemeProvider>
        <BaseStyles>
          <Login onUserDataFetched={handleUserDataFetched} />
        </BaseStyles>
      </ThemeProvider>
    );
  }

  // App.tsx refactoring completed successfully - clean component composition achieved
  return (
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
  );
};

export default App;
