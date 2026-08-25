/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/* This file is generated from Datalayer Contents OpenAPI. Do not edit. */

export interface AttachmentCreate {
  cleanupPolicy?: "revoke" | "remove-materialization" | "retain-source";
  delivery?: "mount" | "local-bridge" | "materialize" | "client" | "environment";
  mode?: "ro" | "rw";
  mountPath?: string | null;
  required?: boolean;
  revisionUid?: string | null;
  sandboxProvider: string;
  sandboxUid: string;
  sourceUid: string;
}

export interface AttachmentError {
  code: StableErrorCode;
  message: string;
  retryable: boolean;
}

export interface AttachmentLimits {
  bytes?: number | null;
  queries?: number | null;
  rows?: number | null;
}

export interface AttachmentList {
  items: Array<ContentAttachment>;
}

export interface AttachmentPrepare {
  expiresAt?: string | null;
  tokenAudience?: string | null;
}

export type AttachmentStatus = "requested" | "preparing" | "ready" | "degraded" | "revoking" | "revoked" | "failed";

export interface AttachmentStatusUpdate {
  capabilities?: Array<Capability>;
  error?: AttachmentError | null;
  providerResourceId?: string | null;
  status: "ready" | "degraded" | "failed" | "revoked";
}

export interface CallerResponse {
  roles?: Array<string>;
  uid?: string | number | null;
}

export type Capability = "browse" | "transfer" | "mount" | "query" | "materialize" | "sync" | "local-bridge-mount";

export interface CatalogSource {
  permissions: EffectivePermissions;
  source: ContentSource;
}

export interface CloudStorageConfiguration {
  accessPreference?: "automatic" | "mount" | "python" | "object-client";
  bucketOrContainer: string;
  cachePolicy?: string | null;
  credentialUid?: string | null;
  endpoint?: string | null;
  expectedConsistency?: string | null;
  kind: "cloud-storage";
  mountImplementation?: string | null;
  origin?: "datalayer-shared" | "environment" | "user";
  prefix?: string;
  provider: "s3" | "gcs" | "r2" | "azure-blob" | "s3-compatible" | "datalayer-shared-fs";
  pythonImplementation?: string | null;
  region?: string | null;
}

export interface ContentAttachment {
  capabilities?: Array<Capability>;
  cleanupPolicy?: "revoke" | "remove-materialization" | "retain-source";
  createdAt: string;
  delivery: "mount" | "local-bridge" | "materialize" | "client" | "environment";
  error?: AttachmentError | null;
  expiresAt?: string | null;
  lastSeenAt?: string | null;
  limits?: AttachmentLimits;
  mode: "ro" | "rw";
  mountPath?: string | null;
  providerResourceId?: string | null;
  readyAt?: string | null;
  required?: boolean;
  revisionUid?: string | null;
  revokedAt?: string | null;
  sandboxProvider: string;
  sandboxUid: string;
  sourceUid: string;
  status: AttachmentStatus;
  tokenAudience?: string | null;
  uid: string;
}

export interface ContentAttachmentManifest {
  attachments: Array<ContentAttachment>;
  contractVersion: "v1";
  generatedAt: string;
  sandboxProvider: string;
  sandboxUid: string;
}

export interface ContentObject {
  checksum?: string | null;
  checksumAlgorithm?: string | null;
  createdAt: string;
  createdByUid: string;
  currentVersionUid?: string | null;
  deleted: boolean;
  kind: "file" | "folder";
  mediaType: string;
  path: string;
  size: number;
  sourceUid: string;
  uid: string;
  updatedAt: string;
}

export interface ContentObjectVersion {
  checksum?: string | null;
  checksumAlgorithm?: string | null;
  createdAt: string;
  createdByUid: string;
  deleted: boolean;
  mediaType: string;
  objectUid: string;
  path: string;
  provenance: Record<string, unknown>;
  size: number;
  sourceUid: string;
  uid: string;
}

export interface ContentSource {
  capabilities?: Array<Capability>;
  configuration: FilesConfiguration | DatasetConfiguration | VolumeConfiguration | CloudStorageConfiguration | DatasourceConfiguration | DataServerConfiguration | McpConfiguration | EnvironmentConfiguration;
  contractVersion: "v1";
  createdAt: string;
  credentialUid?: string | null;
  description?: string | null;
  kind: "files" | "dataset" | "volume" | "cloud-storage" | "datasource" | "data-server" | "mcp" | "environment";
  name: string;
  principalKind: PrincipalKind;
  principalUid: string;
  spaceUid?: string | null;
  status: SourceStatus;
  uid: string;
  updatedAt: string;
}

