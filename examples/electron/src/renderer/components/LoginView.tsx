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
import { KeyIcon, CheckIcon } from '@primer/octicons-react';
import { useDatalayerAPI } from '../hooks/useDatalayerAPI';

const LoginView: React.FC = () => {
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
      >
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <KeyIcon size={48} />
          <Heading as="h1" sx={{ mt: 3, mb: 2 }}>
            Connect to Datalayer
          </Heading>
          <Text sx={{ color: 'fg.subtle' }}>
            Enter your Datalayer credentials to access cloud resources
          </Text>
        </Box>

        {error && (
          <Flash variant="danger" sx={{ mb: 3 }}>
            {error}
          </Flash>
        )}

        <FormControl sx={{ mb: 3 }}>
          <FormControl.Label>Run URL</FormControl.Label>
          <TextInput
            block
            size="large"
            value={runUrl}
            onChange={e => setRunUrl(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="https://prod1.datalayer.run"
            aria-label="Run URL"
          />
          <FormControl.Caption>
            The URL of your Datalayer instance
          </FormControl.Caption>
        </FormControl>

        <FormControl sx={{ mb: 4 }}>
          <FormControl.Label>API Token</FormControl.Label>
          <TextInput
            block
            size="large"
            type="password"
            value={token}
            onChange={e => setToken(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Enter your API token"
            aria-label="API Token"
          />
          <FormControl.Caption>
            Your Datalayer API token for authentication
          </FormControl.Caption>
        </FormControl>

        <Button
          variant="primary"
          size="large"
          block
          onClick={handleLogin}
          disabled={loading || !runUrl || !token}
        >
          {loading ? (
            <>Connecting...</>
          ) : (
            <>
              <CheckIcon /> Connect
            </>
          )}
        </Button>

        <Box
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
              sx={{ p: 0, fontSize: 0 }}
            >
              docs.datalayer.io
            </Button>{' '}
            for more information.
          </Text>
        </Box>
      </Box>

      <Box sx={{ mt: 4, textAlign: 'center' }}>
        <Text sx={{ fontSize: 0, color: 'fg.subtle' }}>
          Datalayer Electron Example • Version{' '}
          {window.electronAPI ? 'Desktop' : 'Web'}
        </Text>
      </Box>
    </Box>
  );
};

export default LoginView;
