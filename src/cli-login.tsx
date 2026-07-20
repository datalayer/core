/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { useCallback, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Box, Button, Spinner, Text } from '@primer/react';
import { ShieldLockIcon } from '@primer/octicons-react';
import {
  DatalayerThemeProvider,
  themeConfigs,
  createThemeStore,
} from '@datalayer/primer-addons';
import { SvgLinesLogo, SvgUsecasesHero } from '@datalayer/design';
import { AppearanceControlsWithStore } from '@datalayer/primer-addons/lib/components/appearance';
import { ConfettiSuccess } from './components/confetti';
import { formatFriendlyHandle } from './utils/Handles';
import { SignInSimple } from './views/iam/SignInSimple';

const DATALAYER_IAM_USER_KEY = '@datalayer/iam:user';

const DATALAYER_IAM_TOKEN_KEY = '@datalayer/iam:token';

const useCliThemeStore = createThemeStore('datalayer-core-cli-theme-v2', {
  colorMode: 'dark',
  theme: 'matrix',
});

type LoginState = 'checking' | 'signin' | 'success';

const readStoredAuth = (): { token: string; userHandle: string } | null => {
  const token = window.localStorage.getItem(DATALAYER_IAM_TOKEN_KEY) || '';
  const rawUser = window.localStorage.getItem(DATALAYER_IAM_USER_KEY) || '';
  if (!token || !rawUser) {
    return null;
  }
  try {
    const user = JSON.parse(rawUser);
    const userHandle = String(user?.handle || user?.handle_s || '').trim();
    if (!userHandle) {
      return null;
    }
    return { token, userHandle };
  } catch {
    return null;
  }
};

function SignInCLIApp() {
  const [state, setState] = useState<LoginState>('checking');
  const [message, setMessage] = useState('');
  const [closeHelp, setCloseHelp] = useState('');
  const { colorMode, theme: themeVariant } = useCliThemeStore();
  const cfg = themeConfigs[themeVariant];

  const handleCloseWindow = useCallback(() => {
    setCloseHelp('');

    // Browsers allow window.close() only for windows/tabs opened by script.
    window.close();

    setTimeout(() => {
      if (!document.hidden) {
        try {
          // Some browsers require a same-tab self-target before closing.
          window.open('', '_self');
          window.close();
        } catch {
          // Ignore and show manual-close help below.
        }
      }

      if (!document.hidden) {
        setCloseHelp(
          'Authentication is complete. Your browser blocked auto-close for this tab, so you can safely close it manually.',
        );
      }
    }, 150);
  }, []);

  const finalizeCliAuthentication = useCallback(async () => {
    const auth = readStoredAuth();
    if (!auth) {
      setState('signin');
      return;
    }
    const response = await fetch('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_handle: auth.userHandle,
        token: auth.token,
      }),
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || 'Failed to finalize CLI authentication.');
    }
    setMessage(
      `Successfully logged in as ${formatFriendlyHandle(auth.userHandle)}.`,
    );
    setState('success');
  }, []);

  useEffect(() => {
    finalizeCliAuthentication().catch((error: unknown) => {
      setMessage(
        error instanceof Error ? error.message : 'Authentication failed.',
      );
      setState('signin');
    });
  }, [finalizeCliAuthentication]);

  const renderLayout = (content: React.ReactNode) => (
    <DatalayerThemeProvider
      colorMode={colorMode}
      theme={cfg.primerTheme}
      themeStyles={cfg.themeStyles}
    >
      <Box
        sx={{
          minHeight: '100vh',
          bg: 'canvas.default',
          color: 'fg.default',
          position: 'relative',
        }}
      >
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            right: 0,
            zIndex: 20,
            p: 3,
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          <AppearanceControlsWithStore useStore={useCliThemeStore} />
        </Box>
        {content}
      </Box>
    </DatalayerThemeProvider>
  );

  if (state === 'checking') {
    return renderLayout(
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
        }}
      >
        <Spinner />
      </Box>,
    );
  }

  if (state === 'success') {
    return renderLayout(
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          px: 3,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            opacity: 0.45,
            pointerEvents: 'none',
          }}
        >
          <SvgUsecasesHero />
        </Box>
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            zIndex: 2,
          }}
        >
          <ConfettiSuccess />
        </Box>
        <Box
          sx={{
            position: 'relative',
            zIndex: 3,
            textAlign: 'center',
            maxWidth: 560,
            p: 4,
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'border.default',
            bg: 'canvas.default',
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
            <Box sx={{ width: 210 }}>
              <SvgLinesLogo height={32} />
            </Box>
          </Box>
          <Text
            as="h2"
            sx={{ display: 'block', fontSize: 3, fontWeight: 600, mb: 2 }}
          >
            {message || 'Successfully logged in.'}
          </Text>
          <Text as="p" sx={{ color: 'fg.muted', mb: 3 }}>
            You can close this window.
          </Text>
          {closeHelp && (
            <Text as="p" sx={{ color: 'fg.accent', mb: 3 }}>
              {closeHelp}
            </Text>
          )}
          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
            <Button onClick={handleCloseWindow}>Close this window</Button>
          </Box>
        </Box>
      </Box>,
    );
  }

  return renderLayout(
    <SignInSimple
      name="Datalayer CLI"
      description="Sign in to continue in your CLI session."
      icon={<ShieldLockIcon size={24} />}
      github
      google
      linkedin
      signUp
      apiKey={false}
      socialSignInNavigationTarget={null}
      onSignIn={async (token, handle) => {
        window.localStorage.setItem(DATALAYER_IAM_TOKEN_KEY, token);
        window.localStorage.setItem(
          DATALAYER_IAM_USER_KEY,
          JSON.stringify({
            handle,
            displayName: handle,
            uid: '',
            firstName: '',
            lastName: '',
            email: '',
          }),
        );
        try {
          await finalizeCliAuthentication();
        } catch (error) {
          setMessage(
            error instanceof Error ? error.message : 'Authentication failed.',
          );
        }
      }}
    />,
  );
}

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(<SignInCLIApp />);
}
