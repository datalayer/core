/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  cancelSyncSession,
  createAttachment,
  getBridge,
  getBridgeSession,
  isBridgeEnded,
  listBridges,
  revokeBridge,
  type BridgeList,
  type BridgeSession,
  createSource,
  getCapabilities,
  getSyncSession,
  listSyncConflicts,
  listSyncSessions,
  resolveSyncConflict,
  createDatasetRevision,
  createDatasetPublication,
  cancelOperation,
  cancelTransfer,
  deleteHomeFolderObject,
  downloadHomeFolderObject,
  getOperation,
  getAttachmentManifest,
  getDatasetRevision,
  getTransfer,
  getSource,
  getSourceSharing,
  getHomeFolderQuota,
  getHomeFolder,
  listHomeFolderObjects,
  listHomeFolderObjectVersions,
  listSources,
  listAttachments,
  listDatasetRevisions,
  listDatasetPublications,
  listTransfers,
  restoreHomeFolderObject,
  revokeAttachment,
  unpublishDataset,
  archiveSource,
  replaceSourceSharing,
  statHomeFolderObject,
  uploadHomeFolderFile,
  type DownloadedObject,
  type AttachmentCreate,
  type AttachmentList,
  type ContentAttachment,
  type ContentAttachmentManifest,
  type DatasetRevision,
  type DatasetRevisionCreate,
  type DatasetRevisionList,
  type DatasetPublication,
  type DatasetPublicationCreate,
  type DatasetPublicationList,
  type ConditionalCatalogSource,
  type ContentObject,
  type ContentSource,
  type ContentSourceCreate,
  type ContentSourceUpdate,
  type Sharing,
  type ObjectList,
  type OperationView,
  type TransferView,
  type TransferList,
  type UploadProgress,
  type VersionList,
  type HomeFolderQuota,
  type SourceList,
  updateSource,
  listCloudObjects,
  getCredentialDiagnostics,
  testCloudConnection,
  listPublishedDatasets,
  callMcpTool,
  createMcpSession,
  decideMcpApproval,
  discoverMcpTools,
  getMcpCall,
  getMcpSession,
  isMcpCallTerminal,
  listMcpApprovals,
  listMcpCalls,
  listMcpSessions,
  revokeMcpSession,
  testMcpSource,
  type McpApproval,
  type McpApprovalList,
  type McpApprovalStatus,
  type McpCall,
  type McpCallCreate,
  type McpCallList,
  type McpHealth,
  type McpSession,
  type McpSessionCreate,
  type McpSessionList,
  type McpToolManifest,
  cancelDatasourceQuery,
  createDatasourceQuery,
  createDatasourceQueryTicket,
  discoverDatasourceSchema,
  downloadDatasourceQueryResults,
  drainDataserver,
  getDatasourceCapabilities,
  getDatasourceQuery,
  getDataserverStatus,
  isDatasourceQueryTerminal,
  listDatasourceQueries,
  resumeDataserver,
  revokeDataserver,
  rotateDataserverIdentity,
  saveDatasourceQueryAsDataset,
  testDatasource,
  testDataserver,
  type DatasourceCapabilities,
  type DatasourceQuery,
  type DatasourceQueryCreate,
  type DatasourceQueryList,
  type DatasourceQueryResultBytes,
  type DatasourceSchema,
  type DatasourceTest,
  attachRuntimeMounts,
  detachRuntimeMount,
  getRuntimeMounts,
  isRuntimeMountsSettled,
} from '../api/contents';
import type {
  CapabilityTicket,
  CapabilityTicketRequest,
  DataServerConnectivity,
  DataServerStatus,
  IssuedIdentity,
  CloudObjectList,
  ConnectionTest,
  CredentialDiagnostics,
  ContentsCapabilities,
  SyncConflictList,
  SyncSessionList,
  SyncSessionView,
  RuntimeMounts,
} from '../api/contents';
import { useCoreStore, useIAMStore } from '../state';
import { queryKeys } from './useCache';

export type ContentSourceKind = ContentSource['kind'];

export const useDatasetRevisions = (sourceUid?: string) => {
  const token = useIAMStore(state => state.token);
  const contentsUrl = useCoreStore(state => state.configuration.contentsUrl || state.configuration.runtimesUrl);
  return useQuery<DatasetRevisionList>({
    queryKey: queryKeys.contents.datasetRevisions(sourceUid ?? ''),
    queryFn: () => listDatasetRevisions(token ?? '', sourceUid!, contentsUrl),
    enabled: Boolean(token && contentsUrl && sourceUid),
  });
};

export const useDatasetRevision = (sourceUid?: string, revisionUid?: string) => {
  const token = useIAMStore(state => state.token);
  const contentsUrl = useCoreStore(state => state.configuration.contentsUrl || state.configuration.runtimesUrl);
  return useQuery<DatasetRevision>({
    queryKey: queryKeys.contents.datasetRevision(sourceUid ?? '', revisionUid ?? ''),
    queryFn: () => getDatasetRevision(token ?? '', sourceUid!, revisionUid!, contentsUrl),
    enabled: Boolean(token && contentsUrl && sourceUid && revisionUid),
  });
};

export const useCreateDatasetRevision = () => {
  const queryClient = useQueryClient();
  const token = useIAMStore(state => state.token);
  const contentsUrl = useCoreStore(state => state.configuration.contentsUrl || state.configuration.runtimesUrl);
  return useMutation<DatasetRevision, Error,
    { sourceUid: string; request: DatasetRevisionCreate; idempotencyKey: string }>({
    mutationFn: ({ sourceUid, request, idempotencyKey }) =>
      createDatasetRevision(token ?? '', sourceUid, request, idempotencyKey, contentsUrl),
    onSuccess: revision => {
      queryClient.invalidateQueries({ queryKey: queryKeys.contents.datasetRevisions(revision.sourceUid) });
      queryClient.invalidateQueries({ queryKey: queryKeys.contents.source(revision.sourceUid) });
    },
  });
};

export const useDatasetPublications = (sourceUid?: string) => {
  const token = useIAMStore(state => state.token);
  const contentsUrl = useCoreStore(state => state.configuration.contentsUrl || state.configuration.runtimesUrl);
  return useQuery<DatasetPublicationList>({
    queryKey: queryKeys.contents.datasetPublications(sourceUid ?? ''),
    queryFn: () => listDatasetPublications(token ?? '', sourceUid!, contentsUrl),
    enabled: Boolean(token && contentsUrl && sourceUid),
  });
};

export const useCreateDatasetPublication = () => {
  const queryClient = useQueryClient();
  const token = useIAMStore(state => state.token);
  const contentsUrl = useCoreStore(state => state.configuration.contentsUrl || state.configuration.runtimesUrl);
  return useMutation<DatasetPublication, Error,
    { sourceUid: string; request: DatasetPublicationCreate; idempotencyKey: string }>({
    mutationFn: ({ sourceUid, request, idempotencyKey }) =>
      createDatasetPublication(token ?? '', sourceUid, request, idempotencyKey, contentsUrl),
    onSuccess: publication => queryClient.invalidateQueries({
      queryKey: queryKeys.contents.datasetPublications(publication.sourceUid),
    }),
  });
};

