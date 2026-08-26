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

export interface CloudObjectList {
  items: Array<CloudObjectView>;
  nextCursor?: string | null;
}

export interface CloudObjectView {
  etag?: string | null;
  isDirectory: boolean;
  modifiedAt?: string | null;
  path: string;
  size: number;
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

export interface ConflictResolution {
  use: "local" | "remote" | "keep-both";
}

export interface ConnectionTest {
  detail: string;
  ok: boolean;
  provider: string;
}

export interface ContentAttachment {
  accessMode?: "mount" | "python" | "object-client" | null;
  capabilities?: Array<Capability>;
  cleanupPolicy?: "revoke" | "remove-materialization" | "retain-source";
  createdAt: string;
  delivery: "mount" | "local-bridge" | "materialize" | "client" | "environment";
  error?: AttachmentError | null;
  expiresAt?: string | null;
  fallbackReason?: string | null;
  filesystemPrimitives?: Array<"list" | "stat" | "read" | "write" | "mkdir" | "remove" | "upload" | "download">;
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

export interface ContentsCapabilities {
  countsTruncated: boolean;
  operations: Array<OperationCapability>;
  sourceKinds: Array<SourceKindCapability>;
}

export interface CredentialDiagnostics {
  credentialName?: string | null;
  credentialUid: string | null;
  detail: string;
  referenced: boolean;
  resolvable: boolean;
  sourceUid: string;
}

export interface CredentialRotation {
  credentialUid: string;
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
  originKind: "upload" | "home-folder" | "sandbox-result" | "cloud-storage" | "volume";
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
  objectUid?: string | null;
  path?: string | null;
  sourcePath?: string | null;
  sourceUid?: string | null;
  versionUid?: string | null;
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

export interface DeadLetterList {
  items: Array<OperationView>;
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

export interface HomeFolderFileEntry {
  isDirectory: boolean;
  modifiedAt?: string | null;
  name: string;
  path: string;
  scope?: string | null;
  size: number;
  title?: string | null;
}

export interface HomeFolderFileList {
  items: Array<HomeFolderFileEntry>;
  path: string;
}

export interface HomeFolderQuota {
  limitBytes: number;
  limitObjects: number;
  reservedBytes: number;
  reservedObjects: number;
  usedBytes: number;
  usedObjects: number;
}

export interface ManifestEntry {
  blocks?: Array<string>;
  checksum: string;
  modifiedAt: string;
  path: string;
  size: number;
}

export interface ManifestPayload {
  blockSize?: number;
  entries?: Array<ManifestEntry>;
  tombstones?: Record<string, string>;
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

export interface OperationCapability {
  available: boolean;
  deployed: boolean;
  documentation?: string | null;
  kind?: "operation";
  label: string;
  name: string;
  reason?: string | null;
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

export interface PlanAction {
  blocks?: Array<number>;
  kind: "upload" | "download" | "delete_remote" | "delete_local" | "conflict";
  objectUid?: string | null;
  path: string;
  reason: string;
  versionUid?: string | null;
}

export interface PresignedAccess {
  expiresIn: number;
  operation: "get" | "put";
  path: string;
  url: string;
}

export type PrincipalKind = "user" | "team" | "organization";

export interface QuarantineRequest {
  reason: string;
}

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

export interface SourceKindCapability {
  available: boolean;
  count: number;
  creatable: boolean;
  deployed: boolean;
  documentation?: string | null;
  kind: string;
  label: string;
  name: string;
  reason?: string | null;
}

export interface SourceList {
  items: Array<CatalogSource>;
  nextCursor?: string | null;
}

export type SourceStatus = "pending" | "ready" | "degraded" | "disabled" | "failed";

export type StableErrorCode = "UNAUTHENTICATED" | "FORBIDDEN" | "NOT_FOUND" | "CONFLICT" | "QUOTA_EXCEEDED" | "CAPABILITY_UNAVAILABLE" | "CHECKSUM_MISMATCH" | "PROVIDER_UNAVAILABLE" | "CAPABILITY_REVOKED" | "OPERATION_CANCELLED" | "INTERNAL_ERROR";

export interface SyncConflictList {
  items: Array<SyncConflictView>;
}

export interface SyncConflictView {
  createdAt: string;
  localEntry?: ManifestEntry | null;
  path: string;
  reason: string;
  remoteEntry?: ManifestEntry | null;
  resolution?: "local" | "remote" | "keep-both" | null;
  resolvedAt?: string | null;
  sessionUid: string;
  status: "open" | "resolved";
  uid: string;
}

export interface SyncCreate {
  blockSize?: number;
  conflictPolicy?: "manual" | "newest" | "local" | "remote";
  delete?: boolean;
  direction?: "push" | "pull" | "bidirectional";
  exclusions?: Array<string>;
  localManifest: ManifestPayload;
  remoteUri: string;
  watch?: boolean;
}

export interface SyncPlan {
  actions?: Array<PlanAction>;
}

export interface SyncReconcile {
  localManifest: ManifestPayload;
}

export interface SyncReport {
  applied?: Array<string>;
  failed?: Record<string, string>;
  transferredBytes?: number;
}

export interface SyncSessionList {
  items: Array<SyncSessionView>;
  nextCursor?: string | null;
}

export interface SyncSessionView {
  blockSize: number;
  completedAt?: string | null;
  conflictCount: number;
  conflictPolicy: string;
  createdAt: string;
  delete: boolean;
  deletedFiles: number;
  direction: string;
  downloadedFiles: number;
  errorCode?: string | null;
  errorMessage?: string | null;
  exclusions: Array<string>;
  lastHeartbeatAt?: string | null;
  plan?: SyncPlan | null;
  reconciliations: number;
  remoteUri: string;
  sourceUid: string;
  status: string;
  transferredBytes: number;
  uid: string;
  updatedAt: string;
  uploadedFiles: number;
  watch: boolean;
}

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
