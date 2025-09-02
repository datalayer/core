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
import { DatabaseIcon, SignOutIcon, BookIcon } from '@primer/octicons-react';
import { useCoreStore } from '@datalayer/core';
import { useDatalayerAPI } from './hooks/useDatalayerAPI';
import LoginView from './components/LoginView';
import NotebookView from './components/NotebookView';
import NotebooksList from './components/NotebooksList';
import EnvironmentsList from './components/EnvironmentsList';
import { useRuntimeStore } from './stores/runtimeStore';
import { COLORS } from './constants/colors';
import { logger } from './utils/logger';

type ViewType = 'notebooks' | 'notebook' | 'environments';

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
  const { configuration } = useCoreStore();
  const { checkAuth, logout: logoutAPI } = useDatalayerAPI();
  const { reconnectToExistingRuntimes } = useRuntimeStore();

  // Fetch GitHub user data
  const fetchGitHubUser = useCallback(async (userId: string) => {
    try {
      // Extract GitHub user ID from the handle (e.g., "urn:dla:iam:ext::github:3627835")
      const match = userId.match(/github:(\d+)/);
      if (match && match[1]) {
        const githubId = match[1];

        // First try to get user by ID
        const response = await fetch(`https://api.github.com/user/${githubId}`);
        if (response.ok) {
          const userData = (await response.json()) as GitHubUser;
          setGithubUser(userData);
          logger.debug('GitHub user data:', userData);
        } else {
          // Fallback: search for user by ID
          const searchResponse = await fetch(
            `https://api.github.com/search/users?q=id:${githubId}`
          );
          if (searchResponse.ok) {
            const searchData = (await searchResponse.json()) as {
              items: GitHubUser[];
            };
            if (searchData.items && searchData.items.length > 0) {
              const user = searchData.items[0];
              // Fetch full user details
              const userResponse = await fetch(user.url || '');
              if (userResponse.ok) {
                const userData = (await userResponse.json()) as GitHubUser;
                setGithubUser(userData);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch GitHub user:', error);
      // Set a default avatar for fallback
      setGithubUser({
        login: 'User',
        name: 'Datalayer User',
        avatar_url: `https://avatars.githubusercontent.com/u/3627835?v=4`,
        id: 3627835,
      });
    }
  }, []);

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
          // Fetch GitHub user data based on the user handle from the console logs
          fetchGitHubUser('urn:dla:iam:ext::github:3627835');

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

  // Monitor configuration changes
  useEffect(() => {
    if (configuration?.token && configuration?.runUrl) {
      setIsAuthenticated(true);
    }
  }, [configuration]);

  // Monitor network connectivity

  const handleLogout = async () => {
    // Use secure IPC to logout
    await logoutAPI();
    setIsAuthenticated(false);
    setCurrentView('environments');
    setSelectedNotebook(null);
  };

  const handleNotebookSelect = (notebook: NotebookData) => {
    logger.debug('Selected notebook:', notebook);
    setSelectedNotebook(notebook);
    setCurrentView('notebook');
  };

  const renderView = (): React.ReactElement => {
    switch (currentView) {
      case 'notebooks':
        return <NotebooksList onNotebookSelect={handleNotebookSelect} />;
      case 'notebook':
        return (
          <NotebookView
            selectedNotebook={selectedNotebook}
            onClose={() => {
              setCurrentView('notebooks');
              setSelectedNotebook(null);
            }}
          />
        );
      case 'environments':
        return <EnvironmentsList />;
      default:
        return <EnvironmentsList />;
    }
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
          <LoginView />
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
                    fontWeight:
                      currentView === 'environments' ? 'bold' : 'normal',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
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
                    fontWeight:
                      currentView === 'notebooks' || currentView === 'notebook'
                        ? 'bold'
                        : 'normal',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                  }}
                >
                  <BookIcon size={16} />
                  <span>Notebooks</span>
                </Header.Link>
              </Header.Item>
              <Header.Item full />
              {isAuthenticated && githubUser && (
                <Header.Item>
                  <ActionMenu>
                    <ActionMenu.Anchor>
                      <Button
                        variant="invisible"
                        sx={{
                          p: 0,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 2,
                          borderRadius: '50%',
                        }}
                      >
                        <Avatar
                          src={githubUser.avatar_url}
                          size={32}
                          alt={githubUser.name || githubUser.login}
                          sx={{
                            borderRadius: '50%',
                            objectFit: 'cover',
                            flexShrink: 0,
                          }}
                        />
                      </Button>
                    </ActionMenu.Anchor>

                    <ActionMenu.Overlay width="medium">
                      <ActionList>
                        <ActionList.Item disabled sx={{ py: 3 }}>
                          <ActionList.LeadingVisual>
                            <Avatar
                              src={githubUser.avatar_url}
                              size={24}
                              alt={githubUser.name || githubUser.login}
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
                          onSelect={handleLogout}
                          sx={{
                            color: 'danger.fg',
                            '&:hover': {
                              bg: 'canvas.subtle',
                              color: 'danger.fg',
                            },
                            '&:active': {
                              bg: 'canvas.subtle',
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