export const useUnpublishDataset = () => {
  const queryClient = useQueryClient();
  const token = useIAMStore(state => state.token);
  const contentsUrl = useCoreStore(state => state.configuration.contentsUrl || state.configuration.runtimesUrl);
  return useMutation<DatasetPublication, Error,
    { sourceUid: string; publicationUid: string }>({
    mutationFn: ({ sourceUid, publicationUid }) =>
      unpublishDataset(token ?? '', sourceUid, publicationUid, contentsUrl),
    onSuccess: publication => queryClient.invalidateQueries({
      queryKey: queryKeys.contents.datasetPublications(publication.sourceUid),
    }),
  });
};

export type ContentAttachmentFilters = {
  sandboxUid?: string;
  sourceUid?: string;
  active?: boolean;
};

export const useContentAttachments = (
  filters: ContentAttachmentFilters = {},
) => {
  const token = useIAMStore(state => state.token);
  const contentsUrl = useCoreStore(
    state => state.configuration.contentsUrl || state.configuration.runtimesUrl,
  );
  return useQuery<AttachmentList>({
    queryKey: queryKeys.contents.attachmentList(filters),
    queryFn: () => listAttachments(token ?? '', filters, contentsUrl),
    enabled: Boolean(token && contentsUrl),
    refetchInterval: filters.active ? 2_000 : false,
  });
};

export const useContentAttachmentManifest = (sandboxUid?: string) => {
  const token = useIAMStore(state => state.token);
  const contentsUrl = useCoreStore(
    state => state.configuration.contentsUrl || state.configuration.runtimesUrl,
  );
  return useQuery<ContentAttachmentManifest>({
    queryKey: queryKeys.contents.attachmentManifest(sandboxUid ?? ''),
    queryFn: () => getAttachmentManifest(token ?? '', sandboxUid!, contentsUrl),
    enabled: Boolean(token && contentsUrl && sandboxUid),
    refetchInterval: 2_000,
  });
};

export const useCreateContentAttachment = () => {
  const queryClient = useQueryClient();
  const token = useIAMStore(state => state.token);
  const contentsUrl = useCoreStore(
    state => state.configuration.contentsUrl || state.configuration.runtimesUrl,
  );
  return useMutation<
    ContentAttachment,
    Error,
    { request: AttachmentCreate; idempotencyKey: string }
  >({
    mutationFn: ({ request, idempotencyKey }) =>
      createAttachment(token ?? '', request, idempotencyKey, contentsUrl),
    onSuccess: attachment => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.contents.attachments(),
      });
      queryClient.setQueryData(
        queryKeys.contents.attachmentManifest(attachment.sandboxUid),
        undefined,
      );
    },
  });
};

export const useRevokeContentAttachment = () => {
  const queryClient = useQueryClient();
  const token = useIAMStore(state => state.token);
  const contentsUrl = useCoreStore(
    state => state.configuration.contentsUrl || state.configuration.runtimesUrl,
  );
  return useMutation<ContentAttachment, Error, string>({
    mutationFn: attachmentUid =>
      revokeAttachment(token ?? '', attachmentUid, contentsUrl),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.contents.attachments(),
      }),
  });
};

export type ContentSourceListFilters = {
  kind?: ContentSourceKind;
  spaceUid?: string;
  cursor?: string;
  limit?: number;
};