export interface ContentSourceCreate {
  capabilities?: Array<Capability>;
  configuration: FilesConfiguration | DatasetConfiguration | VolumeConfiguration | CloudStorageConfiguration | DatasourceConfiguration | DataServerConfiguration | McpConfiguration | EnvironmentConfiguration;
  credentialUid?: string | null;
  description?: string | null;
  kind: "files" | "dataset" | "volume" | "cloud-storage" | "datasource" | "data-server" | "mcp" | "environment";
  name: string;
  principalKind?: PrincipalKind | null;
  principalUid?: string | null;
  spaceUid?: string | null;
}

export interface ContentSourceUpdate {
  capabilities?: Array<Capability> | null;
  configuration?: FilesConfiguration | DatasetConfiguration | VolumeConfiguration | CloudStorageConfiguration | DatasourceConfiguration | DataServerConfiguration | McpConfiguration | EnvironmentConfiguration | null;
  credentialUid?: string | null;
  description?: string | null;
  name?: string | null;
  status?: SourceStatus | null;
}

export interface DataServerConfiguration {
  connectors?: Array<string>;
  kind: "data-server";
  lastHeartbeatAt?: string | null;
  mtlsIssuer: string;
  policyVersion: string;
  registrationIdentity: string;
}

export interface DatasetConfiguration {
  currentRevisionUid?: string | null;
  kind: "dataset";
  license?: string | null;
  publicationEligible?: boolean;
  schemaNotes?: string | null;
  tags?: Array<string>;
}

export interface DatasetPublication {
  actorUid: string;
  createdAt: string;
  description?: string | null;
  fileCount: number;
  license?: string | null;
  manifestChecksum: string;
  name: string;
  ownerUid: string;
  revisionUid: string;
  sourceUid: string;
  status: string;
  tags?: Array<string>;
  totalSize: number;
  uid: string;
  unpublishedAt?: string | null;
  unpublishedBy?: string | null;
}

export interface DatasetPublicationCreate {
  revisionUid: string;
}

export interface DatasetPublicationList {
  items: Array<DatasetPublication>;
}

export interface DatasetRevision {
  actorUid: string;
  createdAt: string;
  fileCount: number;
  files?: Array<DatasetRevisionFile>;
  manifestChecksum: string;
  originKind: string;
  sourceUid: string;
  status: string;
  totalSize: number;
  uid: string;
}

export interface DatasetRevisionCreate {
  files: Array<DatasetRevisionFileCreate>;
  originKind: "upload" | "user-folder" | "sandbox-result";
}

export interface DatasetRevisionFile {
  checksum: string;
  mediaType: string;
  objectUid: string;
  path: string;
  size: number;
  uid: string;
  versionUid: string;
}

export interface DatasetRevisionFileCreate {
  objectUid: string;
  path?: string | null;
  versionUid: string;
}

export interface DatasetRevisionList {
  items: Array<DatasetRevision>;
}

export interface DatasourceConfiguration {
  allowedOperations?: Array<string>;
  connectorType: string;
  credentialUid?: string | null;
  dataServerUid?: string | null;
  databaseOrProject?: string | null;
  defaultRowLimit?: number | null;
  endpoint?: string | null;
  kind: "datasource";
  networkRoute?: string | null;
}

export interface DependencyStatusResponse {
  configured: boolean;
  detail: string;
  name: string;
  ready: boolean;
  required: boolean;
}

export interface EffectivePermissions {
  effectiveAccessLevel: "view" | "update" | "execute" | null;
  execute: boolean;
  isOwner: boolean;
  update: boolean;
  view: boolean;
}

export interface EnvironmentBuildEntry {
  destinationPath: string;
  sha256: string;
  sizeBytes: number;
  sourceUri: string;
}

export interface EnvironmentConfiguration {
  buildEntries?: Array<EnvironmentBuildEntry>;
  buildUid: string;
  environmentUid: string;
  kind: "environment";
  resolvedProviderPaths?: Record<string, string>;
  runtimeContentUids?: Array<string>;
}

