/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { useLocation } from 'react-router-dom';
import { useNavigate } from './useNavigate';
import { useToast } from './useToast';
// import { useRuMnock } from './../mocks';
import { useIAMStore, } from '../state';
import { requestDatalayerAPI } from '../api';
import type { IRequestDatalayerAPIOptions, RunResponseError } from '../api';

export type IDatalayerRequestProps = {
  /**
   * React router login route
   *
   * @default '/login'
   */
  loginRoute?: string;
  /**
   * Notify user through toast on errors.
   *
   * @default true
   */
  notifyOnError?: boolean;
};

export interface DatalayerRequest extends IDatalayerRequestProps, IRequestDatalayerAPIOptions {}

export function useDatalayer(props: IDatalayerRequestProps = {}) {
  const { loginRoute = '/login', notifyOnError = true } = props;
  const location = useLocation();
  /*
  // TODO Fix the conditional hook call.
  const coreStore = useCoreStore();
  // Don't remove === true for the test, otherwise it will always be true???
  if (coreStore.configuration.useMock === true) {
    return useDatalayerMock();
  }
  */
  const { enqueueToast } = useToast();
  const iamStore = useIAMStore();
  const navigate = useNavigate();
  const requestDatalayer = async <T = any>(request: DatalayerRequest): Promise<T> => {
    const {
      loginRoute: loginRoute_ = loginRoute,
      notifyOnError: notifyOnError_ = notifyOnError,
      ...apiRequest
    } = request;
    const token = apiRequest.token ?? iamStore.token;
    return requestDatalayerAPI<T>({
      ...apiRequest,
      token,
    })
    .then(resp => {
      return resp;
    })
    .catch(error => {
      if ((error as RunResponseError).name === 'RunResponseError') {
        const responseError = error as RunResponseError;
        if (responseError.response.status === 401) {
          console.log('Datalayer RUN sent a 401 return code.');
          if (location.pathname !== loginRoute_) {
            iamStore.logout();
            navigate(loginRoute_);
          }
        } else {
          if (notifyOnError_) {
            if (responseError.warnings) {
              responseError.warnings.forEach(warning =>
                enqueueToast(`${warning}`, { variant: 'warning' })
              );
            }
            if (responseError.errors) {
              responseError.errors.forEach(error =>
                enqueueToast(`${error}`, { variant: 'error' })
              );
            }
            if (responseError.message) {
              enqueueToast(`${responseError.message}`, { variant: 'error' });
            } else {
              enqueueToast(`API Error`, { variant: 'error' });
            }
            if (responseError.exceptionMessage) {
              enqueueToast(`${responseError.exceptionMessage}`, { variant: 'error' });
            }
          }
        }
        const response = {
          sucess: false,
          message: responseError.message,
          errors: responseError.errors,
        } as T;
        return response;
      }
      // The error is not an RunResponseError...log it and throw it.
      console.log('Error', error);
      if (notifyOnError_) {
        enqueueToast(`${error.message}`, { variant: 'error' });
      }
      throw error;
    });
  }
  return { requestDatalayer }
}

export default useDatalayer;