/** Query the contents visible to the current user. */
export const useContentSources = (
  filters: ContentSourceListFilters = {},
) => {
  const token = useIAMStore(state => state.token);
  const contentsUrl = useCoreStore(
    state => state.configuration.contentsUrl || state.configuration.runtimesUrl,
  );

  return useQuery<SourceList>({
    queryKey: queryKeys.contents.sourceList(filters),
    queryFn: () => listSources(token ?? '', filters, contentsUrl),
    enabled: Boolean(token && contentsUrl),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
};

/**
 * What this deployment offers and what this caller may do with it.
 *
 * The Contents page shows entry points and a create menu; neither can be
 * decided in the client, which knows neither what is running here nor what
 * this principal is entitled to. Cached longer than a listing because it
 * changes when the deployment does, not when a source does.
 */
export const useContentsCapabilities = () => {
  const token = useIAMStore(state => state.token);
  const contentsUrl = useCoreStore(
    state => state.configuration.contentsUrl || state.configuration.runtimesUrl,
  );

  return useQuery<ContentsCapabilities>({
    queryKey: queryKeys.contents.capabilities(),
    queryFn: () => getCapabilities(token ?? '', contentsUrl),
    enabled: Boolean(token && contentsUrl),
    staleTime: 300_000,
  });
};

/** Query one catalog source, including its ETag and effective permissions. */
export const useContentSource = (sourceUid?: string) => {
  const token = useIAMStore(state => state.token);
  const contentsUrl = useCoreStore(
    state => state.configuration.contentsUrl || state.configuration.runtimesUrl,
  );

  return useQuery<ConditionalCatalogSource>({
    queryKey: queryKeys.contents.source(sourceUid ?? ''),
    queryFn: () => getSource(token ?? '', sourceUid!, contentsUrl),
    enabled: Boolean(token && contentsUrl && sourceUid),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
};

export const useCreateContentSource = () => {
  const queryClient = useQueryClient();
  const token = useIAMStore(state => state.token);
  const contentsUrl = useCoreStore(
    state => state.configuration.contentsUrl || state.configuration.runtimesUrl,
  );
  return useMutation<
    ConditionalCatalogSource,
    Error,
    { source: ContentSourceCreate; idempotencyKey: string }
  >({
    mutationFn: ({ source, idempotencyKey }) =>
      createSource(token ?? '', source, idempotencyKey, contentsUrl),
    onSuccess: created => {
      queryClient.invalidateQueries({ queryKey: queryKeys.contents.sources() });
      queryClient.setQueryData(
        queryKeys.contents.source(created.value.source.uid),
        created,
      );
    },
  });
};

export const useUpdateContentSource = () => {
  const queryClient = useQueryClient();
  const token = useIAMStore(state => state.token);
  const contentsUrl = useCoreStore(
    state => state.configuration.contentsUrl || state.configuration.runtimesUrl,
  );
  return useMutation<
    ConditionalCatalogSource,
    Error,
    { sourceUid: string; update: ContentSourceUpdate; etag: string }
  >({
    mutationFn: ({ sourceUid, update, etag }) =>
      updateSource(token ?? '', sourceUid, update, etag, contentsUrl),
    onSuccess: updated => {
      queryClient.invalidateQueries({ queryKey: queryKeys.contents.sources() });
      queryClient.setQueryData(
        queryKeys.contents.source(updated.value.source.uid),
        updated,
      );
    },
  });
};

export const useArchiveContentSource = () => {
  const queryClient = useQueryClient();
  const token = useIAMStore(state => state.token);
  const contentsUrl = useCoreStore(
    state => state.configuration.contentsUrl || state.configuration.runtimesUrl,
  );
  return useMutation<
    ConditionalCatalogSource,
    Error,
    { sourceUid: string; etag: string }
  >({
    mutationFn: ({ sourceUid, etag }) =>
      archiveSource(token ?? '', sourceUid, etag, contentsUrl),
    onSuccess: archived => {
      queryClient.invalidateQueries({ queryKey: queryKeys.contents.sources() });
      queryClient.setQueryData(
        queryKeys.contents.source(archived.value.source.uid),
        archived,
      );
    },
  });
};

export const useContentSourceSharing = (sourceUid?: string) => {
  const token = useIAMStore(state => state.token);
  const contentsUrl = useCoreStore(
    state => state.configuration.contentsUrl || state.configuration.runtimesUrl,
  );
  return useQuery<Sharing>({
    queryKey: queryKeys.contents.sourceSharing(sourceUid ?? ''),
    queryFn: () => getSourceSharing(token ?? '', sourceUid!, contentsUrl),
    enabled: Boolean(token && contentsUrl && sourceUid),
  });
};

export const useReplaceContentSourceSharing = () => {
  const queryClient = useQueryClient();
  const token = useIAMStore(state => state.token);
  const contentsUrl = useCoreStore(
    state => state.configuration.contentsUrl || state.configuration.runtimesUrl,
  );
  return useMutation<
    ConditionalCatalogSource,
    Error,
    { sourceUid: string; sharing: Sharing; etag: string }
  >({
    mutationFn: ({ sourceUid, sharing, etag }) =>
      replaceSourceSharing(token ?? '', sourceUid, sharing, etag, contentsUrl),
    onSuccess: updated => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.contents.sourceSharing(updated.value.source.uid),
      });
      queryClient.setQueryData(
        queryKeys.contents.source(updated.value.source.uid),
        updated,
      );
    },
  });
};

/** Resolve and, on first access, provision the authenticated user's folder. */
export const useHomeFolder = () => {
  const token = useIAMStore(state => state.token);
  const contentsUrl = useCoreStore(
    state => state.configuration.contentsUrl || state.configuration.runtimesUrl,
  );

  return useQuery<ConditionalCatalogSource>({
    queryKey: queryKeys.contents.homeFolder(),
    queryFn: () => getHomeFolder(token ?? '', contentsUrl),
    enabled: Boolean(token && contentsUrl),
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: true,
  });
};

/** Query durable used, reserved and configured Home Folder capacity. */
export const useHomeFolderQuota = () => {
  const token = useIAMStore(state => state.token);
  const contentsUrl = useCoreStore(
    state => state.configuration.contentsUrl || state.configuration.runtimesUrl,
  );
  return useQuery<HomeFolderQuota>({
    queryKey: queryKeys.contents.homeFolderQuota(),
    queryFn: () => getHomeFolderQuota(token ?? '', contentsUrl),
    enabled: Boolean(token && contentsUrl),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
};

export type HomeFolderObjectListFilters = {
  prefix?: string;
  cursor?: string;
  limit?: number;
  order?: 'path' | 'updated';
};

/** Browse the authenticated user's persistent folder. */
export const useHomeFolderObjects = (
  filters: HomeFolderObjectListFilters = {},
) => {
  const token = useIAMStore(state => state.token);
  const contentsUrl = useCoreStore(
    state => state.configuration.contentsUrl || state.configuration.runtimesUrl,
  );
  return useQuery<ObjectList>({
    queryKey: queryKeys.contents.homeFolderObjects(filters),
    queryFn: () => listHomeFolderObjects(token ?? '', filters, contentsUrl),
    enabled: Boolean(token && contentsUrl),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
};

/** Resolve one Home Folder path to its current object metadata. */
export const useHomeFolderObject = (path?: string) => {
  const token = useIAMStore(state => state.token);
  const contentsUrl = useCoreStore(
    state => state.configuration.contentsUrl || state.configuration.runtimesUrl,
  );
  return useQuery<ContentObject>({
    queryKey: queryKeys.contents.homeFolderObject(path ?? ''),
    queryFn: () => statHomeFolderObject(token ?? '', path!, contentsUrl),
    enabled: Boolean(token && contentsUrl && path),
  });
};

/** List immutable versions for a Home Folder object. */
export const useHomeFolderObjectVersions = (
  objectUid?: string,
  options: { cursor?: string; limit?: number } = {},
) => {
  const token = useIAMStore(state => state.token);
  const contentsUrl = useCoreStore(
    state => state.configuration.contentsUrl || state.configuration.runtimesUrl,
  );
  return useQuery<VersionList>({
    queryKey: queryKeys.contents.homeFolderObjectVersions(
      objectUid ?? '',
      options.cursor,
    ),
    queryFn: () =>
      listHomeFolderObjectVersions(
        token ?? '',
        objectUid!,
        options,
        contentsUrl,
      ),
    enabled: Boolean(token && contentsUrl && objectUid),
  });
};

type ObjectMutation = { objectUid: string; idempotencyKey: string };

/** Soft-delete a Home Folder object and invalidate its browse metadata. */
export const useDeleteHomeFolderObject = () => {
  const queryClient = useQueryClient();
  const token = useIAMStore(state => state.token);
  const contentsUrl = useCoreStore(
    state => state.configuration.contentsUrl || state.configuration.runtimesUrl,
  );
  return useMutation<ContentObject, Error, ObjectMutation>({
    mutationFn: ({ objectUid, idempotencyKey }) =>
      deleteHomeFolderObject(
        token ?? '',
        objectUid,
        idempotencyKey,
        contentsUrl,
      ),
    onSuccess: object => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.contents.homeFolder(),
      });
      queryClient.setQueryData(
        queryKeys.contents.homeFolderObject(object.path),
        object,
      );
    },
  });
};

/** Restore an immutable version as the object's new current version. */
export const useRestoreHomeFolderObject = () => {
  const queryClient = useQueryClient();
  const token = useIAMStore(state => state.token);
  const contentsUrl = useCoreStore(
    state => state.configuration.contentsUrl || state.configuration.runtimesUrl,
  );
  return useMutation<
    ContentObject,
    Error,
    ObjectMutation & { versionUid: string }
  >({
    mutationFn: ({ objectUid, versionUid, idempotencyKey }) =>
      restoreHomeFolderObject(
        token ?? '',
        objectUid,
        { versionUid },
        idempotencyKey,
        contentsUrl,
      ),
    onSuccess: object => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.contents.homeFolder(),
      });
      queryClient.setQueryData(
        queryKeys.contents.homeFolderObject(object.path),
        object,
      );
      queryClient.invalidateQueries({
        queryKey: [
          ...queryKeys.contents.homeFolder(),
          'objects',
          object.uid,
          'versions',
        ],
      });
    },
  });
};

const terminalOperationStatuses = new Set(['succeeded', 'failed', 'cancelled']);

/** Query an operation, polling only while it can still change. */
export const useContentOperation = (operationUid?: string) => {
  const token = useIAMStore(state => state.token);
  const contentsUrl = useCoreStore(
    state => state.configuration.contentsUrl || state.configuration.runtimesUrl,
  );

  return useQuery<OperationView>({
    queryKey: queryKeys.contents.operation(operationUid ?? ''),
    queryFn: () => getOperation(token ?? '', operationUid!, contentsUrl),
    enabled: Boolean(token && contentsUrl && operationUid),
    refetchInterval: query =>
      query.state.data && terminalOperationStatuses.has(query.state.data.status)
        ? false
        : 1_000,
    refetchOnWindowFocus: true,
  });
};

