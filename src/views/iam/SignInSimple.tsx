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

import React, {
  useState,
  useCallback,
  useRef,
  useMemo,
  useEffect,
} from 'react';
import {
  Box,
  Button,
  FormControl,
  Heading,
  Text,
  Textarea,
  TextInput,
} from '@primer/react';
import {
  EyeIcon,
  EyeClosedIcon,
  KeyIcon,
  LinkExternalIcon,
  TelescopeIcon,
} from '@primer/octicons-react';
import { coreStore } from '../../state';

// ── Props ────────────────────────────────────────────────────────────

export interface SignInSimpleProps {
  /**
   * Called after a successful login with the JWT and the user handle.
   * Typically used to store credentials in a Zustand / context store.
   */
  onSignIn: (token: string, handle: string) => void;
  /**
   * Called when the user authenticates with an API key.
   * If not provided the "Sign In with an API Key" button is hidden.
   */
  onApiKeySignIn?: (apiKey: string) => void;
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
  onApiKeySignIn,
  loginUrl: loginUrlProp,
  title = 'Datalayer OTEL',
  description = 'Sign in to access the observability dashboard.',
  leadingIcon = <TelescopeIcon size={24} />,
}) => {
  const loginUrl = useMemo(() => {
    if (loginUrlProp) return loginUrlProp;
    const iamRunUrl = coreStore.getState().configuration?.iamRunUrl;
    return iamRunUrl ? `${iamRunUrl}/api/iam/v1/login` : '/api/iam/v1/login';
  }, [loginUrlProp]);
  const [handle, setHandle] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // API Key dialog state
  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const apiKeyRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (showApiKeyDialog) {
      apiKeyRef.current?.focus();
    }
  }, [showApiKeyDialog]);

  const closeApiKeyDialog = useCallback(() => {
    setShowApiKeyDialog(false);
    setApiKey('');
  }, []);

  const handleApiKeyAuthenticate = useCallback(() => {
    if (!apiKey.trim() || !onApiKeySignIn) return;
    onApiKeySignIn(apiKey.trim());
    closeApiKeyDialog();
  }, [apiKey, onApiKeySignIn, closeApiKeyDialog]);

  const handleSignUp = useCallback(() => {
    window.open('https://datalayer.ai/signup', '_blank', 'noopener,noreferrer');
  }, []);

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

        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
          <Button
            size="small"
            variant="invisible"
            leadingVisual={LinkExternalIcon}
            onClick={handleSignUp}
          >
            Sign Up
          </Button>
        </Box>

        {/* API Key */}
        {onApiKeySignIn && (
          <>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                my: 3,
              }}
            >
              <Box sx={{ flex: 1, height: '1px', bg: 'border.default' }} />
              <Text sx={{ fontSize: 0, color: 'fg.muted' }}>or</Text>
              <Box sx={{ flex: 1, height: '1px', bg: 'border.default' }} />
            </Box>
            <Button
              block
              leadingVisual={KeyIcon}
              onClick={() => setShowApiKeyDialog(true)}
            >
              Sign In with an API Key
            </Button>
            {showApiKeyDialog && (
              <Box
                role="dialog"
                aria-modal="true"
                aria-labelledby="signin-api-key-title"
                onKeyDown={event => {
                  if (event.key === 'Escape') {
                    closeApiKeyDialog();
                  }
                }}
                onClick={closeApiKeyDialog}
                sx={{
                  position: 'fixed',
                  inset: 0,
                  zIndex: 200,
                  p: 3,
                  bg: 'canvas.backdrop',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Box
                  as="form"
                  onClick={event => event.stopPropagation()}
                  onSubmit={event => {
                    event.preventDefault();
                    handleApiKeyAuthenticate();
                  }}
                  sx={{
                    width: 'min(560px, 100%)',
                    p: 3,
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: 'border.default',
                    bg: 'canvas.overlay',
                    color: 'fg.default',
                    boxShadow: 'shadow.large',
                  }}
                >
                  <Heading
                    id="signin-api-key-title"
                    sx={{ fontSize: 2, mb: 2 }}
                  >
                    Enter your API Key
                  </Heading>
                  <FormControl required>
                    <FormControl.Label>API Key</FormControl.Label>
                    <Textarea
                      block
                      required
                      autoFocus
                      placeholder="Paste your API key here"
                      value={apiKey}
                      onInput={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                        setApiKey(e.target.value)
                      }
                      ref={apiKeyRef}
                    />
                  </FormControl>
                  <Box
                    sx={{
                      mt: 3,
                      display: 'flex',
                      justifyContent: 'flex-end',
                      gap: 2,
                    }}
                  >
                    <Button type="button" onClick={closeApiKeyDialog}>
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      disabled={!apiKey.trim()}
                    >
                      Authenticate
                    </Button>
                  </Box>
                </Box>
              </Box>
            )}
          </>
        )}
      </Box>
    </Box>
  );
};

export default SignInSimple;
