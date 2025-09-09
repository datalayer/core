/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { JupyterReactTheme } from '@datalayer/jupyter-react';
import {
  ThemeProvider,
  BaseStyles,
  Box,
  Header,
  Text,
  Button,
  Avatar,
  ActionMenu,
  ActionList,
  Spinner,
} from '@primer/react';
import {
  DatabaseIcon,
  SignOutIcon,
  BookIcon,
  PencilIcon,
} from '@primer/octicons-react';
import { useCoreStore } from '@datalayer/core';
import { useDatalayerAPI } from './hooks/useDatalayerAPI';
import LoginView from './components/LoginView';
import NotebookView from './components/NotebookView';
import DocumentView from './components/DocumentView';
import DocumentsList from './components/DocumentsList';
import EnvironmentsList from './components/EnvironmentsList';
import { useRuntimeStore } from './stores/runtimeStore';
import { COLORS } from './constants/colors';
import { logger } from './utils/logger';

type ViewType = 'notebooks' | 'notebook' | 'document' | 'environments';

interface GitHubUser {
  login: string;
  name: string;
  avatar_url: string;
  id: number;
  email?: string;
  url?: string;
}

interface NotebookData {
  id: string;
  name: string;
  path: string;
  cdnUrl?: string;
  description?: string;
}

interface DocumentData {
  id: string;
  name: string;
  path: string;
  cdnUrl?: string;
  description?: string;
}

