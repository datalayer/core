/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/*
 * Copyright (c) 2021-2024 Datalayer, Inc.
 *
 * Datalayer License
 */

import { useEffect } from 'react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { CenteredSpinner } from '../../components/display';
import { useIAMStore } from '../../state';
import { useToast, useIAM } from '../../hooks';

type IExternalTokenSilentLoginProps = {
  message: string;
}

const ExternalTokenSilentLoginRoute = (props: IExternalTokenSilentLoginProps) => {
  const { message } = props;
  const { loginAndNavigate } = useIAM();
  const { logout, checkIAMToken, externalToken } = useIAMStore();
  const { enqueueToast } = useToast();
  useEffect(() => {
    if (externalToken) {
      loginAndNavigate(externalToken, logout, checkIAMToken)
      .catch(error => {
        console.debug('Failed to login with the provided token.', error);
        enqueueToast('Failed to login with the provided token.', { variant: 'error' });
      })
      .finally(() => {
        enqueueToast('Runtimes are available.', { variant: 'success' });
      });
    }
  }, [externalToken]);
  return (
    <CenteredSpinner size="small" message={message} />
  )
}

export const ExternalTokenSilentLogin = (props: IExternalTokenSilentLoginProps) => {
  return (
    <MemoryRouter initialEntries={["/"]}>
      <Routes>
        <Route path="*" element={<ExternalTokenSilentLoginRoute {...props} />} />
      </Routes>
    </MemoryRouter>
  )
}

export default ExternalTokenSilentLogin;
