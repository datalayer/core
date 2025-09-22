/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { Poll } from '@lumino/polling';
import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';
import {
  ANONYMOUS_USER_TOKEN,
  ANONYMOUS_USER,
  IUser,
  asUser,
  IIAMProviderName,
  IAMProvidersSpecs,
  IIAMResponseType,
} from '../../models';
import type {
  ICredits,
  ICreditsReservation,
  IRESTBaseResponse,
} from '../../models';
import {
  getStoredToken,
  getStoredUser,
  loadRefreshTokenFromCookie,
  storeToken,
  storeUser,
} from '../storage';
import { requestDatalayerAPI, type RunResponseError } from '../../apiv1';
import { getCookie, setCookie, deleteCookie } from '../../utils';
import { coreStore } from './CoreState';

/**
 * Limit to warn about low credits in milliseconds.
 */
export const RESERVATION_WARNING_TIME_MS = 5 * 60_000;

type IAMProviderAuthorizationURL = string;

export type IIAMState = {
  /**
   * User credits
   */
  credits?: ICredits & { available: number };
  /**
   * User credits reservations
   */
  creditsReservations: ICreditsReservation[];
  /**
   * User token for the external infrastructure
   */
  externalToken?: string;
  /**
   * IAM server base URL.
   */
  iamRunUrl: string;
  /**
   * Mapping of IAM providers and the corresponding Authorization URL.
   */
  iamProvidersAuthorizationURL:
    | Record<IIAMProviderName, IAMProviderAuthorizationURL>
    | object;
  /**
   * User authenticated to Datalayer.
   */
  user?: IUser;
  /**
   * Authentication token
   */
  token?: string;
  /**
   * IAM service version
   */
  version: string;
  /**
   * Flag to indicate if login is in progress
   */
  isLoginInProgress?: boolean;
};

export type IAMState = IIAMState & {
  addIAMProviderAuthorizationURL: (
    provider: IIAMProviderName,
    authorizationURL: IAMProviderAuthorizationURL,
  ) => void;
  login: (token: string) => Promise<void>;
  logout: () => void;
  /**
   * Refresh user credits. It also warn if any
   * reservation is getting close to the end.
   */
  refreshCredits: () => Promise<void>;
  checkIAMToken: (token: string) => Promise<void>;
  setIAMProviderAccessToken: (
    provider: IIAMProviderName,
    accessToken?: string | null,
  ) => void;
  getIAMProviderAccessToken: (
    user: IUser,
    provider: IIAMProviderName,
  ) => string | undefined;
  refreshUser: () => Promise<void>;
  refreshUserByTokenStored: () => Promise<void>;
  refreshUserByToken: (token: string) => Promise<void>;
  setExternalToken: (externalToken: string) => void;
  setVersion: (version: string) => void;
  /**
   * Set the {@link token} and the {@link user}.
   *
   * The user detail will be automatically retrieve
   * to avoid inconsistency.
   *
   * @param token User token
   */
  setLogin: (user: IUser, token: string) => void;
  updateUser: (user: Partial<Omit<IUser, 'handle'>>) => void;
};

