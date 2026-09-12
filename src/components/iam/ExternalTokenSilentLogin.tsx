/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { useContext, useEffect } from 'react';
import {
  QueryClient,
  QueryClientContext,
  QueryClientProvider,
} from '@tanstack/react-query';
import { CenteredSpinner } from '../../components/display';
import { useIAMStore } from '../../state';
import { useToast, useIAM } from '../../hooks';

type IExternalTokenSilentLoginProps = {
  message: string;
};

const externalTokenQueryClient = new QueryClient();

const ExternalTokenSilentLoginRoute = (
  props: IExternalTokenSilentLoginProps,
) => {
  const { message } = props;
  const { loginAndNavigate } = useIAM();
  const { logout, checkIAMToken, externalToken } = useIAMStore();
  const { enqueueToast } = useToast();
  useEffect(() => {
    if (externalToken) {
      loginAndNavigate(externalToken, logout, checkIAMToken)
        .catch(error => {
          console.debug('Failed to sign in with the provided token.', error);
          enqueueToast('Failed to sign in with the provided token.', {
            variant: 'error',
          });
        })
        .finally(() => {
          enqueueToast('Runtimes are available.', { variant: 'success' });
        });
    }
  }, [externalToken]);
  return <CenteredSpinner size="small" message={message} />;
};

export const ExternalTokenSilentLogin = (
  props: IExternalTokenSilentLoginProps,
) => {
  const queryClient = useContext(QueryClientContext);

  // No navigation provider needed anymore - auto-detection works without it
  const content = <ExternalTokenSilentLoginRoute {...props} />;
  return queryClient ? (
    content
  ) : (
    <QueryClientProvider client={externalTokenQueryClient}>
      {content}
    </QueryClientProvider>
  );
};

export default ExternalTokenSilentLogin;