/** Request cancellation and refresh the shared operation cache. */
export const useCancelContentOperation = () => {
  const queryClient = useQueryClient();
  const token = useIAMStore(state => state.token);
  const contentsUrl = useCoreStore(
    state => state.configuration.contentsUrl || state.configuration.runtimesUrl,
  );

  return useMutation<OperationView, Error, string>({
    mutationFn: operationUid =>
      cancelOperation(token ?? '', operationUid, contentsUrl),
    onSuccess: operation => {
      queryClient.setQueryData(
        queryKeys.contents.operation(operation.uid),
        operation,
      );
    },
  });
};

/** Poll a resumable transfer so progress survives navigation and reconnects. */
export const useContentTransfer = (transferUid?: string) => {
  const token = useIAMStore(state => state.token);
  const contentsUrl = useCoreStore(
    state => state.configuration.contentsUrl || state.configuration.runtimesUrl,
  );
  return useQuery<TransferView>({
    queryKey: queryKeys.contents.transfer(transferUid ?? ''),
    queryFn: () => getTransfer(token ?? '', transferUid!, contentsUrl),
    enabled: Boolean(token && contentsUrl && transferUid),
    refetchInterval: query =>
      query.state.data && terminalOperationStatuses.has(query.state.data.status)
        ? false
        : 1_000,
    refetchOnWindowFocus: true,
  });
};

/** List the authenticated user's recent or active durable transfers. */
export const useContentTransfers = (
  filters: { active?: boolean; cursor?: string; limit?: number } = {},
) => {
  const token = useIAMStore(state => state.token);
  const contentsUrl = useCoreStore(
    state => state.configuration.contentsUrl || state.configuration.runtimesUrl,
  );
  return useQuery<TransferList>({
    queryKey: queryKeys.contents.transferList(filters),
    queryFn: () => listTransfers(token ?? '', filters, contentsUrl),
    enabled: Boolean(token && contentsUrl),
    refetchInterval: filters.active ? 1_000 : false,
    refetchOnWindowFocus: true,
  });
};

/** Cancel a transfer and refresh its durable progress plus folder listing. */
export const useCancelContentTransfer = () => {
  const queryClient = useQueryClient();
  const token = useIAMStore(state => state.token);
  const contentsUrl = useCoreStore(
    state => state.configuration.contentsUrl || state.configuration.runtimesUrl,
  );
  return useMutation<TransferView, Error, string>({
    mutationFn: transferUid =>
      cancelTransfer(token ?? '', transferUid, contentsUrl),
    onSuccess: transfer => {
      queryClient.setQueryData(
        queryKeys.contents.transfer(transfer.uid),
        transfer,
      );
      queryClient.invalidateQueries({
        queryKey: queryKeys.contents.homeFolder(),
      });
    },
  });
};

/** The authenticated user's synchronization sessions, active ones polled. */
export const useSyncSessions = (
  filters: { active?: boolean; cursor?: string; limit?: number } = {},
) => {
  const token = useIAMStore(state => state.token);
  const contentsUrl = useCoreStore(
    state => state.configuration.contentsUrl || state.configuration.runtimesUrl,
  );
  return useQuery<SyncSessionList>({
    queryKey: queryKeys.contents.syncSessionList(filters),
    queryFn: () => listSyncSessions(token ?? '', filters, contentsUrl),
    enabled: Boolean(token && contentsUrl),
    refetchInterval: filters.active ? 5_000 : false,
    refetchOnWindowFocus: true,
  });
};

/** One session, polled while it is still doing something. */
export const useSyncSession = (sessionUid?: string) => {
  const token = useIAMStore(state => state.token);
  const contentsUrl = useCoreStore(
    state => state.configuration.contentsUrl || state.configuration.runtimesUrl,
  );
  return useQuery<SyncSessionView>({
    queryKey: queryKeys.contents.syncSession(sessionUid ?? ''),
    queryFn: () => getSyncSession(token ?? '', sessionUid!, contentsUrl),
    enabled: Boolean(token && contentsUrl && sessionUid),
    refetchInterval: query =>
      query.state.data && terminalOperationStatuses.has(query.state.data.status)
        ? false
        : 5_000,
  });
};

/** The paths a session left for a person to decide. */
export const useSyncConflicts = (sessionUid?: string, openOnly = true) => {
  const token = useIAMStore(state => state.token);
  const contentsUrl = useCoreStore(
    state => state.configuration.contentsUrl || state.configuration.runtimesUrl,
  );
  return useQuery<SyncConflictList>({
    queryKey: [...queryKeys.contents.syncConflicts(sessionUid ?? ''), openOnly],
    queryFn: () => listSyncConflicts(token ?? '', sessionUid!, { openOnly }, contentsUrl),
    enabled: Boolean(token && contentsUrl && sessionUid),
  });
};

/** Decide a conflict; the client applies the decision on its next pass. */
export const useResolveSyncConflict = () => {
  const queryClient = useQueryClient();
  const token = useIAMStore(state => state.token);
  const contentsUrl = useCoreStore(
    state => state.configuration.contentsUrl || state.configuration.runtimesUrl,
  );
  return useMutation<
    SyncSessionView,
    Error,
    { sessionUid: string; conflictUid: string; use: 'local' | 'remote' | 'keep-both' }
  >({
    mutationFn: ({ sessionUid, conflictUid, use }) =>
      resolveSyncConflict(token ?? '', sessionUid, conflictUid, { use }, contentsUrl),
    onSuccess: session => {
      queryClient.setQueryData(queryKeys.contents.syncSession(session.uid), session);
      queryClient.invalidateQueries({ queryKey: queryKeys.contents.syncConflicts(session.uid) });
      queryClient.invalidateQueries({ queryKey: queryKeys.contents.syncSessions() });
    },
  });
};

/** End a session from the page; the client finds out on its next call. */
export const useCancelSyncSession = () => {
  const queryClient = useQueryClient();
  const token = useIAMStore(state => state.token);
  const contentsUrl = useCoreStore(
    state => state.configuration.contentsUrl || state.configuration.runtimesUrl,
  );
  return useMutation<SyncSessionView, Error, string>({
    mutationFn: sessionUid => cancelSyncSession(token ?? '', sessionUid, contentsUrl),
    onSuccess: session => {
      queryClient.setQueryData(queryKeys.contents.syncSession(session.uid), session);
      queryClient.invalidateQueries({ queryKey: queryKeys.contents.syncSessions() });
    },
  });
};

/**
 * The bridge of one `local-bridge` attachment, polled while it can still
 * change; `null` when none has been opened for it yet.
 */
