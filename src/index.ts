/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

// Export core components and utilities
export * from './components';
export * from './utils';
export * from './state';
export * from './collaboration';
export * from './services';

// Export navigation before hooks to avoid conflicts
export * from './navigation';
export * from './hooks';

// Export Theme.
export * from './theme';

// Export APIs.
export {
  requestDatalayerAPI,
  RunResponseError,
  NetworkError,
} from './api/DatalayerApi';
export type { IRequestDatalayerAPIOptions } from './api/DatalayerApi';
export { API_BASE_PATHS } from './api/constants';
export * as runtimesApi from './api/runtimes';
export * as iamApi from './api/iam';
export * as spacerApi from './api/spacer';

export {
  // Export client and config types
  DatalayerClient,
  type DatalayerClientConfig,
  type SDKHandlers,
  // Export domain models
  User,
  Runtime,
  Environment,
  Snapshot,
  Space,
  Notebook,
  LexicalDTO,
  Secret,
  Credits,
  Item,
  // Export typed domain interfaces for stable contracts
  type RuntimeJSON,
  type EnvironmentJSON,
  type UserJSON,
  type RuntimeData,
  type EnvironmentData,
  type UserData,
  type SpaceData,
  type SpaceItem,
  type NotebookData,
  type LexicalData,
  type RuntimeSnapshotData,
  type CreditsInfo,
  type CreditReservation,
  // Export request/response types
  type CreateRuntimeRequest,
  type CreateRuntimeResponse,
  type ListRuntimesResponse,
  type ListEnvironmentsResponse,
  type CreateRuntimeSnapshotRequest,
  type CreateRuntimeSnapshotResponse,
  type GetRuntimeSnapshotResponse,
  type ListRuntimeSnapshotsResponse,
  type CreateSpaceRequest,
  type CreateSpaceResponse,
  type SpacesForUserResponse,
  type CollaborationSessionResponse,
  type DeleteSpaceItemResponse,
  type GetSpaceItemResponse,
  type GetSpaceItemsResponse,
  type CreateNotebookRequest,
  type CreateNotebookResponse,
  type GetNotebookResponse,
  type UpdateNotebookRequest,
  type UpdateNotebookResponse,
  type CreateLexicalRequest,
  type CreateLexicalResponse,
  type GetLexicalResponse,
  type UpdateLexicalRequest,
  type UpdateLexicalResponse,
  type CreditsResponse,
  type CreateDatasourceResponse,
  type GetDatasourceResponse,
  type ListDatasourcesResponse,
  type UpdateDatasourceResponse,
  type CreateSecretRequest,
  type CreateSecretResponse,
  type GetSecretResponse,
  type ListSecretsResponse,
  type UpdateSecretRequest,
  type UpdateSecretResponse,
  type SpaceJSON,
  type NotebookJSON,
  type LexicalJSON,
  type RuntimeSnapshotJSON,
  HealthCheck,
  type HealthCheckJSON,
  // Export IAM types
  type LoginRequest,
  type LoginResponse,
  type UserMeResponse,
  type MembershipsResponse,
  type WhoAmIResponse,
  type HealthzPingResponse,
  // Export auth
  AuthenticationManager,
  // Export model interfaces
  type IUser,
  type IBaseUser,
  type ICell,
  type IDatasource,
  type IDatasourceVariant,
  type ICredits,
  type ICreditsReservation,
  type ISpaceItem,
  type ISurvey,
  type ISpace,
  type IBaseSpace,
  type IAnySpace,
  type ISpaceVariant,
  type IBaseTeam,
  type IAnyTeam,
  type IOrganization,
  type IAnyOrganization,
  type IBaseOrganization,
  type IRuntimeModel,
  type IRuntimePod,
  type IRuntimeType,
  type IRuntimeLocation,
  type IRuntimeCapabilities,
  type IRuntimeSnapshot,
  type IDatalayerEnvironment,
  type IResources,
  type ISnippet,
  type IRole,
  type IAssignment,
  type IContact,
  type ICourse,
  type IOrganizationMember,
  type IPage,
  type PageTagName,
  type PageTheme,
  type PageVariant,
  type ISecret,
  type ISecretVariant,
  type SecretData,
  type SecretJSON,
  type DatasourceData,
  type DatasourceJSON,
  type DatasourceType,
  type CreateDatasourceRequest,
  type UpdateDatasourceRequest,
  Datasource,
  type IIAMToken,
  type IIAMTokenVariant,
  type IDocument,
  type IBaseDocument,
  type IEnvironment,
  type IExercise,
  type ICode,
  type IHelp,
  type IInvite,
  type ILesson,
  type INotebook,
  type IBaseNotebook,
  type ISchool,
  type ITeam,
  type TeamMember,
  type IUserOnboarding,
  type IClient,
  type IOnboardingPosition,
  type IOnboardingTours,
  type ITour,
  type ITourStatus,
  type IUserSettings,
  type IDataset,
  type IUsage,
  type IItem,
  type IItemType,
  type Member,
  type Profile,
  type SpaceMember,
  type IContactEvent,
  type IContactIAMProvider,
  type IStudentItem,
  type Instructor,
  type IStudent,
  type IDean,
  type IUserEvent,
  type IIAMProviderLinked,
  type IContent,
  // Export auth types
  type AuthResult,
  type TokenValidationResult,
  type AuthOptions,
  type TokenStorage,
  // Export runtime types
  type IRuntimeOptions,
  type IMultiServiceManager,
  type IRemoteServicesManager,
  type IEnvironmentsManager,
  type IRemoteRuntimesManager,
  // Export navigation types
  type NavigationLinkProps,
  // Export state types
  type IDatalayerCoreConfig,
  type IRuntimesConfiguration,
  type IIAMProviderName,
} from './client';

// Export commonly used functions directly for convenience
export {
  getEnvironments,
  createRuntime,
  getRuntimes,
  deleteRuntime,
  snapshotRuntime,
  getRuntimeSnapshots,
  loadRuntimeSnapshot,
} from './stateful/runtimes/actions';
