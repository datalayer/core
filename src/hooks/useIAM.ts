/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { useEffect, useState } from 'react';
import { useCache } from './useCache';
import {
  coreStore,
  useIAMStore,
  useLayoutStore,
  useOrganizationStore,
  useSpaceStore,
} from '../state';
import {
  asUser,
  IUser,
  ANONYMOUS_USER,
  ANONYMOUS_USER_TOKEN,
  IIAMResponseType,
} from '../models';
import {
  requestDatalayerAPI,
  type RunResponseError,
} from '../api/DatalayerApi';

export type IAMStateProps = {
  user?: IUser;
  token?: string;
  loginRoute?: string;
};

export const useIAM = (
  props: IAMStateProps = { user: undefined, token: undefined },
) => {
  const { token } = props;
  const [iamState, setIAMState] = useState(props);
  const iamStore = useIAMStore();
  const layoutStore = useLayoutStore();
  const organizationStore = useOrganizationStore();
  const spaceStore = useSpaceStore();
  const { clearAllCaches, whoami } = useCache();
  const loginAndNavigate = async (
    token: string,
    logout: () => void,
    refresh: (token: string) => void,
    navigate?: (location: string, e?: any, resetPortals?: boolean) => void,
    homeRoute?: string,
  ): Promise<void> => {
    try {
      const resp = await requestDatalayerAPI<IIAMResponseType>({
        url: `${iamStore.iamRunUrl}/api/iam/v1/login`,
        method: 'POST',
        body: { token },
      });
      if (resp.success && resp.token) {
        if (resp.is_provided_token_external === true) {
          // The provided token is recognized as an external one, so store it as such...
          iamStore.setExternalToken(token);
        }
        const user = asUser(resp.user);
        const responseToken = resp.token;
        setIAMState({ user, token: responseToken });
        refresh(responseToken);
        if (navigate && homeRoute) {
          navigate(homeRoute);
        }
      } else {
        throw new Error('Invalid Token.');
      }
    } catch (error) {
      if (
        (error as RunResponseError).name === 'RunResponseError' &&
        (error as RunResponseError).response.status === 401
      ) {
        console.log('Datalayer IAM has sent a 401 return code.');
        logout();
      }
      throw error;
    }
  };
  const setLogin = (user: IUser, token: string) => {
    iamStore.setLogin(user, token);
    setIAMState({
      user,
      token,
    });
  };
  const logout = () => {
    iamStore.logout();
    layoutStore.reset();
    organizationStore.updateOrganizations([]);
    spaceStore.updateSpaces([]);
    clearAllCaches();
    setIAMState({ user: ANONYMOUS_USER, token: ANONYMOUS_USER_TOKEN });
  };
  useEffect(() => {
    if (token) {
      whoami().then(resp => {
        if (resp.success) {
          const user = asUser(resp.profile);
          setIAMState({ user, token });
          iamStore.setLogin(user, token);
          // TODO centralize user settings management.
          const aiagentsRunUrl = user.settings?.aiAgentsUrl;
          if (aiagentsRunUrl) {
            coreStore.getState().setConfiguration({
              aiagentsRunUrl,
            });
          }
        }
      });
    }
  }, []);
  return {
    user: iamState.user,
    token: iamState.token,
    loginAndNavigate,
    setLogin,
    logout,
  };
};

export default useIAM;
