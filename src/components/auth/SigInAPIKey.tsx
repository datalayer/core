/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 *
 * Datalayer License
 */

import type { JSX } from 'react';
import { useState } from 'react';
import { Button, FormControl, TextInput } from '@primer/react';
import { Box } from '@datalayer/primer-addons';
import { useIAM, useNavigate, useToast } from '../../hooks';
import { useIAMStore } from '../../state';

export interface ISigninAPIKeyProps {
  /**
   * Home page route to navigate to after successful login
   */
  homeRoute: string;
  /**
   * Disable token login controls (e.g., while another login flow is submitting)
   */
  disabled?: boolean;
  /**
   * CSS style object
   */
  style?: React.CSSProperties;
}

/**
 * Component for token-based authentication
 * Provides a simple button that expands to show a token input form
 */
export const SigInAPIKey = (props: ISigninAPIKeyProps): JSX.Element => {
  const { homeRoute, disabled = false, style } = props;
  const [showForm, setShowForm] = useState(false);
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);

  const { loginAndNavigate } = useIAM();
  const { logout, checkIAMToken } = useIAMStore();
  const { enqueueToast } = useToast();
  const navigate = useNavigate();

  const handleLogin = async () => {
    if (!token.trim()) {
      enqueueToast('Please enter a valid token', { variant: 'warning' });
      return;
    }

    setLoading(true);
    try {
      await loginAndNavigate(token, logout, checkIAMToken, navigate, homeRoute);
      setShowForm(false);
      setToken('');
    } catch (error) {
      console.error('Token sign-in failed:', error);
      enqueueToast('Failed to authenticate with provided token', {
        variant: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!showForm) {
    return (
      <Button
        onClick={() => setShowForm(true)}
        style={style}
        disabled={disabled}
      >
        Sign in with API Key
      </Button>
    );
  }

  return (
    <Box style={style}>
      <FormControl>
        <FormControl.Label>Your Authentication Token</FormControl.Label>
        <TextInput
          block
          placeholder="Paste your authentication token here"
          value={token}
          disabled={disabled || loading}
          onChange={e => setToken(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              handleLogin();
            } else if (e.key === 'Escape') {
              setShowForm(false);
              setToken('');
            }
          }}
        />
        <FormControl.Caption>
          Enter your Datalayer authentication token to log in
        </FormControl.Caption>
      </FormControl>

      <Box mt={3} display="flex" justifyContent="flex-start">
        <Button
          variant="primary"
          onClick={handleLogin}
          disabled={disabled || loading || !token.trim()}
          sx={{ mr: 2 }}
        >
          {loading ? 'Authenticating...' : 'Sign In'}
        </Button>
        <Button
          variant="default"
          disabled={disabled || loading}
          onClick={() => {
            setShowForm(false);
            setToken('');
          }}
        >
          Cancel
        </Button>
      </Box>
    </Box>
  );
};

export default SigInAPIKey;
