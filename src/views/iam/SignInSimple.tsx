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
 * @module views/iam
 */

import React, {
  useState,
  useCallback,
  useRef,
  useMemo,
  useEffect,
} from 'react';
import { PageConfig, URLExt } from '@jupyterlab/coreutils';
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
import { GithubMarkIcon, LinkedInGreyIcon } from '@datalayer/icons-react';
import { isInsideJupyterLab } from '../../utils/Jupyter';

const GoogleIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    preserveAspectRatio="xMidYMid"
    viewBox="0 0 256 262"
    height="16px"
    fill="currentColor"
    aria-hidden="true"
  >
    <path
      fill="currentColor"
      d="M255.878 133.451c0-10.734-.871-18.567-2.756-26.69H130.55v48.448h71.947c-1.45 12.04-9.283 30.172-26.69 42.356l-.244 1.622 38.755 30.023 2.685.268c24.659-22.774 38.875-56.282 38.875-96.027"
    />
    <path
      fill="currentColor"
      d="M130.55 261.1c35.248 0 64.839-11.605 86.453-31.622l-41.196-31.913c-11.024 7.688-25.82 13.055-45.257 13.055-34.523 0-63.824-22.773-74.269-54.25l-1.531.13-40.298 31.187-.527 1.465C35.393 231.798 79.49 261.1 130.55 261.1"
    />
    <path
      fill="currentColor"
      d="M56.281 156.37c-2.756-8.123-4.351-16.827-4.351-25.82 0-8.994 1.595-17.697 4.206-25.82l-.073-1.73L15.26 71.312l-1.335.635C5.077 89.644 0 109.517 0 130.55s5.077 40.905 13.925 58.602l42.356-32.782"
    />
    <path
      fill="currentColor"
      d="M130.55 50.479c24.514 0 41.05 10.589 50.479 19.438l36.844-35.974C195.245 12.91 165.798 0 130.55 0 79.49 0 35.393 29.301 13.925 71.947l42.211 32.783c10.59-31.477 39.891-54.251 74.414-54.251"
    />
  </svg>
);

type OAuthProviderName = 'github' | 'google' | 'linkedin';

type OAuthProviderSpec = {
  name: OAuthProviderName;
  oauth2CallbackServerRoute: string;
  oauth2CallbackUIRoute: string;
};

const OAUTH2_PROVIDERS: Record<OAuthProviderName, OAuthProviderSpec> = {
  github: {
    name: 'github',
    oauth2CallbackServerRoute: 'jupyter_iam/oauth2/callback',
    oauth2CallbackUIRoute: '/iam/oauth2/github/callback',
  },
  google: {
    name: 'google',
    oauth2CallbackServerRoute: 'jupyter_iam/oauth2/callback',
    oauth2CallbackUIRoute: '/iam/oauth2/google/callback',
  },
  linkedin: {
    name: 'linkedin',
    oauth2CallbackServerRoute: 'jupyter_iam/oauth2/callback',
    oauth2CallbackUIRoute: '/iam/oauth2/linkedin/callback',
  },
};

const getIAMRunUrlFromDocumentConfig = (): string => {
  if (typeof document === 'undefined') {
    return '';
  }
  const configScript = document.getElementById('datalayer-config-data');
  if (!configScript?.textContent) {
    return '';
  }
  try {
    const config = JSON.parse(configScript.textContent);
    return String(config?.iamRunUrl || '').replace(/\/$/, '');
  } catch {
    return '';
  }
};

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
   * Optional product/app name shown as heading.
   */
  name?: string;
  /**
   * Optional heading text.  Defaults to `"Datalayer OTEL"`.
   * @deprecated Use `name`.
   */
  title?: string;
  /**
   * Optional subtitle / description.
   */
  description?: string;
  /**
   * Optional icon element rendered next to the heading.
   */
  icon?: React.ReactNode;
  /**
   * Leading icon element rendered next to the title.
   * Defaults to `<TelescopeIcon size={24} />`.
   * @deprecated Use `icon`.
   */
  leadingIcon?: React.ReactNode;
  /**
   * Show GitHub OAuth sign-in button.
   */
  github?: boolean;
  /**
   * Show Google OAuth sign-in button.
   */
  google?: boolean;
  /**
   * Show LinkedIn OAuth sign-in button.
   */
  linkedin?: boolean;
  /**
   * Show API key sign-in button.
   */
  apiKey?: boolean;
  /**
   * Show sign up button.
   */
  signUp?: boolean;
  /**
   * Optional target route to navigate to after social sign-in callback.
   * - `undefined` keeps current behavior (use current route when not `/`).
   * - `null`/empty disables forwarding any callback navigation target.
   */
  socialSignInNavigationTarget?: string | null;
}

// ── Component ────────────────────────────────────────────────────────

