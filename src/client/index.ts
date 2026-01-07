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
  type SDKHandlers,
} from './base';
import { IAMMixin } from './mixins/IAMMixin';
import { RuntimesMixin } from './mixins/RuntimesMixin';
import { SpacerMixin } from './mixins/SpacerMixin';

// Import model types for interface declaration
import type { UserDTO } from './../models/UserDTO';
import type { CreditsDTO } from '../models/CreditsDTO';
import type { EnvironmentDTO } from '../models/EnvironmentDTO';
import type { RuntimeDTO } from '../models/RuntimeDTO';
import type { RuntimeSnapshotDTO } from '../models/RuntimeSnapshotDTO';
import type { SpaceDTO } from '../models/SpaceDTO';
import type { NotebookDTO } from '../models/NotebookDTO';
import type { LexicalDTO } from '../models/LexicalDTO';
import type { HealthCheck } from '../models/HealthCheck';

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

// Apply mixins to the base class using the helper
const DatalayerClientWithMixins = composeMixins(
  IAMMixin,
  RuntimesMixin,
  SpacerMixin,
);

/**
 * Main Datalayer Client providing unified access to all platform services.
 * Uses TypeScript mixins to provide a flat, discoverable API.
 *
 * @example
 * ```typescript
 * const client = new DatalayerClient({
 *   token: 'your-token'
 * });
 *
 * const user = await client.whoami();
 * const runtime = await client.createRuntime({
 *   environment_name: 'python-cpu-env',
 *   credits_limit: 100
 * });
 * ```
 */