const App: React.FC = () => {
  // Filter out noisy Jupyter React config logging
  useEffect(() => {
    const originalConsoleLog = console.log;
    console.log = (...args: unknown[]) => {
      const message = args.join(' ');
      if (message.includes('Created config for Jupyter React')) {
        return; // Suppress this specific message
      }
      originalConsoleLog.apply(console, args);
    };

    return () => {
      console.log = originalConsoleLog;
    };
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
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const { configuration } = useCoreStore();
  const { checkAuth, logout: logoutAPI } = useDatalayerAPI();
  const { reconnectToExistingRuntimes } = useRuntimeStore();

  // Fetch GitHub user data
  const fetchGitHubUser = useCallback(async (userId: string) => {
    try {
      // Extract GitHub user ID from the handle (e.g., "urn:dla:iam:ext::github:3627835")
      const match = userId.match(/github:(\d+)/);
      if (match && match[1]) {
        const githubId = parseInt(match[1], 10);
        logger.debug(`Fetching GitHub user data for ID: ${githubId}`);

        // Use IPC bridge to fetch GitHub user data from main process
        const response = await window.datalayerAPI.getGitHubUser(githubId);
        if (response.success && response.data) {
          const userData = response.data as unknown as GitHubUser;
          setGithubUser(userData);
          logger.debug('GitHub user data:', userData);
        } else {
          console.warn('Failed to fetch GitHub user:', response.error);
          // Set a default avatar for fallback
          setGithubUser({
            login: 'User',
            name: 'Datalayer User',
            avatar_url: `https://avatars.githubusercontent.com/u/${githubId}?v=4`,
            id: githubId,
          });
        }
      }
    } catch (error) {
      console.error('Failed to fetch GitHub user:', error);
      // Set a default avatar for fallback
      setGithubUser({
        login: 'User',
        name: 'Datalayer User',
        avatar_url: `https://avatars.githubusercontent.com/u/0?v=4`,
        id: 0,
      });
    }
  }, []);

  // Handle user data from login
  const handleUserDataFetched = useCallback(
    (userData: Record<string, unknown>) => {
      logger.debug('User data from login:', userData);

      // Extract the GitHub ID from origin_s field
      const originStr = (userData.origin_s ||
        userData.origin ||
        userData.handle ||
        userData.user_handle) as string;
      if (originStr && originStr.includes('github:')) {
        fetchGitHubUser(originStr);
      } else {
        logger.warn('Could not find GitHub ID in login user data:', userData);
        logger.warn('Available fields:', Object.keys(userData));
        // Don't use a default - let user remain anonymous
        setGithubUser({
          login: 'User',
          name: 'Datalayer User',
          avatar_url: `https://avatars.githubusercontent.com/u/0?v=4`,
          id: 0,
        });
      }
    },
    [fetchGitHubUser]
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
            logger.debug('Authenticated with:', credentials.runUrl);
          }

          // Fetch current user info to get the actual GitHub ID
          try {
            const userResponse = await window.datalayerAPI.getCurrentUser();
            if (userResponse.success && userResponse.data) {
              const userData = userResponse.data;
              logger.debug('Current user data:', userData);

              // Extract the GitHub ID from origin_s field (e.g., "urn:dla:iam:ext::github:226720")
              const originStr = (userData.origin_s ||
                userData.origin ||
                userData.handle ||
                userData.user_handle) as string;
              if (originStr && originStr.includes('github:')) {
                fetchGitHubUser(originStr);
              } else {
                // Try alternate fields
                const userId = (userData.user_id ||
                  userData.external_id ||
                  userData.id) as string;
                if (userId && userId.includes('github:')) {
                  fetchGitHubUser(userId);
                } else {
                  logger.warn(
                    'Could not find GitHub ID in user data:',
                    userData
                  );
                  logger.warn('Available fields:', Object.keys(userData));
                  // Don't use a default - let user remain anonymous
                  setGithubUser({
                    login: 'User',
                    name: 'Datalayer User',
                    avatar_url: `https://avatars.githubusercontent.com/u/0?v=4`,
                    id: 0,
                  });
                }
              }
            }
          } catch (error) {
            logger.error('Failed to fetch current user:', error);
            // Don't use a default - let user remain anonymous
            setGithubUser({
              login: 'User',
              name: 'Datalayer User',
              avatar_url: `https://avatars.githubusercontent.com/u/0?v=4`,
              id: 0,
            });
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
        logger.debug('Menu action:', action);
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
  }, [checkAuth, fetchGitHubUser]);

  // Handle Escape key for user menu
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isUserMenuOpen) {
        event.preventDefault();
        event.stopPropagation();
        setIsUserMenuOpen(false);
      }
    };

    if (isUserMenuOpen) {
      document.addEventListener('keydown', handleEscapeKey, true);
      return () => {
        document.removeEventListener('keydown', handleEscapeKey, true);
      };
    }

    return undefined;
  }, [isUserMenuOpen]);

  // Monitor configuration changes
  useEffect(() => {
    if (configuration?.token && configuration?.runUrl) {
      setIsAuthenticated(true);
    }
  }, [configuration]);

  // Monitor network connectivity

  const handleNotebookEditorDeactivate = useCallback(() => {
    logger.debug('Deactivating notebook editor');
    setIsNotebookEditorActive(false);
    setCurrentView('notebooks');
    setSelectedNotebook(null);
  }, []);

  const handleDocumentEditorDeactivate = useCallback(() => {
    logger.debug('Deactivating document editor');
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
    logger.debug('Selected notebook:', notebook);
    setSelectedNotebook(notebook);
    setCurrentView('notebook');
    setIsNotebookEditorActive(true);
  };

  const handleDocumentSelect = (document: DocumentData) => {
    logger.debug('Selected document:', document);
    setSelectedDocument(document);
    setCurrentView('document');
    setIsDocumentEditorActive(true);
  };

  const renderView = (): React.ReactElement => {
    // Handle notebook view with conditional mounting to avoid MathJax conflicts
    if (currentView === 'notebook' && selectedNotebook) {
      return (
        <NotebookView
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
        <DocumentView
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
          <DocumentsList
            onNotebookSelect={handleNotebookSelect}
            onDocumentSelect={handleDocumentSelect}
          />
        </Box>
        <Box
          sx={{ display: currentView === 'environments' ? 'block' : 'none' }}
        >
          <EnvironmentsList />
        </Box>
      </>
    );
  };

  // Show loading state while checking authentication or reconnecting
  if (isCheckingAuth || isReconnecting) {
    return (
      <ThemeProvider>
        <BaseStyles>
          <Box
            sx={{
              height: '100vh',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              bg: 'canvas.default',
              gap: 3,
            }}
          >
            <Spinner size="large" sx={{ color: COLORS.brand.primary }} />
            <Text sx={{ color: 'fg.muted' }}>
              {isCheckingAuth
                ? 'Checking authentication...'
                : 'Reconnecting to runtimes...'}
            </Text>
          </Box>
        </BaseStyles>
      </ThemeProvider>
    );
  }

  // Show login view if not authenticated
  if (!isAuthenticated) {
    return (
      <ThemeProvider>
        <BaseStyles>
          <LoginView onUserDataFetched={handleUserDataFetched} />
        </BaseStyles>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <BaseStyles>
        <JupyterReactTheme>
          <Box
            sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}
          >
            <Header>
              <Header.Item>
                <Text
                  sx={{
                    fontSize: 3,
                    fontWeight: 'bold',
                    color: COLORS.brand.primary,
                    mr: 4,
                  }}
                >
                  Datalayer Electron Example
                </Text>
              </Header.Item>
              <Header.Item>
                <Header.Link
                  href="#"
                  onClick={(e: React.MouseEvent) => {
                    e.preventDefault();
                    setCurrentView('environments');
                  }}
                  sx={{
                    fontWeight: 'normal',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    borderBottom:
                      currentView === 'environments'
                        ? `2px solid ${COLORS.brand.primary}`
                        : '2px solid transparent',
                    paddingBottom: '4px',
                    '&:hover': {
                      textDecoration: 'none',
                      borderBottom:
                        currentView === 'environments'
                          ? `2px solid ${COLORS.brand.primary}`
                          : '2px solid transparent',
                    },
                  }}
                >
                  <DatabaseIcon size={16} />
                  <span>Environments</span>
                </Header.Link>
              </Header.Item>
              <Header.Item>
                <Header.Link
                  href="#"
                  onClick={(e: React.MouseEvent) => {
                    e.preventDefault();
                    setCurrentView('notebooks');
                  }}
                  sx={{
                    fontWeight: 'normal',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    borderBottom:
                      currentView === 'notebooks'
                        ? `2px solid ${COLORS.brand.primary}`
                        : '2px solid transparent',
                    paddingBottom: '4px',
                    '&:hover': {
                      textDecoration: 'none',
                      borderBottom:
                        currentView === 'notebooks'
                          ? `2px solid ${COLORS.brand.primary}`
                          : '2px solid transparent',
                    },
                  }}
                >
                  <BookIcon size={16} />
                  <span>Documents</span>
                </Header.Link>
              </Header.Item>
              {isNotebookEditorActive && (
                <Header.Item>
                  <Header.Link
                    href="#"
                    onClick={(e: React.MouseEvent) => {
                      e.preventDefault();
                      setCurrentView('notebook');
                    }}
                    sx={{
                      fontWeight: 'normal',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      borderBottom:
                        currentView === 'notebook'
                          ? `2px solid ${COLORS.brand.primary}`
                          : '2px solid transparent',
                      paddingBottom: '4px',
                      '&:hover': {
                        textDecoration: 'none',
                        borderBottom:
                          currentView === 'notebook'
                            ? `2px solid ${COLORS.brand.primary}`
                            : '2px solid transparent',
                      },
                    }}
                  >
                    <PencilIcon size={16} />
                    <span>Notebook Editor</span>
                  </Header.Link>
                </Header.Item>
              )}
              {isDocumentEditorActive && (
                <Header.Item>
                  <Header.Link
                    href="#"
                    onClick={(e: React.MouseEvent) => {
                      e.preventDefault();
                      setCurrentView('document');
                    }}
                    sx={{
                      fontWeight: 'normal',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      borderBottom:
                        currentView === 'document'
                          ? `2px solid ${COLORS.brand.primary}`
                          : '2px solid transparent',
                      paddingBottom: '4px',
                      '&:hover': {
                        textDecoration: 'none',
                        borderBottom:
                          currentView === 'document'
                            ? `2px solid ${COLORS.brand.primary}`
                            : '2px solid transparent',
                      },
                    }}
                  >
                    <PencilIcon size={16} />
                    <span>Document Editor</span>
                  </Header.Link>
                </Header.Item>
              )}
              <Header.Item full />
              {isAuthenticated && githubUser && (
                <Header.Item>
                  <ActionMenu
                    open={isUserMenuOpen}
                    onOpenChange={setIsUserMenuOpen}
                  >
                    <ActionMenu.Anchor>
                      <Button
                        variant="invisible"
                        aria-label={`User menu for ${githubUser.name || githubUser.login}`}
                        aria-describedby="user-menu-description"
                        aria-expanded={isUserMenuOpen}
                        sx={{
                          p: 0,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 2,
                          borderRadius: '50%',
                          '&:focus-visible': {
                            outline: '2px solid',
                            outlineColor: COLORS.brand.primary,
                            outlineOffset: '2px',
                          },
                        }}
                      >
                        <Avatar
                          src={githubUser.avatar_url}
                          size={32}
                          alt=""
                          sx={{
                            borderRadius: '50%',
                            objectFit: 'cover',
                            flexShrink: 0,
                          }}
                        />
                      </Button>
                    </ActionMenu.Anchor>

                    <ActionMenu.Overlay
                      width="medium"
                      role="menu"
                      aria-labelledby="user-menu-description"
                    >
                      <div
                        id="user-menu-description"
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
                        User account menu with profile information and sign out
                        option
                      </div>
                      <ActionList>
                        <ActionList.Item
                          disabled
                          sx={{ py: 3 }}
                          role="menuitem"
                          aria-label={`Profile information for ${githubUser.name || githubUser.login}`}
                        >
                          <ActionList.LeadingVisual>
                            <Avatar
                              src={githubUser.avatar_url}
                              size={24}
                              alt=""
                              sx={{
                                borderRadius: '50%',
                                objectFit: 'cover',
                                flexShrink: 0,
                              }}
                            />
                          </ActionList.LeadingVisual>
                          <Box>
                            <Text
                              sx={{ fontWeight: 'semibold', display: 'block' }}
                            >
                              {githubUser.name || githubUser.login}
                            </Text>
                            <Text sx={{ fontSize: 0, color: 'fg.muted' }}>
                              @{githubUser.login}
                            </Text>
                          </Box>
                        </ActionList.Item>

                        <ActionList.Divider />

                        <ActionList.Item
                          onSelect={() => {
                            handleLogout();
                            setIsUserMenuOpen(false);
                          }}
                          role="menuitem"
                          aria-label="Sign out of your account"
                          sx={{
                            color: 'danger.fg',
                            '&:hover': {
                              bg: 'canvas.subtle',
                              color: 'danger.fg',
                            },
                            '&:active': {
                              bg: 'canvas.subtle',
                            },
                            '&:focus-visible': {
                              outline: '2px solid',
                              outlineColor: COLORS.brand.primary,
                              outlineOffset: '-2px',
                            },
                          }}
                        >
                          <ActionList.LeadingVisual>
                            <SignOutIcon />
                          </ActionList.LeadingVisual>
                          Sign out
                        </ActionList.Item>
                      </ActionList>
                    </ActionMenu.Overlay>
                  </ActionMenu>
                </Header.Item>
              )}
            </Header>

            <Box
              sx={{
                flex: 1,
                overflow: 'auto',
                p: currentView === 'notebook' ? 0 : 3,
              }}
            >
              {renderView()}
            </Box>
          </Box>
        </JupyterReactTheme>
      </BaseStyles>
    </ThemeProvider>
  );
};

export default App;
