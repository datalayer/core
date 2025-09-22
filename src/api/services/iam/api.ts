/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { ApiClient, ApiResponse } from '../../base/client';
import { handleIamApiCall } from '../../utils/error-handling';
import {
  User,
  Organization,
  Team,
  Role,
  Token,
  Secret,
  Datasource,
  Credits,
  Usage,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  OAuth2Provider,
  CreateOrganizationRequest,
  AddMemberRequest,
  CreateTeamRequest,
  CreateTokenRequest,
  CreateSecretRequest,
  CreateDatasourceRequest,
  UsageParams,
  UserMeResponse,
  OrganizationsListResponse,
} from '../../types/iam';

const BASE_PATH = '/api/iam/v1';

export const authApi = {
  login: async (
    client: ApiClient,
    data: LoginRequest,
  ): Promise<ApiResponse<LoginResponse>> => {
    return client.post(`${BASE_PATH}/login`, data);
  },

  logout: async (client: ApiClient): Promise<ApiResponse<void>> => {
    return client.post(`${BASE_PATH}/logout`);
  },

  register: async (
    client: ApiClient,
    data: RegisterRequest,
  ): Promise<ApiResponse<User>> => {
    return client.post(`${BASE_PATH}/register`, data);
  },

  refresh: async (
    client: ApiClient,
    refreshToken: string,
  ): Promise<ApiResponse<LoginResponse>> => {
    return client.post(`${BASE_PATH}/refresh`, { refresh_token: refreshToken });
  },

  getOAuth2Providers: async (
    client: ApiClient,
  ): Promise<ApiResponse<OAuth2Provider[]>> => {
    return client.get(`${BASE_PATH}/oauth2/providers`);
  },

  initiateOAuth2: async (
    client: ApiClient,
    provider: string,
  ): Promise<ApiResponse<{ authorization_url: string }>> => {
    return client.get(`${BASE_PATH}/oauth2/${provider}/authorize`);
  },

  handleOAuth2Callback: async (
    client: ApiClient,
    provider: string,
    code: string,
    state: string,
  ): Promise<ApiResponse<LoginResponse>> => {
    return client.post(`${BASE_PATH}/oauth2/${provider}/callback`, {
      code,
      state,
    });
  },
};

export const usersApi = {
  me: async (client: ApiClient): Promise<ApiResponse<UserMeResponse>> => {
    return handleIamApiCall(
      () => client.get(`${BASE_PATH}/me`),
      'get current user',
    );
  },

  updateProfile: async (
    client: ApiClient,
    data: Partial<User>,
  ): Promise<ApiResponse<User>> => {
    return client.patch(`${BASE_PATH}/me`, data);
  },

  search: async (
    client: ApiClient,
    query: string,
    params?: { limit?: number; offset?: number },
  ): Promise<ApiResponse<User[]>> => {
    return handleIamApiCall(
      () =>
        client.get(`${BASE_PATH}/users/search`, {
          params: { q: query, ...params },
        }),
      'search users',
      [], // Empty array fallback for search results
    );
  },

  get: async (
    client: ApiClient,
    userId: string,
  ): Promise<ApiResponse<User>> => {
    return client.get(`${BASE_PATH}/users/${userId}`);
  },

  delete: async (client: ApiClient): Promise<ApiResponse<void>> => {
    return client.delete(`${BASE_PATH}/me`);
  },

  enableMFA: async (
    client: ApiClient,
  ): Promise<ApiResponse<{ secret: string; qr_code: string }>> => {
    return client.post(`${BASE_PATH}/me/mfa/enable`);
  },

  disableMFA: async (
    client: ApiClient,
    code: string,
  ): Promise<ApiResponse<void>> => {
    return client.post(`${BASE_PATH}/me/mfa/disable`, { code });
  },

  verifyMFA: async (
    client: ApiClient,
    code: string,
  ): Promise<ApiResponse<void>> => {
    return client.post(`${BASE_PATH}/me/mfa/verify`, { code });
  },
};

