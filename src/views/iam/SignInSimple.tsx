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
import { createGlobalStyle } from 'styled-components';
import {
  Box,
  Button,
  FormControl,
  Heading,
  Link,
  Spinner,
  Text,
  Textarea,
  TextInput,
} from '@primer/react';
import {
  EyeIcon,
  EyeClosedIcon,
  KeyIcon,
  MailIcon,
  SignInIcon,
  TelescopeIcon,
} from '@primer/octicons-react';
import {
  GithubMarkIcon,
  GoogleIcon,
  LinkedInGreyIcon,
} from '@datalayer/icons-react';
import { useToast } from '../../hooks';
import { isInsideJupyterLab } from '../../utils/Jupyter';

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

const getIAMUrlFromDocumentConfig = (): string => {
  if (typeof document === 'undefined') {
    return '';
  }
  const configScript = document.getElementById('datalayer-config-data');
  if (!configScript?.textContent) {
    return '';
  }
  try {
    const config = JSON.parse(configScript.textContent);
    return String(config?.iamUrl || '').replace(/\/$/, '');
  } catch {
    return '';
  }
};

const getErrorMessage = (
  error: unknown,
  fallback = 'Unable to start social sign-in.',
): string => {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  if (typeof error === 'string' && error.trim()) {
    return error;
  }
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim()) {
      return message;
    }
  }
  return fallback;
};

// ── Props ────────────────────────────────────────────────────────────

export interface SignInSimpleProps {
  /**
   * Called after a successful login with the JWT and the user handle.
   * Typically used to store credentials in a Zustand / context store.
   */
  onSignIn?: (token: string, handle: string) => void;
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
  /**
   * Disable all interactive controls (useful when embedded in documentation).
   */
  asDoc?: boolean;
  /**
   * Hide header title and description area.
   */
  hideHero?: boolean;
  /**
   * Optional contextual heading shown above auth actions.
   */
  calloutTitle?: string;
  /**
   * Optional contextual description shown below the callout title.
   */
  calloutDescription?: string;
  /**
   * Label for password-auth toggle button.
   */
  passwordToggleLabel?: string;
  /**
   * Sign-up section heading text.
   */
  signUpTitle?: string;
  /**
   * Sign-up section descriptive text.
   */
  signUpDescription?: string;
  /**
   * Sign-up button label.
   */
  signUpLabel?: string;
  /**
   * Sign-up URL opened when clicking the sign-up button.
   */
  signUpHref?: string;
  /**
   * Forgot-password URL for password form.
   */
  forgotPasswordHref?: string;
  /**
   * Forgot-password link label.
   */
  forgotPasswordLabel?: string;
  /**
   * Show forgot-password link in password form.
   */
  showForgotPassword?: boolean;
  /**
   * Top margin for each social button.
   */
  socialButtonMarginTop?: number;
  /**
   * Maximum width (px) for primary action buttons.
   */
  actionButtonMaxWidth?: number;
}

// Repaint the browser autofill highlight (Chrome's blue/yellow) with theme
// tokens so autofilled/disabled inputs keep the Primer surface colors. A
// scoped global style is used because Primer's TextInput inner <input> is not
// reliably reachable via the wrapper `sx` for vendor-prefixed autofill pseudos.
const SignInInputGlobalStyle = createGlobalStyle`
  .signin-input-theme-scope input:-webkit-autofill,
  .signin-input-theme-scope input:-webkit-autofill:hover,
  .signin-input-theme-scope input:-webkit-autofill:focus,
  .signin-input-theme-scope input:-webkit-autofill:active,
  .signin-input-theme-scope input:-webkit-autofill:disabled,
  .signin-input-theme-scope textarea:-webkit-autofill,
  .signin-input-theme-scope textarea:-webkit-autofill:hover,
  .signin-input-theme-scope textarea:-webkit-autofill:focus,
  .signin-input-theme-scope textarea:-webkit-autofill:active,
  .signin-input-theme-scope textarea:-webkit-autofill:disabled {
    -webkit-text-fill-color: var(--fgColor-default) !important;
    caret-color: var(--fgColor-default) !important;
    -webkit-box-shadow: 0 0 0 1000px var(--bgColor-default) inset !important;
    box-shadow: 0 0 0 1000px var(--bgColor-default) inset !important;
    background-color: var(--bgColor-default) !important;
    transition: background-color 9999s ease-in-out 0s !important;
  }

  .signin-input-theme-scope input:disabled,
  .signin-input-theme-scope textarea:disabled {
    -webkit-text-fill-color: var(--fgColor-muted) !important;
    -webkit-box-shadow: 0 0 0 1000px var(--bgColor-default) inset !important;
    box-shadow: 0 0 0 1000px var(--bgColor-default) inset !important;
    background-color: var(--bgColor-default) !important;
    opacity: 1 !important;
  }
`;