export const useBridgeSession = (attachmentUid?: string) => {
  const token = useIAMStore(state => state.token);
  const contentsUrl = useCoreStore(
    state => state.configuration.contentsUrl || state.configuration.runtimesUrl,
  );
  return useQuery<BridgeSession | null>({
    queryKey: queryKeys.contents.bridgeSession(attachmentUid ?? ''),
    queryFn: () => getBridgeSession(token ?? '', attachmentUid!, contentsUrl),
    enabled: Boolean(token && contentsUrl && attachmentUid),
    // A bridge changes state on its own — a laptop lid closes — so the page
    // keeps looking until the bridge reaches a state it will not leave.
    refetchInterval: query =>
      query.state.data && isBridgeEnded(query.state.data) ? false : 5_000,
    refetchOnWindowFocus: true,
  });
};

/** The caller's bridge sessions; the active ones polled. */
export const useBridges = (filters: { active?: boolean } = {}) => {
  const token = useIAMStore(state => state.token);
  const contentsUrl = useCoreStore(
    state => state.configuration.contentsUrl || state.configuration.runtimesUrl,
  );
  return useQuery<BridgeList>({
    queryKey: queryKeys.contents.bridgeList(filters),
    queryFn: () => listBridges(token ?? '', filters, contentsUrl),
    enabled: Boolean(token && contentsUrl),
    refetchInterval: filters.active ? 5_000 : false,
    refetchOnWindowFocus: true,
  });
};

/** One session by uid, polled until it has ended. */
export const useBridge = (bridgeUid?: string) => {
  const token = useIAMStore(state => state.token);
  const contentsUrl = useCoreStore(
    state => state.configuration.contentsUrl || state.configuration.runtimesUrl,
  );
  return useQuery<BridgeSession>({
    queryKey: queryKeys.contents.bridge(bridgeUid ?? ''),
    queryFn: () => getBridge(token ?? '', bridgeUid!, contentsUrl),
    enabled: Boolean(token && contentsUrl && bridgeUid),
    refetchInterval: query =>
      query.state.data && isBridgeEnded(query.state.data) ? false : 5_000,
  });
};

/**
 * Revoke a bridge by uid. The attachment goes `revoking` with it on the
 * service, so every attachment view refreshes as well as the bridge ones.
 */
export const useRevokeBridge = () => {
  const queryClient = useQueryClient();
  const token = useIAMStore(state => state.token);
  const contentsUrl = useCoreStore(
    state => state.configuration.contentsUrl || state.configuration.runtimesUrl,
  );
  return useMutation<BridgeSession, Error, string>({
    mutationFn: bridgeUid => revokeBridge(token ?? '', bridgeUid, contentsUrl),
    onSuccess: bridge => {
      queryClient.setQueryData(queryKeys.contents.bridge(bridge.uid), bridge);
      queryClient.setQueryData(queryKeys.contents.bridgeSession(bridge.attachmentUid), bridge);
      queryClient.invalidateQueries({ queryKey: queryKeys.contents.bridges() });
      queryClient.invalidateQueries({ queryKey: queryKeys.contents.attachments() });
    },
  });
};

/** Upload a browser file with resumable verified parts and durable progress. */
export const useUploadHomeFolderFile = () => {
  const queryClient = useQueryClient();
  const token = useIAMStore(state => state.token);
  const contentsUrl = useCoreStore(
    state => state.configuration.contentsUrl || state.configuration.runtimesUrl,
  );
  return useMutation<
    TransferView,
    Error,
    {
      path: string;
      content: Blob | Uint8Array | ArrayBuffer;
      idempotencyKey: string;
      mediaType?: string;
      overwrite?: 'reject' | 'replace' | 'new-version';
      onProgress?: (progress: UploadProgress) => void;
    }
  >({
    mutationFn: ({ path, content, ...options }) =>
      uploadHomeFolderFile(token ?? '', path, content, options, contentsUrl),
    onSuccess: transfer => {
      queryClient.setQueryData(
        queryKeys.contents.transfer(transfer.uid),
        transfer,
      );
      queryClient.invalidateQueries({
        queryKey: queryKeys.contents.homeFolder(),
      });
    },
  });
};

/** Fetch a complete object version or a resumable HTTP byte range. */
export const useDownloadHomeFolderObject = () => {
  const token = useIAMStore(state => state.token);
  const contentsUrl = useCoreStore(
    state => state.configuration.contentsUrl || state.configuration.runtimesUrl,
  );
  return useMutation<
    DownloadedObject,
    Error,
    { objectUid: string; versionUid?: string; range?: string }
  >({
    mutationFn: ({ objectUid, ...options }) =>
      downloadHomeFolderObject(token ?? '', objectUid, options, contentsUrl),
  });
};

/** One page of a Cloud Storage source under a prefix. */
export const useCloudObjects = (
  sourceUid?: string,
  options: { prefix?: string; cursor?: string } = {},
) => {
  const token = useIAMStore(state => state.token);
  const contentsUrl = useCoreStore(
    state => state.configuration.contentsUrl || state.configuration.runtimesUrl,
  );

  return useQuery<CloudObjectList>({
    queryKey: queryKeys.contents.cloudObjects(
      sourceUid ?? '',
      options.prefix,
      options.cursor,
    ),
    queryFn: () => listCloudObjects(token ?? '', sourceUid!, options, contentsUrl),
    enabled: Boolean(token && contentsUrl && sourceUid),
    staleTime: 30_000,
  });
};

/** Whether the source's credential is referenced and resolvable — never its value. */
export const useCredentialDiagnostics = (sourceUid?: string) => {
  const token = useIAMStore(state => state.token);
  const contentsUrl = useCoreStore(
    state => state.configuration.contentsUrl || state.configuration.runtimesUrl,
  );

  return useQuery<CredentialDiagnostics>({
    queryKey: queryKeys.contents.credentialDiagnostics(sourceUid ?? ''),
    queryFn: () => getCredentialDiagnostics(token ?? '', sourceUid!, contentsUrl),
    enabled: Boolean(token && contentsUrl && sourceUid),
    staleTime: 60_000,
  });
};

/** Try the bucket with the credential attached; the answer is a verdict. */
export const useTestCloudConnection = () => {
  const token = useIAMStore(state => state.token);
  const contentsUrl = useCoreStore(
    state => state.configuration.contentsUrl || state.configuration.runtimesUrl,
  );

  return useMutation<ConnectionTest, Error, string>({
    mutationFn: sourceUid => testCloudConnection(token ?? '', sourceUid, contentsUrl),
  });
};

/** Every Dataset publication, for the Library. */
export const usePublishedDatasets = () => {
  const token = useIAMStore(state => state.token);
  const contentsUrl = useCoreStore(
    state => state.configuration.contentsUrl || state.configuration.runtimesUrl,
  );

  return useQuery<DatasetPublicationList>({
    queryKey: queryKeys.contents.publishedDatasets(),
    queryFn: () => listPublishedDatasets(token ?? '', contentsUrl),
    enabled: Boolean(token && contentsUrl),
    staleTime: 30_000,
  });
};

// -- MCP ----------------------------------------------------------------
//
// An MCP source is a server somebody connected. None of these hooks talk to
// it: Contents does, through a session it opens for the caller. The browser
// sees tool definitions, call records and approvals.