export const organizationsApi = {
  create: async (
    client: ApiClient,
    data: CreateOrganizationRequest,
  ): Promise<ApiResponse<Organization>> => {
    return client.post(`${BASE_PATH}/organizations`, data);
  },

  list: async (
    client: ApiClient,
    params?: { limit?: number; offset?: number },
  ): Promise<ApiResponse<OrganizationsListResponse>> => {
    return handleIamApiCall(
      () => client.get(`${BASE_PATH}/organizations`, { params }),
      'list organizations',
      { success: true, message: 'Empty list', organizations: [] }, // Fallback structure
    );
  },

  get: async (
    client: ApiClient,
    orgId: string,
  ): Promise<ApiResponse<Organization>> => {
    return client.get(`${BASE_PATH}/organizations/${orgId}`);
  },

  update: async (
    client: ApiClient,
    orgId: string,
    data: Partial<Organization>,
  ): Promise<ApiResponse<Organization>> => {
    return client.patch(`${BASE_PATH}/organizations/${orgId}`, data);
  },

  delete: async (
    client: ApiClient,
    orgId: string,
  ): Promise<ApiResponse<void>> => {
    return client.delete(`${BASE_PATH}/organizations/${orgId}`);
  },

  addMember: async (
    client: ApiClient,
    orgId: string,
    data: AddMemberRequest,
  ): Promise<ApiResponse<void>> => {
    return client.post(`${BASE_PATH}/organizations/${orgId}/members`, data);
  },

  removeMember: async (
    client: ApiClient,
    orgId: string,
    userId: string,
  ): Promise<ApiResponse<void>> => {
    return client.delete(
      `${BASE_PATH}/organizations/${orgId}/members/${userId}`,
    );
  },

  listMembers: async (
    client: ApiClient,
    orgId: string,
    params?: { limit?: number; offset?: number },
  ): Promise<ApiResponse<User[]>> => {
    return client.get(`${BASE_PATH}/organizations/${orgId}/members`, {
      params,
    });
  },
};

export const teamsApi = {
  create: async (
    client: ApiClient,
    orgId: string,
    data: CreateTeamRequest,
  ): Promise<ApiResponse<Team>> => {
    return client.post(`${BASE_PATH}/organizations/${orgId}/teams`, data);
  },

  list: async (
    client: ApiClient,
    orgId: string,
    params?: { limit?: number; offset?: number },
  ): Promise<ApiResponse<Team[]>> => {
    return client.get(`${BASE_PATH}/organizations/${orgId}/teams`, { params });
  },

  get: async (
    client: ApiClient,
    teamId: string,
  ): Promise<ApiResponse<Team>> => {
    return client.get(`${BASE_PATH}/teams/${teamId}`);
  },

  update: async (
    client: ApiClient,
    teamId: string,
    data: Partial<Team>,
  ): Promise<ApiResponse<Team>> => {
    return client.patch(`${BASE_PATH}/teams/${teamId}`, data);
  },

  delete: async (
    client: ApiClient,
    teamId: string,
  ): Promise<ApiResponse<void>> => {
    return client.delete(`${BASE_PATH}/teams/${teamId}`);
  },

  addMember: async (
    client: ApiClient,
    teamId: string,
    userId: string,
  ): Promise<ApiResponse<void>> => {
    return client.post(`${BASE_PATH}/teams/${teamId}/members`, {
      user_id: userId,
    });
  },

  removeMember: async (
    client: ApiClient,
    teamId: string,
    userId: string,
  ): Promise<ApiResponse<void>> => {
    return client.delete(`${BASE_PATH}/teams/${teamId}/members/${userId}`);
  },

  listMembers: async (
    client: ApiClient,
    teamId: string,
    params?: { limit?: number; offset?: number },
  ): Promise<ApiResponse<User[]>> => {
    return client.get(`${BASE_PATH}/teams/${teamId}/members`, { params });
  },
};

export const rolesApi = {
  list: async (client: ApiClient): Promise<ApiResponse<Role[]>> => {
    return client.get(`${BASE_PATH}/roles`);
  },

  get: async (
    client: ApiClient,
    roleId: string,
  ): Promise<ApiResponse<Role>> => {
    return client.get(`${BASE_PATH}/roles/${roleId}`);
  },

  assignToUser: async (
    client: ApiClient,
    userId: string,
    roleId: string,
  ): Promise<ApiResponse<void>> => {
    return client.post(`${BASE_PATH}/users/${userId}/roles`, {
      role_id: roleId,
    });
  },

  removeFromUser: async (
    client: ApiClient,
    userId: string,
    roleId: string,
  ): Promise<ApiResponse<void>> => {
    return client.delete(`${BASE_PATH}/users/${userId}/roles/${roleId}`);
  },
};