export const SignInSimple: React.FC<SignInSimpleProps> = ({
  onSignIn,
  onApiKeySignIn,
  loginUrl: loginUrlProp,
  name,
  title = 'Datalayer OTEL',
  description = 'Sign in to access the observability dashboard.',
  icon,
  leadingIcon = <TelescopeIcon size={24} />,
  github = false,
  google = false,
  linkedin = false,
  apiKey = false,
  signUp = true,
  socialSignInNavigationTarget,
}) => {
  const headingText = name ?? title;
  const headingIcon = icon ?? leadingIcon;

  const loginUrl = useMemo(() => {
    if (loginUrlProp) return loginUrlProp;
    const iamRunUrl = getIAMRunUrlFromDocumentConfig();
    return iamRunUrl ? `${iamRunUrl}/api/iam/v1/login` : '/api/iam/v1/login';
  }, [loginUrlProp]);
  const [handle, setHandle] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // API Key dialog state
  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false);
  const [apiKeyValue, setApiKeyValue] = useState('');
  const apiKeyRef = useRef<HTMLTextAreaElement>(null);

  const buildCallbackURI = useCallback(
    (providerSpec: OAuthProviderSpec): string => {
      if (isInsideJupyterLab()) {
        return URLExt.join(
          PageConfig.getBaseUrl(),
          providerSpec.oauth2CallbackServerRoute,
        );
      }
      return `${window.location.protocol}//${window.location.hostname}${window.location.port ? `:${window.location.port}` : ''}${providerSpec.oauth2CallbackUIRoute}`;
    },
    [],
  );

  const currentRelativeRoute = useMemo(() => {
    if (typeof window === 'undefined') {
      return '/';
    }
    const route = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    return route.startsWith('/') ? route : '/';
  }, []);

  const startOAuthSignIn = useCallback(
    async (providerSpec: OAuthProviderSpec) => {
      setError(null);
      setSocialLoading(true);
      try {
        const iamRunUrl = getIAMRunUrlFromDocumentConfig();
        const params = new URLSearchParams({
          provider: providerSpec.name,
          callback_uri: buildCallbackURI(providerSpec),
        });
        const explicitNavigationTarget =
          socialSignInNavigationTarget === undefined
            ? undefined
            : String(socialSignInNavigationTarget || '').trim();
        const callbackNavigationTarget =
          explicitNavigationTarget === undefined
            ? currentRelativeRoute && currentRelativeRoute !== '/'
              ? currentRelativeRoute
              : undefined
            : explicitNavigationTarget &&
                explicitNavigationTarget.startsWith('/') &&
                !explicitNavigationTarget.startsWith('//')
              ? explicitNavigationTarget
              : undefined;
        if (callbackNavigationTarget) {
          params.set('post_auth_redirect', callbackNavigationTarget);
        }
        const endpointBase = iamRunUrl || '';
        const endpoint = `${endpointBase}/api/iam/v1/oauth2/authz/url?${params.toString()}`;
        const response = await fetch(endpoint);
        const payload = await response.json();
        const authorizationURL = payload?.autorization_url;
        if (!response.ok || !authorizationURL) {
          throw new Error(payload?.message || 'Unable to start social sign-in.');
        }
        window.location.assign(authorizationURL);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Unable to start social sign-in.');
      } finally {
        setSocialLoading(false);
      }
    },
    [buildCallbackURI, currentRelativeRoute, socialSignInNavigationTarget],
  );

  useEffect(() => {
    if (showApiKeyDialog) {
      apiKeyRef.current?.focus();
    }
  }, [showApiKeyDialog]);

  const closeApiKeyDialog = useCallback(() => {
    setShowApiKeyDialog(false);
    setApiKeyValue('');
  }, []);

  const handleApiKeyAuthenticate = useCallback(() => {
    if (!apiKeyValue.trim() || !onApiKeySignIn) return;
    onApiKeySignIn(apiKeyValue.trim());
    closeApiKeyDialog();
  }, [apiKeyValue, onApiKeySignIn, closeApiKeyDialog]);

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
          {headingIcon}
          <Heading sx={{ fontSize: 3 }}>{headingText}</Heading>
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

        {(github || google || linkedin) && (
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
            {github && (
              <Button
                block
                leadingVisual={GithubMarkIcon}
                disabled={socialLoading}
                onClick={() => startOAuthSignIn(OAUTH2_PROVIDERS.github)}
                sx={{ mb: 2 }}
              >
                Sign in with GitHub
              </Button>
            )}
            {google && (
              <Button
                block
                leadingVisual={GoogleIcon}
                disabled={socialLoading}
                onClick={() => startOAuthSignIn(OAUTH2_PROVIDERS.google)}
                sx={{ mb: linkedin ? 2 : 0 }}
              >
                Sign in with Google
              </Button>
            )}
            {linkedin && (
              <Button
                block
                leadingVisual={LinkedInGreyIcon}
                disabled={socialLoading}
                onClick={() => startOAuthSignIn(OAUTH2_PROVIDERS.linkedin)}
              >
                Sign in with LinkedIn
              </Button>
            )}
          </>
        )}

        {signUp && (
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
        )}

        {/* API Key */}
        {apiKey && onApiKeySignIn && (
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
                      value={apiKeyValue}
                      onInput={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                        setApiKeyValue(e.target.value)
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
                      disabled={!apiKeyValue.trim()}
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