/** The tools and resources the server behind a source offers. */
export const useMcpTools = (sourceUid?: string) => {
  const token = useIAMStore(state => state.token);
  const contentsUrl = useCoreStore(
    state => state.configuration.contentsUrl || state.configuration.runtimesUrl,
  );

  return useQuery<McpToolManifest>({
    queryKey: queryKeys.contents.mcpTools(sourceUid ?? ''),
    queryFn: () => discoverMcpTools(token ?? '', sourceUid!, contentsUrl),
    enabled: Boolean(token && contentsUrl && sourceUid),
    staleTime: 300_000,
  });
};

/** Try the server through the source; the answer is a verdict. */
export const useMcpHealth = () => {
  const token = useIAMStore(state => state.token);
  const contentsUrl = useCoreStore(
    state => state.configuration.contentsUrl || state.configuration.runtimesUrl,
  );

  return useMutation<McpHealth, Error, string>({
    mutationFn: sourceUid => testMcpSource(token ?? '', sourceUid, contentsUrl),
  });
};

export type McpSessionListFilters = { sourceUid?: string; active?: boolean };

/**
 * The sessions the caller opened, optionally narrowed to one source or to
 * the active ones. The contract lists them whole; the narrowing is here.
 */
export const useMcpSessions = (
  filters: McpSessionListFilters = {},
  options: { enabled?: boolean } = {},
) => {
  const token = useIAMStore(state => state.token);
  const contentsUrl = useCoreStore(
    state => state.configuration.contentsUrl || state.configuration.runtimesUrl,
  );

  return useQuery<McpSessionList>({
    queryKey: queryKeys.contents.mcpSessionList(filters),
    queryFn: async () => {
      const page = await listMcpSessions(token ?? '', contentsUrl);
      return {
        items: page.items.filter(
          session =>
            (!filters.sourceUid || session.sourceUid === filters.sourceUid) &&
            (!filters.active || session.status === 'active'),
        ),
      };
    },
    enabled: Boolean(token && contentsUrl) && (options.enabled ?? true),
    staleTime: 30_000,
  });
};

export const useMcpSession = (sessionUid?: string) => {
  const token = useIAMStore(state => state.token);
  const contentsUrl = useCoreStore(
    state => state.configuration.contentsUrl || state.configuration.runtimesUrl,
  );

  return useQuery<McpSession>({
    queryKey: queryKeys.contents.mcpSession(sessionUid ?? ''),
    queryFn: () => getMcpSession(token ?? '', sessionUid!, contentsUrl),
    enabled: Boolean(token && contentsUrl && sessionUid),
    staleTime: 30_000,
  });
};

export const useCreateMcpSession = () => {
  const queryClient = useQueryClient();
  const token = useIAMStore(state => state.token);
  const contentsUrl = useCoreStore(
    state => state.configuration.contentsUrl || state.configuration.runtimesUrl,
  );

  return useMutation<
    McpSession,
    Error,
    { request: McpSessionCreate; idempotencyKey: string }
  >({
    mutationFn: ({ request, idempotencyKey }) =>
      createMcpSession(token ?? '', request, idempotencyKey, contentsUrl),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.contents.mcpSessions() });
    },
  });
};

export const useRevokeMcpSession = () => {
  const queryClient = useQueryClient();
  const token = useIAMStore(state => state.token);
  const contentsUrl = useCoreStore(
    state => state.configuration.contentsUrl || state.configuration.runtimesUrl,
  );

  return useMutation<McpSession, Error, string>({
    mutationFn: sessionUid => revokeMcpSession(token ?? '', sessionUid, contentsUrl),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.contents.mcpSessions() });
    },
  });
};

/**
 * One call, watched until the service is done with it.
 *
 * A call that is pending approval or running is polled; a terminal one is
 * not, so a page that shows a finished call does not keep asking.
 */
export const useMcpCall = (sessionUid?: string, callUid?: string) => {
  const token = useIAMStore(state => state.token);
  const contentsUrl = useCoreStore(
    state => state.configuration.contentsUrl || state.configuration.runtimesUrl,
  );

  return useQuery<McpCall>({
    queryKey: queryKeys.contents.mcpCall(sessionUid ?? '', callUid ?? ''),
    queryFn: () => getMcpCall(token ?? '', sessionUid!, callUid!, contentsUrl),
    enabled: Boolean(token && contentsUrl && sessionUid && callUid),
    refetchInterval: query =>
      query.state.data && isMcpCallTerminal(query.state.data.status) ? false : 2_000,
  });
};

/** The calls made through a session — the provenance of what they acquired. */
export const useMcpCalls = (sessionUid?: string) => {
  const token = useIAMStore(state => state.token);
  const contentsUrl = useCoreStore(
    state => state.configuration.contentsUrl || state.configuration.runtimesUrl,
  );

  return useQuery<McpCallList>({
    queryKey: queryKeys.contents.mcpCalls(sessionUid ?? ''),
    queryFn: () => listMcpCalls(token ?? '', sessionUid!, contentsUrl),
    enabled: Boolean(token && contentsUrl && sessionUid),
    staleTime: 15_000,
  });
};

export const useCallMcpTool = () => {
  const queryClient = useQueryClient();
  const token = useIAMStore(state => state.token);
  const contentsUrl = useCoreStore(
    state => state.configuration.contentsUrl || state.configuration.runtimesUrl,
  );

  return useMutation<McpCall, Error, { sessionUid: string; request: McpCallCreate }>({
    mutationFn: ({ sessionUid, request }) =>
      callMcpTool(token ?? '', sessionUid, request, contentsUrl),
    onSuccess: call => {
      queryClient.setQueryData(
        queryKeys.contents.mcpCall(call.sessionUid, call.uid),
        call,
      );
      queryClient.invalidateQueries({
        queryKey: queryKeys.contents.mcpCalls(call.sessionUid),
      });
      if (call.status === 'pending-approval') {
        queryClient.invalidateQueries({ queryKey: queryKeys.contents.mcpApprovals() });
      }
    },
  });
};

export type McpApprovalListFilters = { status?: McpApprovalStatus; sourceUid?: string };

/**
 * The approvals waiting on the caller, or those already decided. The
 * contract filters on the status alone; a source narrows the answer here.
 */
export const useMcpApprovals = (
  status: McpApprovalStatus | undefined = 'pending',
  filters: Omit<McpApprovalListFilters, 'status'> = {},
  options: { enabled?: boolean } = {},
) => {
  const token = useIAMStore(state => state.token);
  const contentsUrl = useCoreStore(
    state => state.configuration.contentsUrl || state.configuration.runtimesUrl,
  );
  const listFilters = { status, ...filters };

  return useQuery<McpApprovalList>({
    queryKey: queryKeys.contents.mcpApprovalList(listFilters),
    queryFn: async () => {
      const page = await listMcpApprovals(token ?? '', { status }, contentsUrl);
      return {
        items: filters.sourceUid
          ? page.items.filter(approval => approval.sourceUid === filters.sourceUid)
          : page.items,
      };
    },
    enabled: Boolean(token && contentsUrl) && (options.enabled ?? true),
    staleTime: 10_000,
    refetchInterval: status === 'pending' ? 15_000 : false,
  });
};