export interface FilesConfiguration {
  kind: "files";
  owningUserUid: string;
  quotaPolicy: string;
  storageBackendId: string;
  versioningPolicy: string;
}

export interface Grant {
  accessLevel: "view" | "update" | "execute";
  principalKind: "user" | "team" | "organization";
  principalUid: string;
  uid?: string | null;
}

export interface HTTPValidationError {
  detail?: Array<ValidationError>;
}

export interface HealthResponse {
  service?: "contents";
  status?: "healthy";
  success?: true;
}

export interface McpConfiguration {
  allowedDomains?: Array<string>;
  allowedResources?: Array<string>;
  allowedTools?: Array<string>;
  approvalPolicy: string;
  credentialUid?: string | null;
  destinationPolicy: string;
  endpoint?: string | null;
  kind: "mcp";
  managedServerUid?: string | null;
  transport: "stdio" | "streamable-http" | "sse";
}

export interface ObjectList {
  items: Array<ContentObject>;
  nextCursor?: string | null;
}

export interface OperationView {
  attempt: number;
  cancellationRequested: boolean;
  completedAt?: string | null;
  createdAt: string;
  errorCode?: string | null;
  errorMessage?: string | null;
  maxAttempts: number;
  operationKind: string;
  result?: Record<string, unknown> | null;
  sourceUid?: string | null;
  status: "pending" | "running" | "succeeded" | "failed" | "cancelling" | "cancelled";
  uid: string;
  updatedAt: string;
}

export interface PingResponse {
  message?: "Pong.";
  success?: true;
  version: string;
}

export type PrincipalKind = "user" | "team" | "organization";

export interface ReadinessResponse {
  dependencies: Array<DependencyStatusResponse>;
  service?: "contents";
  status: "ready" | "not-ready";
  success: boolean;
}

export interface RestoreRequest {
  versionUid: string;
}

export interface ServiceStatusResponse {
  caller: CallerResponse;
  service?: "contents";
  success?: true;
  version: string;
}

export interface Sharing {
  grants?: Array<Grant>;
}

export interface SourceList {
  items: Array<CatalogSource>;
  nextCursor?: string | null;
}

export type SourceStatus = "pending" | "ready" | "degraded" | "disabled" | "failed";

export type StableErrorCode = "UNAUTHENTICATED" | "FORBIDDEN" | "NOT_FOUND" | "CONFLICT" | "QUOTA_EXCEEDED" | "CAPABILITY_UNAVAILABLE" | "CHECKSUM_MISMATCH" | "PROVIDER_UNAVAILABLE" | "CAPABILITY_REVOKED" | "OPERATION_CANCELLED" | "INTERNAL_ERROR";

export interface TransferCreate {
  checksum: string;
  destinationUri: string;
  direction?: "upload";
  mediaType?: string;
  overwrite?: "reject" | "replace" | "new-version";
  size: number;
}

export interface TransferList {
  items: Array<TransferView>;
  nextCursor?: string | null;
}

export interface TransferPart {
  checksum: string;
  number: number;
  size: number;
}

export interface TransferView {
  completedAt?: string | null;
  createdAt: string;
  destinationUri?: string | null;
  direction: string;
  errorCode?: string | null;
  errorMessage?: string | null;
  expectedChecksum: string;
  expectedSize: number;
  mediaType: string;
  objectUid?: string | null;
  overwritePolicy: string;
  partCount: number;
  parts?: Array<TransferPart>;
  path: string;
  receivedBytes: number;
  sourceUid: string;
  sourceUri?: string | null;
  status: string;
  uid: string;
  updatedAt: string;
  versionUid?: string | null;
}

export interface UserFolderQuota {
  limitBytes: number;
  limitObjects: number;
  reservedBytes: number;
  reservedObjects: number;
  usedBytes: number;
  usedObjects: number;
}

export interface ValidationError {
  ctx?: Record<string, unknown>;
  input?: unknown;
  loc: Array<string | number>;
  msg: string;
  type: string;
}

export interface VersionList {
  items: Array<ContentObjectVersion>;
  nextCursor?: string | null;
}

export interface VolumeConfiguration {
  accessModes: Array<"ro" | "rw">;
  backingResourceId?: string | null;
  capacityBytes: number;
  concurrentReaders: boolean;
  concurrentWriters: boolean;
  defaultMountPath: string;
  kind: "volume";
  scope: "user" | "space";
  storageClass?: string | null;
}
