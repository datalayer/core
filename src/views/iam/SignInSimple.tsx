/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * SignInSimple – Generic handle + password sign-in form.
 *
 * Posts to `loginUrl` (default `/api/iam/v1/login`) with
 * `{ handle, password }`, then calls `onSignIn(token, handle)` on
 * success so the caller can persist credentials as needed.
 *
 * @module views/signin
 */

import React, { useState, useCallback } from 'react';
import {
  Box,
  Button,
  FormControl,
  Heading,
  Text,
  TextInput,
} from '@primer/react';
import { EyeIcon, EyeClosedIcon, TelescopeIcon } from '@primer/octicons-react';

// ── Props ────────────────────────────────────────────────────────────

export interface SignInSimpleProps {
  /**
   * Called after a successful login with the JWT and the user handle.
   * Typically used to store credentials in a Zustand / context store.
   */
  onSignIn: (token: string, handle: string) => void;
  /**
   * Login endpoint.  Defaults to `/api/iam/v1/login`.
   * The endpoint must accept `POST { handle, password }` and return
   * `{ success: boolean; token?: string; message?: string }`.
   */
  loginUrl?: string;
  /**
   * Optional heading text.  Defaults to `"Datalayer OTEL"`.
   */
  title?: string;
  /**
   * Optional subtitle / description.
   */
  description?: string;
  /**
   * Leading icon element rendered next to the title.
   * Defaults to `<TelescopeIcon size={24} />`.
   */
  leadingIcon?: React.ReactNode;
}

// ── Component ────────────────────────────────────────────────────────

export const SignInSimple: React.FC<SignInSimpleProps> = ({
  onSignIn,
  loginUrl = '/api/iam/v1/login',
  title = 'Datalayer OTEL',
  description = 'Sign in to access the observability dashboard.',
  leadingIcon = <TelescopeIcon size={24} />,
}) => {
  const [handle, setHandle] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(async () => {
    if (!handle || !password || loading) return;
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch(loginUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handle, password }),
      });
      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}`);
      }
      const data = await resp.json();
      if (data.success && data.token) {
        onSignIn(data.token, handle);
      } else {
        setError(data.message || 'Invalid username or password.');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [handle, password, loading, loginUrl, onSignIn]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') submit();
    },
    [submit],
  );

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        bg: 'canvas.default',
        color: 'fg.default',
      }}
    >
      <Box
        sx={{
          width: 360,
          p: 4,
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'border.default',
          bg: 'canvas.subtle',
        }}
      >
        {/* Header / Branding */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            mb: 4,
            justifyContent: 'center',
          }}
        >
          {leadingIcon}
          <Heading sx={{ fontSize: 3 }}>{title}</Heading>
        </Box>

        <Text
          as="p"
          sx={{ fontSize: 1, color: 'fg.muted', mb: 3, textAlign: 'center' }}
        >
          {description}
        </Text>

        {/* Handle */}
        <FormControl required sx={{ mb: 3 }}>
          <FormControl.Label>Username</FormControl.Label>
          <TextInput
            autoFocus
            block
            placeholder="Your username"
            value={handle}
            onChange={e => setHandle(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </FormControl>

        {/* Password */}
        <FormControl required sx={{ mb: 3 }}>
          <FormControl.Label>Password</FormControl.Label>
          <TextInput
            block
            placeholder="Your password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={handleKeyDown}
            trailingAction={
              <TextInput.Action
                onClick={() => setShowPassword(!showPassword)}
                icon={showPassword ? EyeClosedIcon : EyeIcon}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                sx={{ color: 'var(--fgColor-muted)' }}
              />
            }
          />
        </FormControl>

        {/* Error */}
        {error && (
          <Text
            sx={{ color: 'danger.fg', fontSize: 1, mb: 3, display: 'block' }}
          >
            {error}
          </Text>
        )}

        {/* Submit */}
        <Button
          variant="primary"
          block
          disabled={loading || !handle || !password}
          onClick={submit}
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </Button>
      </Box>
    </Box>
  );
};

export default SignInSimple;