/** Approve or reject a pending call; the affected call is refreshed. */
export const useDecideMcpApproval = () => {
  const queryClient = useQueryClient();
  const token = useIAMStore(state => state.token);
  const contentsUrl = useCoreStore(
    state => state.configuration.contentsUrl || state.configuration.runtimesUrl,
  );

  return useMutation<
    McpApproval,
    Error,
    { approvalUid: string; decision: 'approve' | 'reject'; note?: string }
  >({
    mutationFn: ({ approvalUid, decision, note }) =>
      decideMcpApproval(token ?? '', approvalUid, decision, note, contentsUrl),
    onSuccess: approval => {
      queryClient.invalidateQueries({ queryKey: queryKeys.contents.mcpApprovals() });
      queryClient.invalidateQueries({
        queryKey: queryKeys.contents.mcpCalls(approval.sessionUid),
      });
    },
  });
};

// -- Datasources ----------------------------------------------------------
//
// A Datasource is a database somebody connected. None of these hooks talk
// to it: Contents does, with the credential it holds, directly or through a
// Dataserver. The browser sees verdicts, schemas and query jobs — and reads
// a finished result as bytes, by range.

/** The tables and columns a source exposes; asked once, then kept. */
export const useDatasourceSchema = (
  sourceUid?: string,
  options: { enabled?: boolean } = {},
) => {
  const token = useIAMStore(state => state.token);
  const contentsUrl = useCoreStore(
    state => state.configuration.contentsUrl || state.configuration.runtimesUrl,
  );

  return useQuery<DatasourceSchema>({
    queryKey: queryKeys.contents.datasourceSchema(sourceUid ?? ''),
    queryFn: () => discoverDatasourceSchema(token ?? '', sourceUid!, contentsUrl),
    enabled: Boolean(token && contentsUrl && sourceUid) && (options.enabled ?? true),
    staleTime: 300_000,
  });
};

/** What the source may be asked, and how the answer can travel. */
export const useDatasourceCapabilities = (sourceUid?: string) => {
  const token = useIAMStore(state => state.token);
  const contentsUrl = useCoreStore(
    state => state.configuration.contentsUrl || state.configuration.runtimesUrl,
  );

  return useQuery<DatasourceCapabilities>({
    queryKey: queryKeys.contents.datasourceCapabilities(sourceUid ?? ''),
    queryFn: () => getDatasourceCapabilities(token ?? '', sourceUid!, contentsUrl),
    enabled: Boolean(token && contentsUrl && sourceUid),
    staleTime: 300_000,
  });
};

/** Try the database through the source; the answer is a verdict. */
export const useTestDatasource = () => {
  const token = useIAMStore(state => state.token);
  const contentsUrl = useCoreStore(
    state => state.configuration.contentsUrl || state.configuration.runtimesUrl,
  );

  return useMutation<DatasourceTest, Error, string>({
    mutationFn: sourceUid => testDatasource(token ?? '', sourceUid, contentsUrl),
  });
};

/** Submit a statement. The answer is the job; `useDatasourceQuery` follows it. */
export const useCreateDatasourceQuery = () => {
  const queryClient = useQueryClient();
  const token = useIAMStore(state => state.token);
  const contentsUrl = useCoreStore(
    state => state.configuration.contentsUrl || state.configuration.runtimesUrl,
  );

  return useMutation<
    DatasourceQuery,
    Error,
    { sourceUid: string; request: DatasourceQueryCreate; idempotencyKey: string }
  >({
    mutationFn: ({ sourceUid, request, idempotencyKey }) =>
      createDatasourceQuery(token ?? '', sourceUid, request, idempotencyKey, contentsUrl),
    onSuccess: query => {
      queryClient.setQueryData(queryKeys.contents.query(query.uid), query);
      queryClient.invalidateQueries({
        queryKey: queryKeys.contents.datasourceQueries(query.sourceUid),
      });
    },
  });
};

/**
 * One query job, polled while it can still change.
 *
 * A pending or running query is asked about every second; a finished one is
 * not, so a page that shows a result does not keep asking.
 */
export const useDatasourceQuery = (queryUid?: string) => {
  const token = useIAMStore(state => state.token);
  const contentsUrl = useCoreStore(
    state => state.configuration.contentsUrl || state.configuration.runtimesUrl,
  );

  return useQuery<DatasourceQuery>({
    queryKey: queryKeys.contents.query(queryUid ?? ''),
    queryFn: () => getDatasourceQuery(token ?? '', queryUid!, contentsUrl),
    enabled: Boolean(token && contentsUrl && queryUid),
    refetchInterval: query =>
      query.state.data && isDatasourceQueryTerminal(query.state.data.status) ? false : 1_000,
    refetchOnWindowFocus: true,
  });
};

/** The queries run against a source, newest first: its history. */
export const useDatasourceQueries = (
  sourceUid?: string,
  options: { enabled?: boolean } = {},
) => {
  const token = useIAMStore(state => state.token);
  const contentsUrl = useCoreStore(
    state => state.configuration.contentsUrl || state.configuration.runtimesUrl,
  );

  return useQuery<DatasourceQueryList>({
    queryKey: queryKeys.contents.datasourceQueries(sourceUid ?? ''),
    queryFn: () => listDatasourceQueries(token ?? '', sourceUid!, {}, contentsUrl),
    enabled: Boolean(token && contentsUrl && sourceUid) && (options.enabled ?? true),
    staleTime: 15_000,
  });
};

/** Ask for a query to stop; the shared job record is refreshed. */
export const useCancelDatasourceQuery = () => {
  const queryClient = useQueryClient();
  const token = useIAMStore(state => state.token);
  const contentsUrl = useCoreStore(
    state => state.configuration.contentsUrl || state.configuration.runtimesUrl,
  );

  return useMutation<DatasourceQuery, Error, string>({
    mutationFn: queryUid => cancelDatasourceQuery(token ?? '', queryUid, contentsUrl),
    onSuccess: query => {
      queryClient.setQueryData(queryKeys.contents.query(query.uid), query);
      queryClient.invalidateQueries({
        queryKey: queryKeys.contents.datasourceQueries(query.sourceUid),
      });
    },
  });
};

/** The bytes of a result, or a range of them — a preview, or a resume. */
export const useDownloadDatasourceQueryResults = () => {
  const token = useIAMStore(state => state.token);
  const contentsUrl = useCoreStore(
    state => state.configuration.contentsUrl || state.configuration.runtimesUrl,
  );

  return useMutation<DatasourceQueryResultBytes, Error, { queryUid: string; range?: string }>({
    mutationFn: ({ queryUid, range }) =>
      downloadDatasourceQueryResults(token ?? '', queryUid, { range }, contentsUrl),
  });
};

/** Keep a result as a Dataset revision; the Dataset's revisions refresh. */
export const useSaveQueryAsDataset = () => {
  const queryClient = useQueryClient();
  const token = useIAMStore(state => state.token);
  const contentsUrl = useCoreStore(
    state => state.configuration.contentsUrl || state.configuration.runtimesUrl,
  );

  return useMutation<
    DatasetRevision,
    Error,
    { queryUid: string; datasetUid: string; path: string }
  >({
    mutationFn: ({ queryUid, datasetUid, path }) =>
      saveDatasourceQueryAsDataset(token ?? '', queryUid, { datasetUid, path }, contentsUrl),
    onSuccess: revision => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.contents.datasetRevisions(revision.sourceUid),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.contents.source(revision.sourceUid) });
    },
  });
};