// ── Component ────────────────────────────────────────────────────────

export const SignInSimple: React.FC<SignInSimpleProps> = ({
  onSignIn,
  onApiKeySignIn,
  loginUrl: loginUrlProp,
  name,
  title = 'Datalayer OTEL',
  description = 'Sign In to access the observability dashboard.',
  icon,
  leadingIcon = <TelescopeIcon size={24} />,
  github = false,
  google = false,
  linkedin = false,
  apiKey = false,
  signUp = true,
  socialSignInNavigationTarget,
  asDoc = false,
  hideHero = false,
  calloutTitle,
  calloutDescription,
  passwordToggleLabel = 'Sign In with a password',
  signUpTitle = "Don't have an account?",
  signUpDescription = 'Create a free Datalayer account with your email address.',
  signUpLabel = 'Sign up with email',
  signUpHref = 'https://datalayer.ai/signup',
  forgotPasswordHref = '/password',
  forgotPasswordLabel = 'Forgot password?',
  showForgotPassword = true,
  socialButtonMarginTop = 3,
  actionButtonMaxWidth = 320,
}) => {
  const compactDocMode = asDoc && !hideHero;
  const headingText =
    name ?? (asDoc && title === 'Datalayer OTEL' ? 'Datalayer Sign In' : title);
  const headingIcon = icon ?? (asDoc ? <SignInIcon size={24} /> : leadingIcon);

  const loginUrl = useMemo(() => {
    if (loginUrlProp) return loginUrlProp;
    const iamUrl = getIAMUrlFromDocumentConfig();
    return iamUrl ? `${iamUrl}/api/iam/v1/login` : '/api/iam/v1/login';
  }, [loginUrlProp]);
  const [handle, setHandle] = useState('');
  const [password, setPassword] = useState('');
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState(false);
  const [pendingSocialProvider, setPendingSocialProvider] =
    useState<OAuthProviderName | null>(null);
  const [mfaUserUid, setMfaUserUid] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  const [mfaToken, setMfaToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { enqueueToast } = useToast();

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
      if (socialLoading) {
        return;
      }
      setError(null);
      setPendingSocialProvider(providerSpec.name);
      setSocialLoading(true);
      try {
        const iamUrl = getIAMUrlFromDocumentConfig();
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
        const endpointBase = iamUrl || '';
        const endpoint = `${endpointBase}/api/iam/v1/oauth2/authz/url?${params.toString()}`;
        const response = await fetch(endpoint);
        const payload = await response.json();
        const authorizationURL = payload?.autorization_url;
        if (!response.ok || !authorizationURL) {
          throw new Error(
            payload?.message || 'Unable to start social sign-in.',
          );
        }
        window.location.assign(authorizationURL);
      } catch (err: unknown) {
        const message = getErrorMessage(err);
        setError(message);
        enqueueToast(message, { variant: 'error' });
        setPendingSocialProvider(null);
        setSocialLoading(false);
      }
    },
    [
      buildCallbackURI,
      currentRelativeRoute,
      enqueueToast,
      socialLoading,
      socialSignInNavigationTarget,
    ],
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
    window.location.assign(signUpHref);
  }, [signUpHref]);

  const handleForgotPassword = useCallback(() => {
    if (!forgotPasswordHref) {
      return;
    }
    if (
      forgotPasswordHref.startsWith('http://') ||
      forgotPasswordHref.startsWith('https://')
    ) {
      window.open(forgotPasswordHref, '_blank', 'noopener,noreferrer');
      return;
    }
    window.location.assign(forgotPasswordHref);
  }, [forgotPasswordHref]);

  const submit = useCallback(async () => {
    if (asDoc || !handle || !password || loading) return;
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
        const maybeUserUid = String(
          data?.user?.id || data?.user?.uid || '',
        ).trim();
        const hasMfa = Boolean(data?.user?.mfaUrl);
        if (hasMfa && maybeUserUid) {
          setMfaUserUid(maybeUserUid);
          setMfaToken(data.token);
          setError(null);
          return;
        }
        if (onSignIn) {
          onSignIn(data.token, handle);
        }
      } else {
        setError(data.message || 'Invalid username or password.');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [asDoc, handle, password, loading, loginUrl, onSignIn]);

  const submitMfa = useCallback(async () => {
    if (asDoc || loading || !mfaUserUid || !mfaCode.trim() || !mfaToken) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const loginUrlObject = new URL(loginUrl, window.location.origin);
      const iamBaseUrl = loginUrlObject.pathname.endsWith('/api/iam/v1/login')
        ? loginUrlObject.href.replace(/\/api\/iam\/v1\/login$/, '')
        : `${loginUrlObject.origin}`;
      const response = await fetch(
        `${iamBaseUrl}/api/iam/v1/users/${mfaUserUid}/mfa/validate`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userUid: mfaUserUid, code: mfaCode.trim() }),
        },
      );
      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(
          payload?.message || 'Failed to validate your MFA code.',
        );
      }
      if (onSignIn) {
        onSignIn(mfaToken, handle);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      enqueueToast(message, { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [
    asDoc,
    enqueueToast,
    handle,
    loading,
    loginUrl,
    mfaCode,
    mfaToken,
    mfaUserUid,
    onSignIn,
  ]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        if (mfaUserUid) {
          submitMfa();
        } else {
          submit();
        }
      }
    },
    [mfaUserUid, submit, submitMfa],
  );

  const socialDisabled = socialLoading || loading || asDoc;

  return (
    <Box
      className="signin-input-theme-scope"
      sx={{
        display: 'flex',
        alignItems: hideHero || compactDocMode ? 'flex-start' : 'center',
        justifyContent: 'center',
        minHeight: hideHero || compactDocMode ? 'auto' : '100vh',
        bg: hideHero ? 'transparent' : 'canvas.default',
        color: 'fg.default',
        py: hideHero ? 0 : compactDocMode ? 2 : 4,
      }}
    >
      <SignInInputGlobalStyle />
      <Box
        sx={{
          width: '100%',
          maxWidth: 440,
          p: 0,
        }}
      >
        {/* Header / Branding */}
        {!hideHero && (
          <>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                mb: compactDocMode ? 2 : 3,
                justifyContent: 'center',
              }}
            >
              {headingIcon}
              <Heading sx={{ fontSize: 3 }}>{headingText}</Heading>
            </Box>

            <Text
              as="p"
              sx={{
                fontSize: 1,
                color: 'fg.muted',
                mb: compactDocMode ? 2 : 3,
                textAlign: 'center',
              }}
            >
              {description}
            </Text>
          </>
        )}

        {(calloutTitle || calloutDescription) && (
          <Box sx={{ mb: 3, textAlign: 'center' }}>
            {calloutTitle && (
              <Heading as="h3" sx={{ fontSize: 2, mb: 1 }}>
                {calloutTitle}
              </Heading>
            )}
            {calloutDescription && (
              <Text sx={{ color: 'fg.muted', fontSize: 1 }}>
                {calloutDescription}
              </Text>
            )}
          </Box>
        )}

        {/* ---- OAuth buttons ---- */}
        {!mfaUserUid && (github || google || linkedin) && (
          <>
            {github && (
              <Button
                block
                size="large"
                leadingVisual={
                  pendingSocialProvider === 'github'
                    ? () => <Spinner size="small" />
                    : GithubMarkIcon
                }
                disabled={socialDisabled}
                onClick={() => startOAuthSignIn(OAUTH2_PROVIDERS.github)}
                sx={{
                  mt: socialButtonMarginTop,
                  maxWidth: actionButtonMaxWidth,
                  mx: 'auto',
                }}
              >
                Sign In with GitHub
              </Button>
            )}
            {google && (
              <Button
                block
                size="large"
                leadingVisual={
                  pendingSocialProvider === 'google'
                    ? () => <Spinner size="small" />
                    : GoogleIcon
                }
                disabled={socialDisabled}
                onClick={() => startOAuthSignIn(OAUTH2_PROVIDERS.google)}
                sx={{
                  mt: socialButtonMarginTop,
                  maxWidth: actionButtonMaxWidth,
                  mx: 'auto',
                }}
              >
                Sign In with Google
              </Button>
            )}
            {linkedin && (
              <Button
                block
                size="large"
                leadingVisual={
                  pendingSocialProvider === 'linkedin'
                    ? () => <Spinner size="small" />
                    : LinkedInGreyIcon
                }
                disabled={socialDisabled}
                onClick={() => startOAuthSignIn(OAUTH2_PROVIDERS.linkedin)}
                sx={{
                  mt: socialButtonMarginTop,
                  maxWidth: actionButtonMaxWidth,
                  mx: 'auto',
                }}
              >
                Sign In with LinkedIn
              </Button>
            )}
          </>
        )}

        {/* ---- Password toggle ---- */}
        {!mfaUserUid && !showPasswordForm && (
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
            <Button
              leadingVisual={KeyIcon}
              size="large"
              block
              disabled={asDoc || loading || socialLoading}
              onClick={() => setShowPasswordForm(true)}
              sx={{ maxWidth: actionButtonMaxWidth, mx: 'auto' }}
            >
              {passwordToggleLabel}
            </Button>
          </Box>
        )}

        {/* ---- Password form ---- */}
        {!mfaUserUid && showPasswordForm && (
          <Box sx={{ mt: 4 }}>
            <FormControl required sx={{ mb: 3 }}>
              <FormControl.Label>Username</FormControl.Label>
              <TextInput
                autoFocus
                block
                placeholder="Your username"
                value={handle}
                disabled={loading || asDoc}
                onChange={e => setHandle(e.target.value)}
                onKeyDown={handleKeyDown}
              />
            </FormControl>

            <FormControl required sx={{ mb: 3 }}>
              <FormControl.Label>Password</FormControl.Label>
              <TextInput
                block
                placeholder="Your password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                disabled={loading || asDoc}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={handleKeyDown}
                trailingAction={
                  <TextInput.Action
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={loading || asDoc}
                    icon={showPassword ? EyeClosedIcon : EyeIcon}
                    aria-label={
                      showPassword ? 'Hide password' : 'Show password'
                    }
                    sx={{ color: 'var(--fgColor-muted)' }}
                  />
                }
              />
            </FormControl>

            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                mt: 3,
              }}
            >
              <Button
                variant="primary"
                disabled={loading || asDoc || !handle || !password}
                onClick={submit}
              >
                {loading ? 'Signing in…' : 'Sign In'}
              </Button>
              {showForgotPassword && (
                <Link
                  as="button"
                  sx={{
                    fontSize: 1,
                    cursor: asDoc ? 'not-allowed' : 'pointer',
                    background: 'none',
                    border: 'none',
                    opacity: asDoc ? 0.6 : 1,
                  }}
                  onClick={() => {
                    if (asDoc || loading) {
                      return;
                    }
                    handleForgotPassword();
                  }}
                >
                  {forgotPasswordLabel}
                </Link>
              )}
            </Box>
          </Box>
        )}

        {/* ---- MFA form ---- */}
        {mfaUserUid && (
          <>
            <FormControl required sx={{ mb: 3, mt: 2 }}>
              <FormControl.Label>MFA Code</FormControl.Label>
              <TextInput
                autoFocus
                block
                placeholder="Your MFA code"
                value={mfaCode}
                disabled={loading || asDoc}
                onChange={e => setMfaCode(e.target.value)}
                onKeyDown={handleKeyDown}
              />
            </FormControl>
            <Button
              variant="primary"
              block
              disabled={loading || asDoc || !mfaCode.trim()}
              onClick={submitMfa}
              sx={{ maxWidth: actionButtonMaxWidth, mx: 'auto' }}
            >
              {loading ? 'Validating…' : 'Validate MFA Code'}
            </Button>
          </>
        )}

        {/* Error */}
        {error && (
          <Text
            sx={{ color: 'danger.fg', fontSize: 1, mt: 3, display: 'block' }}
          >
            {error}
          </Text>
        )}

        {/* ---- Sign up with email ---- */}
        {signUp && (
          <Box
            sx={{
              mt: 4,
              pt: 4,
              textAlign: 'center',
              borderTop: '1px solid',
              borderColor: 'border.muted',
            }}
          >
            <Heading as="h3" sx={{ fontSize: 2, mb: 2 }}>
              {signUpTitle}
            </Heading>
            <Text as="p" sx={{ color: 'fg.muted', fontSize: 1, mb: 3 }}>
              {signUpDescription}
            </Text>
            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
              <Button
                variant="primary"
                size="large"
                leadingVisual={MailIcon}
                disabled={asDoc || loading}
                onClick={handleSignUp}
              >
                {signUpLabel}
              </Button>
            </Box>
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
              disabled={asDoc || loading || socialLoading}
              onClick={() => setShowApiKeyDialog(true)}
              sx={{ maxWidth: actionButtonMaxWidth, mx: 'auto' }}
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
