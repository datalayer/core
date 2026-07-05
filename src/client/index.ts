/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Main Datalayer Client with intuitive mixin-based API.
 * Provides unified, flat API for all Datalayer platform services through TypeScript mixins.
 *
 * @module client
 *
 * @example
 * ```typescript
 * const client = new DatalayerClient({
 *   token: 'your-api-token'
 * });
 *
 * const user = await client.whoami();
 * const runtime = await client.createRuntime(config);
 * ```
 */

import {
  DatalayerClientBase,
  type DatalayerClientConfig,
  type ClientHandlers,
} from './base';
import { IAMMixin } from './mixins/IAMMixin';

// Import model types for interface declaration
import type { UserDTO } from './../models/UserDTO';
import type { CreditsDTO } from '../models/CreditsDTO';
import type { HealthCheck } from '../models/HealthCheck';
import type { SecretDTO } from '../models/Secret';
import type {
  CreateSecretRequest,
  UpdateSecretRequest,
} from '../models/Secret';
import type { DatasourceDTO } from '../models/Datasource';
import type {
  CreateDatasourceRequest,
  UpdateDatasourceRequest,
} from '../models/Datasource';

/**
 * Helper function to compose mixins in a more readable way.
 * Applies mixins in the order provided.
 *
 * @param mixins - Array of mixin functions to apply
 * @returns The composed class with all mixins applied
 */
function composeMixins(...mixins: Array<(base: any) => any>) {
  return mixins.reduce((base, mixin) => mixin(base), DatalayerClientBase);
}

// Apply the IAM mixin to the base class. Runtime and content (Spacer) features
// live in @datalayer/agent-runtimes, which composes AgentRuntimesClient on top
// of this core client.
const DatalayerCoreClientWithMixins = composeMixins(IAMMixin);

/**
 * Core Datalayer Client providing access to identity, plans and account
 * services (IAM). Runtime and workspace/content features are provided by
 * `AgentRuntimesClient` in `@datalayer/agent-runtimes`, which extends this
 * class.
 *
 * @example
 * ```typescript
 * const client = new DatalayerCoreClient({
 *   token: 'your-token'
 * });
 *
 * const user = await client.whoami();
 * const credits = await client.getCredits();
 * ```
 */
export class DatalayerCoreClient extends DatalayerCoreClientWithMixins {
  /**
   * Create a DatalayerCoreClient instance.
   *
   * @param config - Client configuration options
   */
  constructor(config: DatalayerClientConfig) {
    super(config);

    // Wrap all methods with handlers if configured
    this.wrapAllMethods();
  }
}

// Export configuration interface and base for extensibility
export type { DatalayerClientConfig, ClientHandlers };
export { DatalayerClientBase };

// Export models for use by consumers
export { UserDTO as User } from './../models/UserDTO';
export type { UserJSON, UserData } from './../models/UserDTO';
export { CreditsDTO as Credits } from '../models/CreditsDTO';
export type {
  CreditsInfo,
  CreditReservation,
  CreditsResponse,
} from '../models/CreditsDTO';
export { HealthCheck } from '../models/HealthCheck';
export type { HealthCheckJSON } from '../models/HealthCheck';
export { SecretDTO as Secret } from './../models/Secret';
export type {
  SecretJSON,
  SecretData,
  CreateSecretRequest,
  UpdateSecretRequest,
  CreateSecretResponse,
  GetSecretResponse,
  ListSecretsResponse,
  UpdateSecretResponse,
  DeleteSecretResponse,
} from './../models/Secret';
export { DatasourceDTO as Datasource } from './../models/Datasource';
export type {
  DatasourceJSON,
  DatasourceData,
  DatasourceType,
  CreateDatasourceRequest,
  UpdateDatasourceRequest,
  CreateDatasourceResponse,
  GetDatasourceResponse,
  ListDatasourcesResponse,
  UpdateDatasourceResponse,
} from './../models/Datasource';

// Export IAM types
export type {
  LoginRequest,
  LoginResponse,
  UserMeResponse,
  MembershipsResponse,
  WhoAmIResponse,
} from '../models/IAM';

