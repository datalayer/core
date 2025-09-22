/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { ApiClient } from '../../base/client';
import {
  authApi,
  usersApi,
  organizationsApi,
  teamsApi,
  rolesApi,
  tokensApi,
  secretsApi,
  datasourcesApi,
  creditsApi,
} from './api';
import type {
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
} from '../../types/iam';

export class AuthClient {
  constructor(private client: ApiClient) {}

  async login(data: LoginRequest): Promise<LoginResponse> {
    const response = await authApi.login(this.client, data);
    return response.data;
  }

  async logout(): Promise<void> {
    await authApi.logout(this.client);
  }

  async register(data: RegisterRequest): Promise<User> {
    const response = await authApi.register(this.client, data);
    return response.data;
  }

  async refresh(refreshToken: string): Promise<LoginResponse> {
    const response = await authApi.refresh(this.client, refreshToken);
    return response.data;
  }

  async getOAuth2Providers(): Promise<OAuth2Provider[]> {
    const response = await authApi.getOAuth2Providers(this.client);
    return response.data;
  }

  async initiateOAuth2(
    provider: string,
  ): Promise<{ authorization_url: string }> {
    const response = await authApi.initiateOAuth2(this.client, provider);
    return response.data;
  }

  async handleOAuth2Callback(
    provider: string,
    code: string,
    state: string,
  ): Promise<LoginResponse> {
    const response = await authApi.handleOAuth2Callback(
      this.client,
      provider,
      code,
      state,
    );
    return response.data;
  }
}

export class UsersClient {
  constructor(private client: ApiClient) {}

  async me(): Promise<User> {
    const response = await usersApi.me(this.client);
    return response.data.me;
  }

  async updateProfile(data: Partial<User>): Promise<User> {
    const response = await usersApi.updateProfile(this.client, data);
    return response.data;
  }

  async search(
    query: string,
    params?: { limit?: number; offset?: number },
  ): Promise<User[]> {
    const response = await usersApi.search(this.client, query, params);
    return response.data;
  }

  async get(userId: string): Promise<User> {
    const response = await usersApi.get(this.client, userId);
    return response.data;
  }

  async delete(): Promise<void> {
    await usersApi.delete(this.client);
  }

  async enableMFA(): Promise<{ secret: string; qr_code: string }> {
    const response = await usersApi.enableMFA(this.client);
    return response.data;
  }

  async disableMFA(code: string): Promise<void> {
    await usersApi.disableMFA(this.client, code);
  }

  async verifyMFA(code: string): Promise<void> {
    await usersApi.verifyMFA(this.client, code);
  }
}

export class OrganizationsClient {
  constructor(private client: ApiClient) {}

  async create(data: CreateOrganizationRequest): Promise<Organization> {
    const response = await organizationsApi.create(this.client, data);
    return response.data;
  }

  async list(params?: {
    limit?: number;
    offset?: number;
  }): Promise<Organization[]> {
    const response = await organizationsApi.list(this.client, params);
    return response.data.organizations;
  }

  async get(orgId: string): Promise<Organization> {
    const response = await organizationsApi.get(this.client, orgId);
    return response.data;
  }

  async update(
    orgId: string,
    data: Partial<Organization>,
  ): Promise<Organization> {
    const response = await organizationsApi.update(this.client, orgId, data);
    return response.data;
  }

  async delete(orgId: string): Promise<void> {
    await organizationsApi.delete(this.client, orgId);
  }

  async addMember(orgId: string, data: AddMemberRequest): Promise<void> {
    await organizationsApi.addMember(this.client, orgId, data);
  }

  async removeMember(orgId: string, userId: string): Promise<void> {
    await organizationsApi.removeMember(this.client, orgId, userId);
  }

  async listMembers(
    orgId: string,
    params?: { limit?: number; offset?: number },
  ): Promise<User[]> {
    const response = await organizationsApi.listMembers(
      this.client,
      orgId,
      params,
    );
    return response.data;
  }
}

export class TeamsClient {
  constructor(private client: ApiClient) {}

  async create(orgId: string, data: CreateTeamRequest): Promise<Team> {
    const response = await teamsApi.create(this.client, orgId, data);
    return response.data;
  }

  async list(
    orgId: string,
    params?: { limit?: number; offset?: number },
  ): Promise<Team[]> {
    const response = await teamsApi.list(this.client, orgId, params);
    return response.data;
  }

  async get(teamId: string): Promise<Team> {
    const response = await teamsApi.get(this.client, teamId);
    return response.data;
  }

  async update(teamId: string, data: Partial<Team>): Promise<Team> {
    const response = await teamsApi.update(this.client, teamId, data);
    return response.data;
  }

  async delete(teamId: string): Promise<void> {
    await teamsApi.delete(this.client, teamId);
  }

  async addMember(teamId: string, userId: string): Promise<void> {
    await teamsApi.addMember(this.client, teamId, userId);
  }