export class DatalayerClient extends DatalayerClientWithMixins {
  /**
   * Create a DatalayerClient instance.
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
export type { DatalayerClientConfig, SDKHandlers };
export { DatalayerClientBase };

// Export models for use by consumers
export { UserDTO as User } from './../models/UserDTO';
export type { UserJSON, UserData } from './../models/UserDTO';
export { RuntimeDTO as Runtime } from '../models/RuntimeDTO';
export type {
  RuntimeJSON,
  RuntimeData,
  CreateRuntimeRequest,
  CreateRuntimeResponse,
  ListRuntimesResponse,
} from '../models/RuntimeDTO';
export { EnvironmentDTO as Environment } from '../models/EnvironmentDTO';
export type {
  EnvironmentJSON,
  EnvironmentData,
  ListEnvironmentsResponse,
} from '../models/EnvironmentDTO';
export { RuntimeSnapshotDTO as Snapshot } from '../models/RuntimeSnapshotDTO';
export type {
  RuntimeSnapshotJSON,
  RuntimeSnapshotData,
  CreateRuntimeSnapshotRequest,
  CreateRuntimeSnapshotResponse,
  GetRuntimeSnapshotResponse,
  ListRuntimeSnapshotsResponse,
} from '../models/RuntimeSnapshotDTO';
export { SpaceDTO as Space } from '../models/SpaceDTO';
export type {
  SpaceJSON,
  SpaceData,
  SpaceItem,
  CreateSpaceRequest,
  CreateSpaceResponse,
  SpacesForUserResponse,
  CollaborationSessionResponse,
  DeleteSpaceItemResponse,
  GetSpaceItemResponse,
  GetSpaceItemsResponse,
  CreateNotebookRequest,
  CreateNotebookResponse,
  GetNotebookResponse,
  UpdateNotebookRequest,
  UpdateNotebookResponse,
} from '../models/SpaceDTO';
export { NotebookDTO as Notebook } from '../models/NotebookDTO';
export type { NotebookJSON, NotebookData } from '../models/NotebookDTO';
export { LexicalDTO } from '../models/LexicalDTO';
export type {
  LexicalJSON,
  LexicalData,
  CreateLexicalRequest,
  CreateLexicalResponse,
  GetLexicalResponse,
  UpdateLexicalRequest,
  UpdateLexicalResponse,
} from '../models/LexicalDTO';
export { CreditsDTO as Credits } from '../models/CreditsDTO';
export type {
  CreditsInfo,
  CreditReservation,
  CreditsResponse,
} from '../models/CreditsDTO';
export { ItemDTO as Item } from '../models/ItemDTO';
export { HealthCheck } from '../models/HealthCheck';
export type { HealthCheckJSON } from '../models/HealthCheck';

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

// Export models interfaces
export type { IUser, IBaseUser } from '../models/User';
export type { ICell } from '../models/Cell';
export type { IDatasource, IDatasourceVariant } from '../models/Datasource';
export type { ICredits, ICreditsReservation } from '../models/Credits';
export type { ISpaceItem } from '../models/SpaceItem';
export type { ISurvey } from '../models/Survey';
export type {
  ISpace,
  IBaseSpace,
  IAnySpace,
  ISpaceVariant,
} from '../models/Space';
export type { IBaseTeam, IAnyTeam } from '../models/Team';
export type {
  IOrganization,
  IAnyOrganization,
  IBaseOrganization,
} from '../models/Organization';
export type {
  IRuntimeModel,
  IRuntimePod,
  IRuntimeType,
} from '../models/Runtime';
export type { IRuntimeSnapshot } from '../models/RuntimeSnapshot';
export type {
  IDatalayerEnvironment,
  IResources,
  ISnippet,
} from '../models/Environment';
export type { IRole } from '../models/Role';
export type { IAssignment } from '../models/Assignment';
export type { IContact } from '../models/Contact';
export type { ICourse } from '../models/Course';
export type { IOrganizationMember } from '../models/OrganizationMember';
export type { IPage, PageTheme, PageVariant } from '../models/Page';
export type { PageTagName } from '../models/PageTag';
export type { ISecret, ISecretVariant } from '../models/Secret';
export type { IIAMToken, IIAMTokenVariant } from '../models/IAMToken';
export type { IDocument, IBaseDocument } from '../models/Document';
export type { IEnvironment } from '../models/Environment';
export type { IExercise, ICode, IHelp } from '../models/Exercise';
export type { IInvite } from '../models/Invite';
export type { ILesson } from '../models/Lesson';
export type { INotebook, IBaseNotebook } from '../models/Notebook';
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
export type { IDataset } from '../models/Dataset';
export type { IUsage } from '../models/Usage';
export type { IItem } from '../models/Item';
export type { IItemType } from '../models/ItemType';
export type { Member } from '../models/Member';
export type { Profile } from '../models/Profile';
export type { SpaceMember } from '../models/SpaceMember';
export type { IContactEvent } from '../models/ContactEvent';
export type { IContactIAMProvider } from '../models/ContactIAMProvider';
export type { IStudentItem } from '../models/StudentItem';
export type { Instructor } from '../models/Instructor';
export type { IStudent } from '../models/Student';
export type { IDean } from '../models/Dean';
export type { IUserEvent } from '../models/UserEvent';
export type { IIAMProviderLinked } from '../models/IAMProviderLinked';
export type { IContent } from '../models/Content';

// Export auth types
export type {
  AuthResult,
  TokenValidationResult,
  AuthOptions,
  TokenStorage,
} from './auth/types';

// Export runtime types
export type {
  IRuntimeOptions,
  IMultiServiceManager,
  IRemoteServicesManager,
  IEnvironmentsManager,
  IRemoteRuntimesManager,
} from '../stateful/runtimes/apis';

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
export interface DatalayerClient {
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

  // Runtime Methods
  listEnvironments(): Promise<EnvironmentDTO[]>;
  ensureRuntime(
    environmentName?: string,
    creditsLimit?: number,
    waitForReady?: boolean,
    maxWaitTime?: number,
    reuseExisting?: boolean,
    snapshotId?: string,
  ): Promise<RuntimeDTO>;
  createRuntime(
    environmentName: string,
    type: 'notebook' | 'terminal' | 'job',
    givenName: string,
    minutesLimit: number,
    fromSnapshotId?: string,
  ): Promise<RuntimeDTO>;
  listRuntimes(): Promise<RuntimeDTO[]>;
  getRuntime(podName: string): Promise<RuntimeDTO>;
  deleteRuntime(podName: string): Promise<void>;
  terminateAllRuntimes(): Promise<PromiseSettledResult<void>[]>;
  createSnapshot(
    podName: string,
    name: string,
    description: string,
    stop?: boolean,
  ): Promise<RuntimeSnapshotDTO>;
  listSnapshots(): Promise<RuntimeSnapshotDTO[]>;
  getSnapshot(id: string): Promise<RuntimeSnapshotDTO>;
  deleteSnapshot(id: string): Promise<void>;
  checkRuntimesHealth(): Promise<HealthCheck>;

  // Spacer Methods
  getMySpaces(): Promise<SpaceDTO[]>;
  createSpace(
    name: string,
    description: string,
    variant: string,
    spaceHandle: string,
    organizationId: string,
    seedSpaceId: string,
    isPublic: boolean,
  ): Promise<SpaceDTO>;
  createNotebook(
    spaceId: string,
    name: string,
    description: string,
    file?: File | Blob,
  ): Promise<NotebookDTO>;
  getNotebook(id: string): Promise<NotebookDTO>;
  updateNotebook(
    id: string,
    name?: string,
    description?: string,
  ): Promise<NotebookDTO>;
  createLexical(
    spaceId: string,
    name: string,
    description: string,
    file?: File | Blob,
  ): Promise<LexicalDTO>;
  getLexical(id: string): Promise<LexicalDTO>;
  updateLexical(
    id: string,
    name?: string,
    description?: string,
  ): Promise<LexicalDTO>;
  getSpaceItems(spaceId: string): Promise<(NotebookDTO | LexicalDTO)[]>;
  getSpaceItem(itemId: string): Promise<NotebookDTO | LexicalDTO>;
  deleteSpaceItem(itemId: string): Promise<void>;
  getCollaborationSessionId(documentId: string): Promise<string>;
  getContent(itemId: string): Promise<any>;
  checkSpacerHealth(): Promise<HealthCheck>;
  // Utility Methods
  calculateCreditsFromMinutes(minutes: number, burningRate: number): number;
}