// Export Common types
export type { HealthzPingResponse } from '../models/Common';

// Export auth types
export { AuthenticationManager } from './auth/AuthenticationManager';

// Export models interfaces (IAM / plans / account / organization)
export type { IUser, IBaseUser } from '../models/User';
export type { IDatasource, IDatasourceVariant } from '../models/Datasource';
export type { ICredits, ICreditsReservation } from '../models/Credits';
export type { ISurvey } from '../models/Survey';
export type { IBaseTeam, IAnyTeam } from '../models/Team';
export type {
  IOrganization,
  IAnyOrganization,
  IBaseOrganization,
} from '../models/Organization';
export type { IRole } from '../models/Role';
export type { IContact } from '../models/Contact';
export type { IOrganizationMember } from '../models/OrganizationMember';
export type { ISecret, ISecretVariant } from '../models/Secret';
export type { IIAMToken, IIAMTokenVariant } from '../models/IAMToken';
export type { IInvite } from '../models/Invite';
export type { ISchool } from '../models/School';
export type { ITeam } from '../models/Team';
export type { TeamMember } from '../models/TeamMember';
export type {
  IUserOnboarding,
  IClient,
  IOnboardingPosition,
  IOnboardingTours,
  ITour,
  ITourStatus,
} from '../models/UserOnboarding';
export type { IUserSettings } from '../models/UserSettings';
export type { IUsage } from '../models/Usage';
export type { Member } from '../models/Member';
export type { Profile } from '../models/Profile';
export type { IContactEvent } from '../models/ContactEvent';
export type { IContactIAMProvider } from '../models/ContactIAMProvider';
export type { Instructor } from '../models/Instructor';
export type { IStudent } from '../models/Student';
export type { IDean } from '../models/Dean';
export type { IUserEvent } from '../models/UserEvent';
export type { IIAMProviderLinked } from '../models/IAMProviderLinked';

// Export auth types
export type {
  AuthResult,
  TokenValidationResult,
  AuthOptions,
  TokenStorage,
} from './auth/types';

// Export state types
export type {
  IDatalayerCoreConfig,
  IRuntimesConfiguration,
} from '../config/Configuration';
export type { IIAMProviderName } from '../models/IAMProvidersSpecs';

// Export navigation types
export type { NavigationLinkProps } from '../navigation/components';

// Constants
export { ItemTypes } from './constants';
export type { ItemType } from './constants';

// Export authentication module
export * from './auth';

// Interface declaration for TypeScript to recognize mixin methods
export interface DatalayerCoreClient {
  // Base Methods
  getToken(): string | undefined;
  setToken(token: string): Promise<void>;

  // IAM Methods
  whoami(): Promise<UserDTO>;
  login(token: string): Promise<UserDTO>;
  logout(): Promise<void>;
  getCredits(): Promise<CreditsDTO>;
  calculateMaxRuntimeMinutes(
    availableCredits: number,
    burningRate: number,
  ): number;
  calculateCreditsRequired(minutes: number, burningRate: number): number;
  checkIAMHealth(): Promise<HealthCheck>;

  // Secrets Methods (part of IAM)
  createSecret(data: CreateSecretRequest): Promise<SecretDTO>;
  listSecrets(): Promise<SecretDTO[]>;
  getSecret(secretId: string): Promise<SecretDTO>;
  updateSecret(
    secretId: string,
    updates: UpdateSecretRequest,
  ): Promise<SecretDTO>;
  deleteSecret(secretId: string): Promise<void>;

  // Datasources Methods (part of IAM)
  createDatasource(data: CreateDatasourceRequest): Promise<DatasourceDTO>;
  listDatasources(): Promise<DatasourceDTO[]>;
  getDatasource(datasourceId: string): Promise<DatasourceDTO>;
  updateDatasource(
    datasourceId: string,
    updates: UpdateDatasourceRequest,
  ): Promise<DatasourceDTO>;
  deleteDatasource(datasourceId: string): Promise<void>;

  // Utility Methods
  calculateCreditsFromMinutes(minutes: number, burningRate: number): number;
}
