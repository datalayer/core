/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { useLocation } from 'react-router-dom';
import { IAMStateProps } from "./../../hooks";
import { RunRequest } from "./../../hooks";
import { useNavigate } from './../../hooks';
import { useToast } from './../../hooks';
import { useIAMStore } from '../../state';

import {
  systemAdminLogin,
} from './rests';

const getMockResponse = (request: RunRequest) => {
  const { url, method, body } = request;
  if (url.match('/api/iam/v1/login$') && method === "POST") {
    return systemAdminLogin(body!.handle);
  }
}

export const useRunMock = (props: IAMStateProps = { user: undefined, token: undefined }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const iamStore = useIAMStore();
  const { enqueueToast } = useToast();
  const requestRun = async <T = any>(request: RunRequest): Promise<T> => {
    const { loginRoute = '/login' } = props;
    const response = getMockResponse(request);
    console.log('Mock request and response', request, response);
    if (response) {
      return Promise.resolve(response as T);
    }
    //
    const token_ = request.token ?? iamStore.token;
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'Content-Type': 'application/json'
    };
    if (token_) {
      headers['Authorization'] = `Bearer ${token_}`;
    }
    const r = fetch(request.url, {
      method: request.method,
      headers,
      body: request.body ? JSON.stringify(request.body) : undefined,
      credentials: token_ ? 'include' : 'omit'
    }).then((resp) => {
      if (resp.status < 200 || resp.status >= 300) {
        if (resp.status === 401) {
          console.log('Datalayer RUN sent a 401 return code.');
          if (location.pathname !== request.loginRoute) {
            iamStore.logout();
            navigate(request.loginRoute ?? loginRoute);
          }
        } else {
          resp.json().then((r) => {
            const message = r.message;
            const errors = r.errors;
            if (errors) {
              (errors as Array<string>).forEach(error => enqueueToast(`${error}`, { variant: 'error' }));
            } else {
              if (message) {
                enqueueToast(`API Error: ${message}`, { variant: 'error' });
              } else {
                enqueueToast(`API Error`, { variant: 'error' });
              }
            }
            throw new Error(resp.status.toString(), { cause: message });
          });
        }
      }
      return resp.json() as Promise<T>;
    });
    return r;
  }
  return {
    requestRun,
  }
}

export default useRunMock;