/** A Flight ticket for a result, for a client inside a sandbox. */
export const useCreateDatasourceQueryTicket = () => {
  const token = useIAMStore(state => state.token);
  const contentsUrl = useCoreStore(
    state => state.configuration.contentsUrl || state.configuration.runtimesUrl,
  );

  return useMutation<
    CapabilityTicket,
    Error,
    { queryUid: string; request?: CapabilityTicketRequest }
  >({
    mutationFn: ({ queryUid, request }) =>
      createDatasourceQueryTicket(token ?? '', queryUid, request ?? {}, contentsUrl),
  });
};

// -- Dataservers ----------------------------------------------------------

/**
 * The gateway as last heard, polled on a bounded interval.
 *
 * The previous answer stays on screen while the next is fetched — a status
 * that blinks to nothing every ten seconds reads as flapping — and a
 * gateway that is revoked is not polled: nothing will change on its own.
 */
export const useDataserverStatus = (
  sourceUid?: string,
  options: { enabled?: boolean; intervalMs?: number } = {},
) => {
  const token = useIAMStore(state => state.token);
  const contentsUrl = useCoreStore(
    state => state.configuration.contentsUrl || state.configuration.runtimesUrl,
  );

  return useQuery<DataServerStatus>({
    queryKey: queryKeys.contents.dataserverStatus(sourceUid ?? ''),
    queryFn: () => getDataserverStatus(token ?? '', sourceUid!, contentsUrl),
    enabled: Boolean(token && contentsUrl && sourceUid) && (options.enabled ?? true),
    placeholderData: previous => previous,
    refetchInterval: query =>
      query.state.data?.state === 'revoked' ? false : (options.intervalMs ?? 10_000),
    refetchOnWindowFocus: true,
  });
};

export type DataserverTransition = 'drain' | 'resume' | 'revoke';

/** Drain, resume or revoke a gateway; its status and its record refresh. */
export const useDataserverAction = () => {
  const queryClient = useQueryClient();
  const token = useIAMStore(state => state.token);
  const contentsUrl = useCoreStore(
    state => state.configuration.contentsUrl || state.configuration.runtimesUrl,
  );

  return useMutation<
    DataServerStatus,
    Error,
    { sourceUid: string; action: DataserverTransition }
  >({
    mutationFn: ({ sourceUid, action }) =>
      (action === 'drain'
        ? drainDataserver
        : action === 'resume'
          ? resumeDataserver
          : revokeDataserver)(token ?? '', sourceUid, contentsUrl),
    onSuccess: (status, { sourceUid }) => {
      queryClient.setQueryData(queryKeys.contents.dataserverStatus(sourceUid), status);
      queryClient.invalidateQueries({ queryKey: queryKeys.contents.source(sourceUid) });
      queryClient.invalidateQueries({ queryKey: queryKeys.contents.sources() });
    },
  });
};

/** Try the gateway on Flight and on the HTTPS fallback; the answer is a verdict. */
export const useTestDataserver = () => {
  const token = useIAMStore(state => state.token);
  const contentsUrl = useCoreStore(
    state => state.configuration.contentsUrl || state.configuration.runtimesUrl,
  );

  return useMutation<DataServerConnectivity, Error, string>({
    mutationFn: sourceUid => testDataserver(token ?? '', sourceUid, contentsUrl),
  });
};

/** A new certificate from a CSR; the old one stays valid while it overlaps. */
export const useRotateDataserverIdentity = () => {
  const queryClient = useQueryClient();
  const token = useIAMStore(state => state.token);
  const contentsUrl = useCoreStore(
    state => state.configuration.contentsUrl || state.configuration.runtimesUrl,
  );

  return useMutation<IssuedIdentity, Error, { sourceUid: string; csr: string }>({
    mutationFn: ({ sourceUid, csr }) =>
      rotateDataserverIdentity(token ?? '', sourceUid, { csr }, contentsUrl),
    onSuccess: (_identity, { sourceUid }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.contents.dataserverStatus(sourceUid) });
      queryClient.invalidateQueries({ queryKey: queryKeys.contents.source(sourceUid) });
    },
  });
};


// --- The folders mounted into a Runtime that is already running -------------
//
// A Pod's volumes are fixed when it is created; the mount gateway is what
// lets the Home Folder arrive afterwards. `mountGateway` on the Runtime says
// whether this one can take it, so a view can offer the action instead of
// finding out by failing.

/**
 * What a running Runtime is granted, and what has arrived.
 *
 * Polled while the platform is still applying a change and left alone once it
 * has settled: a mount takes a second or two, and a runtime lives for hours.
 */
export const useRuntimeMounts = (runtimeName?: string, enabled = true) => {
  const token = useIAMStore(state => state.token);
  const runtimesUrl = useCoreStore(state => state.configuration.runtimesUrl);
  return useQuery<RuntimeMounts>({
    queryKey: queryKeys.contents.runtimeMounts(runtimeName ?? ''),
    queryFn: () => getRuntimeMounts(token ?? '', runtimeName!, runtimesUrl),
    enabled: Boolean(token && runtimesUrl && runtimeName && enabled),
    refetchInterval: query => (isRuntimeMountsSettled(query.state.data) ? false : 2_000),
  });
};

/**
 * Mount the caller's home folders into a Runtime that is already running.
 *
 * Which folders is not a parameter: the platform resolves the caller's own
 * memberships. A Runtime that cannot take a mount answers with the reason —
 * 409 for a sandbox created without the gateway, 504 when the platform could
 * not confirm it — and the caller shows that rather than a generic failure.
 */
export const useAttachRuntimeMounts = () => {
  const token = useIAMStore(state => state.token);
  const runtimesUrl = useCoreStore(state => state.configuration.runtimesUrl);
  const queryClient = useQueryClient();
  return useMutation<RuntimeMounts, Error, string>({
    mutationFn: runtimeName => attachRuntimeMounts(token ?? '', runtimeName, runtimesUrl),
    onSuccess: (_data, runtimeName) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.contents.runtimeMounts(runtimeName),
      });
      // The Home Folder browser shows the same folders; a mount that appeared
      // in a sandbox and not on the page is the disagreement to avoid.
      queryClient.invalidateQueries({ queryKey: queryKeys.contents.attachments() });
    },
  });
};

/** Take one folder out of a running Runtime, by the name it appears under. */
export const useDetachRuntimeMount = () => {
  const token = useIAMStore(state => state.token);
  const runtimesUrl = useCoreStore(state => state.configuration.runtimesUrl);
  const queryClient = useQueryClient();
  return useMutation<RuntimeMounts, Error, { runtimeName: string; target: string }>({
    mutationFn: ({ runtimeName, target }) =>
      detachRuntimeMount(token ?? '', runtimeName, target, runtimesUrl),
    onSuccess: (_data, { runtimeName }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.contents.runtimeMounts(runtimeName),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.contents.attachments() });
    },
  });
};
