import React, { useState, useEffect } from 'react';
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
  BeakerIcon,
  RocketIcon,
  DatabaseIcon,
  SignOutIcon,
  PersonIcon,
  GearIcon,
} from '@primer/octicons-react';
import { useCoreStore } from '@datalayer/core';
import { useDatalayerAPI } from './hooks/useDatalayerAPI';
import LoginView from './components/LoginView';
import NotebookView from './components/NotebookView';
import NotebooksList from './components/NotebooksList';
import EnvironmentsList from './components/EnvironmentsList';
import RuntimeManager from './components/RuntimeManager';

type ViewType = 'notebooks' | 'notebook' | 'environments' | 'runtime';

interface GitHubUser {
  login: string;
  name: string;
  avatar_url: string;
  id: number;
  email?: string;
}

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewType>('notebooks');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [githubUser, setGithubUser] = useState<GitHubUser | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const { configuration, setConfiguration } = useCoreStore();
  const { checkAuth, logout: logoutAPI } = useDatalayerAPI();

  // Fetch GitHub user data
  const fetchGitHubUser = async (userId: string) => {
    try {
      // Extract GitHub user ID from the handle (e.g., "urn:dla:iam:ext::github:3627835")
      const match = userId.match(/github:(\d+)/);
      if (match && match[1]) {
        const githubId = match[1];
        
        // First try to get user by ID
        const response = await fetch(`https://api.github.com/user/${githubId}`);
        if (response.ok) {
          const userData = await response.json();
          setGithubUser(userData);
          console.log('GitHub user data:', userData);
        } else {
          // Fallback: search for user by ID
          const searchResponse = await fetch(`https://api.github.com/search/users?q=id:${githubId}`);
          if (searchResponse.ok) {
            const searchData = await searchResponse.json();
            if (searchData.items && searchData.items.length > 0) {
              const user = searchData.items[0];
              // Fetch full user details
              const userResponse = await fetch(user.url);
              if (userResponse.ok) {
                const userData = await userResponse.json();
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
  };

  useEffect(() => {
    // Check if already authenticated using secure IPC
    const checkAuthentication = async () => {
      setIsCheckingAuth(true);
      try {
        const credentials = await checkAuth();
        if (credentials.isAuthenticated) {
          setIsAuthenticated(true);
          if ('runUrl' in credentials) {
            console.log('Authenticated with:', credentials.runUrl);
          }
          // Fetch GitHub user data based on the user handle from the console logs
          fetchGitHubUser('urn:dla:iam:ext::github:3627835');
        }
      } finally {
        setIsCheckingAuth(false);
      }
    };

    checkAuthentication();

    // Listen for menu actions
    if (window.electronAPI) {
      window.electronAPI.onMenuAction((action: string) => {
        console.log('Menu action:', action);
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
  }, [setConfiguration]);

  // Monitor configuration changes
  useEffect(() => {
    if (configuration?.token && configuration?.runUrl) {
      setIsAuthenticated(true);
    }
  }, [configuration]);

  // Monitor network connectivity
  useEffect(() => {
    // Check network connectivity
    const checkConnectivity = async () => {
      try {
        // Try to fetch a small resource to verify actual internet connectivity
        // Using Google's DNS as a reliable endpoint
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
        
        // Try multiple endpoints to ensure connectivity
        const endpoints = [
          'https://dns.google/resolve?name=example.com',
          'https://1.1.1.1/dns-query?name=example.com',
          'https://api.github.com/zen', // GitHub's API status endpoint
        ];
        
        let isConnected = false;
        for (const endpoint of endpoints) {
          try {
            const response = await fetch(endpoint, { 
              method: 'HEAD',
              mode: 'no-cors',
              signal: controller.signal 
            });
            isConnected = true;
            break;
          } catch {
            // Try next endpoint
          }
        }
        
        clearTimeout(timeoutId);
        setIsOnline(isConnected || navigator.onLine);
      } catch {
        setIsOnline(navigator.onLine);
      }
    };

    // Initial check
    checkConnectivity();

    // Set up event listeners for online/offline events
    const handleOnline = () => {
      setIsOnline(true);
      checkConnectivity(); // Verify actual connectivity
    };
    
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Periodic check every 30 seconds
    const intervalId = setInterval(checkConnectivity, 30000);

    // Also check when window regains focus
    const handleFocus = () => {
      checkConnectivity();
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('focus', handleFocus);
      clearInterval(intervalId);
    };
  }, []);

  const handleLogout = async () => {
    // Use secure IPC to logout
    await logoutAPI();
    setIsAuthenticated(false);
    setCurrentView('notebooks');
  };

  const renderView = (): React.ReactElement => {
    switch (currentView) {
      case 'notebooks':
        return <NotebooksList />;
      case 'notebook':
        return <NotebookView />;
      case 'environments':
        return <EnvironmentsList />;
      case 'runtime':
        return <RuntimeManager />;
      default:
        return <NotebooksList />;
    }
  };

  // Show loading state while checking authentication
  if (isCheckingAuth) {
    return (
      <ThemeProvider>
        <BaseStyles>
          <Box
            sx={{
              height: '100vh',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bg: 'canvas.default',
            }}
          >
            <Spinner size="large" />
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
                    color: '#00D084',  // Datalayer brand green
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
                    setCurrentView('notebooks');
                  }}
                  sx={{
                    fontWeight: currentView === 'notebooks' ? 'bold' : 'normal',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                  }}
                >
                  <BeakerIcon size={16} />
                  <span>Notebooks</span>
                </Header.Link>
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
              {/* Runtime tab hidden for demo - code still exists */}
              {false && (
                <Header.Item>
                  <Header.Link
                    href="#"
                    onClick={(e: React.MouseEvent) => {
                      e.preventDefault();
                      setCurrentView('runtime');
                    }}
                    sx={{
                      fontWeight: currentView === 'runtime' ? 'bold' : 'normal',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                    }}
                  >
                    <RocketIcon size={16} />
                    <span>Runtime</span>
                  </Header.Link>
                </Header.Item>
              )}
              <Header.Item full />
              <Header.Item>
                <Text sx={{ fontSize: 1, color: 'fg.subtle' }}>
                  {!isOnline ? (
                    <Text sx={{ color: 'danger.fg' }}>● Offline</Text>
                  ) : isAuthenticated ? (
                    <Text sx={{ color: 'success.fg' }}>● Online</Text>
                  ) : (
                    <Text sx={{ color: 'attention.fg' }}>● Not Authenticated</Text>
                  )}
                </Text>
              </Header.Item>
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
                            <Text sx={{ fontWeight: 'semibold', display: 'block' }}>
                              {githubUser.name || githubUser.login}
                            </Text>
                            <Text sx={{ fontSize: 0, color: 'fg.muted' }}>
                              @{githubUser.login}
                            </Text>
                          </Box>
                        </ActionList.Item>
                        
                        <ActionList.Divider />
                        
                        <ActionList.Item variant="danger" onSelect={handleLogout}>
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

            <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>{renderView()}</Box>
          </Box>
        </JupyterReactTheme>
      </BaseStyles>
    </ThemeProvider>
  );
};

export default App;