export const tokensApi = {
  create: async (
    client: ApiClient,
    data: CreateTokenRequest,
  ): Promise<ApiResponse<Token>> => {
    return client.post(`${BASE_PATH}/tokens`, data);
  },

  list: async (client: ApiClient): Promise<ApiResponse<Token[]>> => {
    return client.get(`${BASE_PATH}/tokens`);
  },

  revoke: async (
    client: ApiClient,
    tokenId: string,
  ): Promise<ApiResponse<void>> => {
    return client.delete(`${BASE_PATH}/tokens/${tokenId}`);
  },
};

export const secretsApi = {
  create: async (
    client: ApiClient,
    data: CreateSecretRequest,
  ): Promise<ApiResponse<Secret>> => {
    return client.post(`${BASE_PATH}/secrets`, data);
  },

  list: async (
    client: ApiClient,
    params?: { limit?: number; offset?: number },
  ): Promise<ApiResponse<Secret[]>> => {
    return client.get(`${BASE_PATH}/secrets`, { params });
  },

  get: async (
    client: ApiClient,
    secretId: string,
  ): Promise<ApiResponse<Secret & { value: string }>> => {
    return client.get(`${BASE_PATH}/secrets/${secretId}`);
  },

  update: async (
    client: ApiClient,
    secretId: string,
    data: Partial<CreateSecretRequest>,
  ): Promise<ApiResponse<Secret>> => {
    return client.patch(`${BASE_PATH}/secrets/${secretId}`, data);
  },

  delete: async (
    client: ApiClient,
    secretId: string,
  ): Promise<ApiResponse<void>> => {
    return client.delete(`${BASE_PATH}/secrets/${secretId}`);
  },
};

export const datasourcesApi = {
  create: async (
    client: ApiClient,
    data: CreateDatasourceRequest,
  ): Promise<ApiResponse<Datasource>> => {
    return client.post(`${BASE_PATH}/datasources`, data);
  },

  list: async (
    client: ApiClient,
    params?: { limit?: number; offset?: number },
  ): Promise<ApiResponse<Datasource[]>> => {
    return client.get(`${BASE_PATH}/datasources`, { params });
  },

  get: async (
    client: ApiClient,
    datasourceId: string,
  ): Promise<ApiResponse<Datasource>> => {
    return client.get(`${BASE_PATH}/datasources/${datasourceId}`);
  },

  update: async (
    client: ApiClient,
    datasourceId: string,
    data: Partial<CreateDatasourceRequest>,
  ): Promise<ApiResponse<Datasource>> => {
    return client.patch(`${BASE_PATH}/datasources/${datasourceId}`, data);
  },

  delete: async (
    client: ApiClient,
    datasourceId: string,
  ): Promise<ApiResponse<void>> => {
    return client.delete(`${BASE_PATH}/datasources/${datasourceId}`);
  },

  test: async (
    client: ApiClient,
    datasourceId: string,
  ): Promise<ApiResponse<{ success: boolean; message?: string }>> => {
    return client.post(`${BASE_PATH}/datasources/${datasourceId}/test`);
  },
};

export const creditsApi = {
  getBalance: async (client: ApiClient): Promise<ApiResponse<Credits>> => {
    return handleIamApiCall(
      () => client.get(`${BASE_PATH}/credits`),
      'get credits balance',
      { total: 0, used: 0, remaining: 0 }, // Safe fallback for credits
    );
  },

  getUsage: async (
    client: ApiClient,
    params?: UsageParams,
  ): Promise<ApiResponse<Usage[]>> => {
    return handleIamApiCall(
      () => client.get(`${BASE_PATH}/credits/usage`, { params }),
      'get credits usage',
      [], // Empty array fallback for usage
    );
  },

  getOrganizationBalance: async (
    client: ApiClient,
    orgId: string,
  ): Promise<ApiResponse<Credits>> => {
    return client.get(`${BASE_PATH}/organizations/${orgId}/credits`);
  },

  getOrganizationUsage: async (
    client: ApiClient,
    orgId: string,
    params?: UsageParams,
  ): Promise<ApiResponse<Usage[]>> => {
    return client.get(`${BASE_PATH}/organizations/${orgId}/credits/usage`, {
      params,
    });
  },
};
