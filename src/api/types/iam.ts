/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

export interface User {
  id: string;
  uid?: string;
  user_id?: string;
  username?: string;
  handle?: string;
  email: string;
  first_name?: string;
  last_name?: string;
  display_name?: string;
  avatar_url?: string;
  avatarUrl?: string;
  created_at?: string;
  updated_at?: string;
  roles?: Role[] | string[];
  organizations?: Organization[];
  is_active?: boolean;
  is_verified?: boolean;
  mfa_enabled?: boolean;
}

export interface Organization {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  logo_url?: string;
  created_at: string;
  updated_at?: string;
  owner_id: string;
  members_count?: number;
  teams_count?: number;
}

export interface Team {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  organization_id: string;
  created_at: string;
  updated_at?: string;
  members_count?: number;
}

export interface Role {
  id: string;
  name: string;
  description?: string;
  permissions: Permission[];
  created_at: string;
  updated_at?: string;
}

export interface Permission {
  id: string;
  name: string;
  resource: string;
  action: string;
  description?: string;
}

export interface Token {
  id: string;
  name: string;
  token?: string;
  expires_at?: string;
  created_at: string;
  last_used_at?: string;
  scopes?: string[];
}

export interface Secret {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at?: string;
  tags?: Record<string, string>;
}

export interface Datasource {
  id: string;
  name: string;
  type: 'postgres' | 'mysql' | 'mongodb' | 's3' | 'azure' | 'gcs';
  connection_url?: string;
  config?: Record<string, any>;
  created_at: string;
  updated_at?: string;
  is_active: boolean;
}

export interface Credits {
  total: number;
  used: number;
  remaining: number;
  reset_at?: string;
}

export interface Usage {
  id: string;
  user_id: string;
  organization_id?: string;
  resource_type: string;
  resource_id: string;
  credits_used: number;
  started_at: string;
  ended_at?: string;
  metadata?: Record<string, any>;
}

export interface LoginRequest {
  username?: string;
  email?: string;
  password: string;
  mfa_code?: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in: number;
  user: User;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
  organization_name?: string;
}

export interface OAuth2Provider {
  name: 'github' | 'linkedin' | 'okta' | 'google';
  client_id: string;
  authorization_url: string;
  callback_url: string;
}

export interface CreateOrganizationRequest {
  name: string;
  display_name: string;
  description?: string;
  logo_url?: string;
}

export interface AddMemberRequest {
  user_id?: string;
  email?: string;
  role?: string;
}

export interface CreateTeamRequest {
  name: string;
  display_name: string;
  description?: string;
  members?: string[];
}

export interface CreateTokenRequest {
  name: string;
  expires_in?: number;
  scopes?: string[];
}

export interface CreateSecretRequest {
  name: string;
  value: string;
  description?: string;
  tags?: Record<string, string>;
}

export interface CreateDatasourceRequest {
  name: string;
  type: Datasource['type'];
  connection_url?: string;
  config?: Record<string, any>;
}

export interface UsageParams {
  start_date?: string;
  end_date?: string;
  resource_type?: string;
  organization_id?: string;
  limit?: number;
  offset?: number;
}

// API Response types that match actual server responses
export interface UserMeResponse {
  success: boolean;
  message: string;
  me: User;
}

export interface OrganizationsListResponse {
  success: boolean;
  message: string;
  organizations: Organization[];
}