  async removeMember(teamId: string, userId: string): Promise<void> {
    await teamsApi.removeMember(this.client, teamId, userId);
  }

  async listMembers(
    teamId: string,
    params?: { limit?: number; offset?: number },
  ): Promise<User[]> {
    const response = await teamsApi.listMembers(this.client, teamId, params);
    return response.data;
  }
}

export class RolesClient {
  constructor(private client: ApiClient) {}

  async list(): Promise<Role[]> {
    const response = await rolesApi.list(this.client);
    return response.data;
  }

  async get(roleId: string): Promise<Role> {
    const response = await rolesApi.get(this.client, roleId);
    return response.data;
  }

  async assignToUser(userId: string, roleId: string): Promise<void> {
    await rolesApi.assignToUser(this.client, userId, roleId);
  }

  async removeFromUser(userId: string, roleId: string): Promise<void> {
    await rolesApi.removeFromUser(this.client, userId, roleId);
  }
}

export class TokensClient {
  constructor(private client: ApiClient) {}

  async create(data: CreateTokenRequest): Promise<Token> {
    const response = await tokensApi.create(this.client, data);
    return response.data;
  }

  async list(): Promise<Token[]> {
    const response = await tokensApi.list(this.client);
    return response.data;
  }

  async revoke(tokenId: string): Promise<void> {
    await tokensApi.revoke(this.client, tokenId);
  }
}

export class SecretsClient {
  constructor(private client: ApiClient) {}

  async create(data: CreateSecretRequest): Promise<Secret> {
    const response = await secretsApi.create(this.client, data);
    return response.data;
  }

  async list(params?: { limit?: number; offset?: number }): Promise<Secret[]> {
    const response = await secretsApi.list(this.client, params);
    return response.data;
  }

  async get(secretId: string): Promise<Secret & { value: string }> {
    const response = await secretsApi.get(this.client, secretId);
    return response.data;
  }

  async update(
    secretId: string,
    data: Partial<CreateSecretRequest>,
  ): Promise<Secret> {
    const response = await secretsApi.update(this.client, secretId, data);
    return response.data;
  }

  async delete(secretId: string): Promise<void> {
    await secretsApi.delete(this.client, secretId);
  }
}

export class DatasourcesClient {
  constructor(private client: ApiClient) {}

  async create(data: CreateDatasourceRequest): Promise<Datasource> {
    const response = await datasourcesApi.create(this.client, data);
    return response.data;
  }

  async list(params?: {
    limit?: number;
    offset?: number;
  }): Promise<Datasource[]> {
    const response = await datasourcesApi.list(this.client, params);
    return response.data;
  }

  async get(datasourceId: string): Promise<Datasource> {
    const response = await datasourcesApi.get(this.client, datasourceId);
    return response.data;
  }

  async update(
    datasourceId: string,
    data: Partial<CreateDatasourceRequest>,
  ): Promise<Datasource> {
    const response = await datasourcesApi.update(
      this.client,
      datasourceId,
      data,
    );
    return response.data;
  }

  async delete(datasourceId: string): Promise<void> {
    await datasourcesApi.delete(this.client, datasourceId);
  }

  async test(
    datasourceId: string,
  ): Promise<{ success: boolean; message?: string }> {
    const response = await datasourcesApi.test(this.client, datasourceId);
    return response.data;
  }
}

export class CreditsClient {
  constructor(private client: ApiClient) {}

  async getBalance(): Promise<Credits> {
    const response = await creditsApi.getBalance(this.client);
    return response.data;
  }

  async getUsage(params?: UsageParams): Promise<Usage[]> {
    const response = await creditsApi.getUsage(this.client, params);
    return response.data;
  }

  async getOrganizationBalance(orgId: string): Promise<Credits> {
    const response = await creditsApi.getOrganizationBalance(
      this.client,
      orgId,
    );
    return response.data;
  }

  async getOrganizationUsage(
    orgId: string,
    params?: UsageParams,
  ): Promise<Usage[]> {
    const response = await creditsApi.getOrganizationUsage(
      this.client,
      orgId,
      params,
    );
    return response.data;
  }
}

export class IAMService {
  public readonly auth: AuthClient;
  public readonly users: UsersClient;
  public readonly organizations: OrganizationsClient;
  public readonly teams: TeamsClient;
  public readonly roles: RolesClient;
  public readonly tokens: TokensClient;
  public readonly secrets: SecretsClient;
  public readonly datasources: DatasourcesClient;
  public readonly credits: CreditsClient;

  constructor(client: ApiClient) {
    this.auth = new AuthClient(client);
    this.users = new UsersClient(client);
    this.organizations = new OrganizationsClient(client);
    this.teams = new TeamsClient(client);
    this.roles = new RolesClient(client);
    this.tokens = new TokensClient(client);
    this.secrets = new SecretsClient(client);
    this.datasources = new DatasourcesClient(client);
    this.credits = new CreditsClient(client);
  }
}
