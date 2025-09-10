/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import React, { useState } from 'react';
import {
  Box,
  Button,
  FormControl,
  Heading,
  Text,
  TextInput,
  Flash,
} from '@primer/react';
import { CheckIcon } from '@primer/octicons-react';
import { useDatalayerAPI } from '../hooks/useDatalayerAPI';
import { COLORS } from '../constants/colors';
import iconImage from '../assets/icon.png';

interface LoginViewProps {
  onUserDataFetched?: (userData: Record<string, unknown>) => void;
}

const LoginView: React.FC<LoginViewProps> = ({ onUserDataFetched }) => {
  const [runUrl, setRunUrl] = useState('https://prod1.datalayer.run');
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useDatalayerAPI();

  const handleLogin = async () => {
    if (!runUrl || !token) {
      setError('Please provide both Run URL and Token');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Use secure IPC to login
      const result = await login(runUrl, token);

      if (!result.success) {
        setError(
          result.message || 'Failed to login. Please check your credentials.'
        );
      } else if (onUserDataFetched && (result as any).userData) {
        // Pass user data to parent component if available
        onUserDataFetched((result as any).userData);
      }
      // If successful, the hook will handle updating the store and navigation
    } catch (err) {
      setError('Failed to login. Please check your credentials.');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleLogin();
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        bg: 'canvas.default',
        p: 4,
      }}
    >
      <Box
        as="main"
        sx={{
          width: '100%',
          maxWidth: 480,
          p: 5,
          bg: 'canvas.subtle',
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'border.default',
          boxShadow: 'shadow.medium',
        }}
        role="main"
        aria-labelledby="login-heading"
        aria-describedby="login-description"
      >
        <header style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <Box
            sx={{
              width: 96,
              height: 96,
              margin: '0 auto',
              mb: 3,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <img
              src={iconImage}
              alt="Datalayer application logo"
              style={{
                width: '96px',
                height: '96px',
                borderRadius: '20px',
                objectFit: 'cover',
              }}
            />
          </Box>
          <Heading as="h1" id="login-heading" sx={{ mb: 2 }}>
            Connect to Datalayer
          </Heading>
          <Text id="login-description" sx={{ color: 'fg.subtle' }}>
            Enter your Datalayer credentials to access cloud resources
          </Text>
        </header>

        {error && (
          <Flash
            variant="danger"
            sx={{ mb: 3 }}
            role="alert"
            aria-live="assertive"
          >
            {error}
          </Flash>
        )}

        <form
          onSubmit={e => {
            e.preventDefault();
            handleLogin();
          }}
          noValidate
          aria-label="Datalayer authentication form"
        >
          <fieldset
            disabled={loading}
            style={{ border: 'none', padding: 0, margin: 0 }}
          >
            <legend
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
              Login credentials
            </legend>

            <FormControl sx={{ mb: 3 }} required>
              <FormControl.Label htmlFor="run-url-input">
                Run URL *
              </FormControl.Label>
              <TextInput
                id="run-url-input"
                block
                size="large"
                value={runUrl}
                onChange={e => setRunUrl(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="https://prod1.datalayer.run"
                aria-label="Datalayer instance URL"
                aria-describedby="run-url-help"
                aria-invalid={!runUrl && error ? 'true' : 'false'}
                required
                sx={{
                  '&:focus-visible': {
                    outline: '2px solid',
                    outlineColor: COLORS.brand.primary,
                    outlineOffset: '2px',
                  },
                }}
              />
              <FormControl.Caption id="run-url-help">
                The URL of your Datalayer instance (required)
              </FormControl.Caption>
            </FormControl>

            <FormControl sx={{ mb: 4 }} required>
              <FormControl.Label htmlFor="api-token-input">
                API Token *
              </FormControl.Label>
              <TextInput
                id="api-token-input"
                block
                size="large"
                type="password"
                value={token}
                onChange={e => setToken(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Enter your API token"
                aria-label="Datalayer API authentication token"
                aria-describedby="api-token-help"
                aria-invalid={!token && error ? 'true' : 'false'}
                required
                autoComplete="current-password"
                sx={{
                  '&:focus-visible': {
                    outline: '2px solid',
                    outlineColor: COLORS.brand.primary,
                    outlineOffset: '2px',
                  },
                }}
              />
              <FormControl.Caption id="api-token-help">
                <Text>
                  Your Datalayer API token for authentication (required).{' '}
                  <Button
                    as="a"
                    variant="invisible"
                    size="small"
                    href="https://datalayer.app/settings/iam/tokens"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Open Datalayer settings to get an API token (opens in new tab)"
                    sx={{
                      p: 0,
                      fontSize: 'inherit',
                      verticalAlign: 'baseline',
                      '&:focus-visible': {
                        outline: '2px solid',
                        outlineColor: COLORS.brand.primary,
                        outlineOffset: '2px',
                        borderRadius: 1,
                      },
                    }}
                  >
                    Get a token
                  </Button>
                </Text>
              </FormControl.Caption>
            </FormControl>

            <Button
              type="submit"
              size="large"
              block
              onClick={handleLogin}
              disabled={loading || !runUrl || !token}
              aria-describedby="connect-button-help"
              sx={{
                backgroundColor: COLORS.brand.primary,
                '&:hover': { backgroundColor: COLORS.brand.primaryHover },
                '&:disabled': { opacity: 0.5 },
                '&:focus-visible': {
                  outline: '2px solid',
                  outlineColor: 'white',
                  outlineOffset: '-2px',
                },
                color: 'white',
              }}
            >
              {loading ? (
                <>
                  <Box as="span" aria-hidden="true">
                    Connecting...
                  </Box>
                  <Box
                    as="span"
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
                    Authenticating with Datalayer, please wait
                  </Box>
                </>
              ) : (
                <>
                  <CheckIcon aria-hidden="true" /> Connect
                </>
              )}
            </Button>
            <div
              id="connect-button-help"
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
              {!runUrl || !token
                ? 'Complete both URL and token fields to enable connection'
                : 'Submit form to authenticate with Datalayer'}
            </div>
          </fieldset>
        </form>

        <Box
          as="footer"
          sx={{
            mt: 4,
            pt: 3,
            borderTop: '1px solid',
            borderColor: 'border.muted',
          }}
        >
          <Text sx={{ fontSize: 0, color: 'fg.muted', textAlign: 'center' }}>
            Need help? Visit{' '}
            <Button
              as="a"
              variant="invisible"
              size="small"
              href="https://docs.datalayer.io"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Visit Datalayer documentation (opens in new tab)"
              sx={{
                p: 0,
                fontSize: 0,
                '&:focus-visible': {
                  outline: '2px solid',
                  outlineColor: COLORS.brand.primary,
                  outlineOffset: '2px',
                  borderRadius: 1,
                },
              }}
            >
              docs.datalayer.io
            </Button>{' '}
            for more information.
          </Text>
        </Box>
      </Box>

      <Box as="aside" sx={{ mt: 4, textAlign: 'center' }}>
        <Text sx={{ fontSize: 0, color: 'fg.subtle' }}>
          Datalayer Electron Example • Version{' '}
          {window.electronAPI ? 'Desktop' : 'Web'}
        </Text>
      </Box>
    </Box>
  );
};

export default LoginView;