export const iamStore = createStore<IAMState>((set, get) => {
  return {
    credits: undefined,
    creditsReservations: [],
    externalToken: loadRefreshTokenFromCookie() ?? undefined,
    user: getStoredUser(),
    token: getStoredToken(),
    iamRunUrl: coreStore.getState().configuration?.iamRunUrl,
    iamProvidersAuthorizationURL: {},
    version: '',
    isLoginInProgress: false,
    addIAMProviderAuthorizationURL: (
      provider: string,
      authorizationURL: IAMProviderAuthorizationURL,
    ) => {
      set(state => ({
        iamProvidersAuthorizationURL: {
          ...state.iamProvidersAuthorizationURL,
          [provider]: authorizationURL,
        },
      }));
    },
    login: async (token: string) => {
      const { refreshUserByToken, iamRunUrl, logout } = get();
      // Set flag to prevent interference from automatic token refresh
      set({ isLoginInProgress: true });
      try {
        const resp = await requestDatalayerAPI<IIAMResponseType>({
          url: `${iamRunUrl}/api/iam/v1/login`,
          method: 'POST',
          body: { token },
        });
        if (resp.success && resp.token) {
          await refreshUserByToken(resp.token);
        } else {
          throw new Error('Invalid Token.');
        }
      } catch (error) {
        console.debug('Failed to login.', error);
        if (
          (error as RunResponseError).name === 'RunResponseError' &&
          (error as RunResponseError).response.status === 401
        ) {
          console.debug('Received 401 error - Logging out.');
          logout();
        }
        throw error;
      } finally {
        set({ isLoginInProgress: false });
      }
    },
    logout: () => {
      storeUser();
      storeToken();
      set({
        credits: undefined,
        creditsReservations: [],
        user: ANONYMOUS_USER,
        token: ANONYMOUS_USER_TOKEN,
        // externalToken: ANONYMOUS_EXTERNAL_TOKEN, // !!! Do not do that... otherwise the automatic login with refresh_token cookie will break!!!
      });
    },
    checkIAMToken: async (token: string) => {
      if (get().token !== token) {
        await get().refreshUserByToken(token);
      }
    },
    setIAMProviderAccessToken: (
      provider: IIAMProviderName,
      accessToken?: string | null,
    ) => {
      const { user } = get();
      if (!user) {
        throw Error(
          'You need to be authenticated to set an Access Token for an IAM provider.',
        );
      }
      const iamProvider = IAMProvidersSpecs.getProvider(provider);
      if (accessToken) {
        setCookie(iamProvider.accessTokenCookieName(user), accessToken);
      } else {
        deleteCookie(iamProvider.accessTokenCookieName(user));
      }
    },
    // TODO passing the user as param for now, could/should be changed? If so, check the profile pages are still working on refresh...
    getIAMProviderAccessToken: (user: IUser, provider: IIAMProviderName) => {
      const iamProvider = IAMProvidersSpecs.getProvider(provider);
      const cookieName = iamProvider.accessTokenCookieName(user);
      const accessToken = getCookie(cookieName);
      return accessToken;
    },
    updateUser: (user: Partial<Omit<IUser, 'handle'>>) =>
      set((state: IAMState) => {
        const updatedState = {
          user: {
            ...state.user,
            ...(user as IUser),
          },
        };
        /*
        if (state.user?.email && !updatedState.user.email) {
          updatedState.user.email = state.user.email;
        }
        */
        return updatedState;
      }),
    refreshCredits: async () => {
      const { externalToken, token, iamRunUrl, logout } = get();
      if (token) {
        try {
          const creditsRaw = await requestDatalayerAPI<
            IRESTBaseResponse & { credits: ICredits } & {
              reservations: ICreditsReservation[];
            }
          >({
            url: `${iamRunUrl}/api/iam/v1/usage/credits`,
            token,
            headers: externalToken
              ? {
                  'X-External-Token': externalToken,
                }
              : undefined,
          });
          const { credits, reservations: creditsReservations = [] } =
            creditsRaw;
          let available =
            credits.quota !== null
              ? credits.quota - credits.credits
              : credits.credits;
          available -= creditsReservations.reduce(
            (consumed, reservation) => consumed + reservation.credits,
            0,
          );
          set({
            credits: { ...credits, available: Math.max(0, available) },
            creditsReservations: creditsReservations,
          });
        } catch (error) {
          console.error('Failed to refresh user credits.', error);
          if (
            (error as RunResponseError).name === 'RunResponseError' &&
            (error as RunResponseError).response.status === 401
          ) {
            console.error('Received 401, logging out.');
            logout();
          }
          throw error;
        }
      } else {
        set({ credits: undefined });
      }
    },
    refreshUser: async () => {
      const { token, refreshUserByToken, logout } = get();
      if (token) {
        await refreshUserByToken(token);
      } else {
        logout();
      }
    },
    refreshUserByTokenStored: async () => {
      const token = getStoredToken();
      if (token) {
        await get().refreshUserByToken(token);
      } else {
        get().logout();
      }
    },
    refreshUserByToken: async (token: string) => {
      const { iamRunUrl, logout, isLoginInProgress } = get();
      try {
        const data = await requestDatalayerAPI({
          url: `${iamRunUrl}/api/iam/v1/whoami`,
          token,
        });
        const user = asUser(data.profile);
        storeUser(user);
        storeToken(token);
        set(() => ({ user, token }));
        // TODO Centralize User Setting Management.
        const aiagentsRunUrl = user.settings?.aiAgentsUrl;
        if (aiagentsRunUrl) {
          coreStore.getState().setConfiguration({
            aiagentsRunUrl,
          });
        }
      } catch (error) {
        if (
          (error as RunResponseError).name === 'RunResponseError' &&
          (error as RunResponseError).response.status === 401
        ) {
          console.debug('Invalid token - Received 401 error.');
        } else {
          console.debug('Failed to fetch user identity.', error);
        }
        // Only logout if we're not in the middle of a login attempt
        if (!isLoginInProgress) {
          logout();
        }
      }
    },
    setExternalToken: (externalToken: string) =>
      set((state: IAMState) => {
        return { externalToken };
      }),
    setLogin: (user: IUser, token: string) =>
      set((state: IAMState) => {
        storeUser(user);
        storeToken(token);
        return {
          user,
          token,
        };
      }),
    setVersion: version => {
      if (version && !get().version) {
        set(state => ({ version }));
      }
    },
  };
});

