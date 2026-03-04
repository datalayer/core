/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * LoginPage – Minimal handle + password login for the OTEL example.
 *
 * Posts to `/api/iam/v1/login` (proxied by Vite to the IAM service)
 * and stores the returned JWT in the auth Zustand store.
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
import { useAuthStore } from './stores/authStore';

export const LoginPage: React.FC = () => {
  const setAuth = useAuthStore((s) => s.setAuth);

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
      const resp = await fetch('/api/iam/v1/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handle, password }),
      });
      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}`);
      }
      const data = await resp.json();
      if (data.success && data.token) {
        setAuth(data.token, handle);
      } else {
        setError(data.message || 'Invalid username or password.');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [handle, password, loading, setAuth]);

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
          <TelescopeIcon size={24} />
          <Heading sx={{ fontSize: 3 }}>Datalayer OTEL</Heading>
        </Box>

        <Text as="p" sx={{ fontSize: 1, color: 'fg.muted', mb: 3, textAlign: 'center' }}>
          Sign in to access the observability dashboard.
        </Text>

        {/* Handle */}
        <FormControl required sx={{ mb: 3 }}>
          <FormControl.Label>Username</FormControl.Label>
          <TextInput
            autoFocus
            block
            placeholder="Your username"
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
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
            onChange={(e) => setPassword(e.target.value)}
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
          <Text sx={{ color: 'danger.fg', fontSize: 1, mb: 3, display: 'block' }}>
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
