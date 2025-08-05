/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { useLocation } from 'react-router-dom';
import { useNavigate } from './useNavigate';
import { useToast } from './useToast';
import { useRunMock } from './../mocks';
import { useIAMStore, useCoreStore } from '../state';
import { requestRunAPI } from '../api';
import type { IRequestRunAPIOptions, RunResponseError } from '../api';

export type IRunRequestProps = {
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

export interface RunRequest extends IRunRequestProps, IRequestRunAPIOptions {}

export function useRun(props: IRunRequestProps = {}) {
  const { loginRoute = '/login', notifyOnError = true } = props;
  const location = useLocation();
  const coreStore = useCoreStore();
  // Don't remove === true for the test, otherwise it will always be true???
  if (coreStore.configuration.useMock === true) {
    return useRunMock();
  }
  const { enqueueToast } = useToast();
  const iamStore = useIAMStore();
  const navigate = useNavigate();
  const requestRun = async <T = any>(request: RunRequest): Promise<T> => {
    const {
      loginRoute: loginRoute_ = loginRoute,
      notifyOnError: notifyOnError_ = notifyOnError,
      ...apiRequest
    } = request;
    const token = apiRequest.token ?? iamStore.token;
    return requestRunAPI<T>({
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
  return {
    requestRun
  }
}

export default useRun;
