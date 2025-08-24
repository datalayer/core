import React, { useState, useEffect } from 'react';
import { JupyterReactTheme } from '@datalayer/jupyter-react';
import {
  ThemeProvider,
  BaseStyles,
  Box,
  Header,
  Text,
  Button,
} from '@primer/react';
import {
  BeakerIcon,
  RocketIcon,
  DatabaseIcon,
  SignOutIcon,
} from '@primer/octicons-react';
import { useCoreStore } from '@datalayer/core';
import { useDatalayerAPI } from './hooks/useDatalayerAPI';
import LoginView from './components/LoginView';
import NotebookView from './components/NotebookView';
import EnvironmentsList from './components/EnvironmentsList';
import RuntimeManager from './components/RuntimeManager';

type ViewType = 'notebook' | 'environments' | 'runtime';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewType>('notebook');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { configuration, setConfiguration } = useCoreStore();
  const { checkAuth, logout: logoutAPI } = useDatalayerAPI();

  useEffect(() => {
    // Check if already authenticated using secure IPC
    const checkAuthentication = async () => {
      const credentials = await checkAuth();
      if (credentials.isAuthenticated) {
        setIsAuthenticated(true);
        console.log('Authenticated with:', credentials.runUrl);
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

  const handleLogout = async () => {
    // Use secure IPC to logout
    await logoutAPI();
    setIsAuthenticated(false);
    setCurrentView('notebook');
  };

  const renderView = (): React.ReactElement => {
    switch (currentView) {
      case 'notebook':
        return <NotebookView />;
      case 'environments':
        return <EnvironmentsList />;
      case 'runtime':
        return <RuntimeManager />;
      default:
        return <NotebookView />;
    }
  };

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
                <Header.Link
                  href="#"
                  sx={{ fontSize: 2, fontWeight: 'bold' }}
                  onClick={(e: React.MouseEvent) => {
                    e.preventDefault();
                  }}
                >
                  Datalayer Electron Example
                </Header.Link>
              </Header.Item>
              <Header.Item>
                <Header.Link
                  href="#"
                  onClick={(e: React.MouseEvent) => {
                    e.preventDefault();
                    setCurrentView('notebook');
                  }}
                  sx={{
                    fontWeight: currentView === 'notebook' ? 'bold' : 'normal',
                  }}
                >
                  <BeakerIcon size={16} />
                  Notebook
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
                  }}
                >
                  <DatabaseIcon size={16} />
                  Environments
                </Header.Link>
              </Header.Item>
              <Header.Item>
                <Header.Link
                  href="#"
                  onClick={(e: React.MouseEvent) => {
                    e.preventDefault();
                    setCurrentView('runtime');
                  }}
                  sx={{
                    fontWeight: currentView === 'runtime' ? 'bold' : 'normal',
                  }}
                >
                  <RocketIcon size={16} />
                  Runtime
                </Header.Link>
              </Header.Item>
              <Header.Item full />
              <Header.Item>
                <Text sx={{ fontSize: 1, color: 'fg.subtle' }}>
                  {isAuthenticated ? (
                    <Text sx={{ color: 'success.fg' }}>● Connected</Text>
                  ) : (
                    <Text sx={{ color: 'danger.fg' }}>● Not Connected</Text>
                  )}
                </Text>
              </Header.Item>
              {isAuthenticated && (
                <Header.Item>
                  <Button
                    variant="invisible"
                    size="small"
                    onClick={handleLogout}
                    sx={{ ml: 2 }}
                  >
                    <SignOutIcon size={16} /> Logout
                  </Button>
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