export function useIAMStore(): IAMState;
export function useIAMStore<T>(selector: (state: IAMState) => T): T;
export function useIAMStore<T>(selector?: (state: IAMState) => T) {
  return useStore(iamStore, selector!);
}

// Poll user credits.
const creditsPoll = new Poll({
  name: '@datalayer/ui:credits-refresh',
  factory: () => iamStore.getState().refreshCredits(),
  auto: false,
  frequency: {
    interval: 60 * 1000,
    backoff: true,
    max: 600 * 1000,
  },
  standby: () => (iamStore.getState().user?.id ? 'when-hidden' : true),
});

// Initialize the IAM store with the stored token if it is valid.
iamStore
  .getState()
  .refreshUserByTokenStored()
  .catch(reason => {
    console.error('Failed to refresh to validate the stored token.', reason);
  })
  .finally(() => {
    const { externalToken, iamRunUrl, checkIAMToken, token } =
      iamStore.getState();
    // If the stored token is invalid and an external token exists, try authenticating with it.
    if (!token && externalToken) {
      console.debug(
        'Can not login with token - Trying with the external token.',
      );
      requestDatalayerAPI<{ token?: string }>({
        url: `${iamRunUrl}/api/iam/v1/login`,
        method: 'POST',
        body: { token: externalToken },
      })
        .then(response => {
          if (response.token) {
            checkIAMToken(response.token);
          }
        })
        .catch(reason => {
          console.debug('Can not login with token.', token, reason);
        });
    }
    if (token) {
      console.log('Logged in with token and external token.');
    } else {
      console.debug(
        'Failed to login with token and no external token available.',
      );
    }

    // Start the credits poll in any case after trying to validate the user token.
    creditsPoll.start();

    // Force a refresh when the user comeback to the application tab
    // Useful for checkout platform redirecting to another tab to add credits.
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden && iamStore.getState().user?.id) {
          creditsPoll.refresh();
        }
      });
    }
  });

// Connect the core store with the iam store.
coreStore.subscribe((state, prevState) => {
  if (
    state.configuration?.iamRunUrl &&
    state.configuration.iamRunUrl !== prevState.configuration?.iamRunUrl
  ) {
    const iamRunUrl = state.configuration.iamRunUrl;
    console.log('Updating iamRunUrl with new value', iamRunUrl);
    iamStore.setState({ iamRunUrl });
    // Check the token is valid with the new server.
    if (iamStore.getState().externalToken) {
      iamStore
        .getState()
        .login(iamStore.getState().externalToken!)
        .catch(reason => {
          console.error(
            'Failed to refresh the user after updating the IAM RUN URL.',
            reason,
          );
        });
    } else {
      iamStore
        .getState()
        .refreshUser()
        .catch(reason => {
          console.error(
            'Failed to refresh the user after updating the IAM server URL.',
            reason,
          );
        });
    }
  }
});

export default useIAMStore;
