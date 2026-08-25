/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createAttachment,
  createSource,
  createDatasetRevision,
  createDatasetPublication,
  cancelOperation,
  cancelTransfer,
  deleteUserFolderObject,
  downloadUserFolderObject,
  getOperation,
  getAttachmentManifest,
  getDatasetRevision,
  getTransfer,
  getSource,
  getSourceSharing,
  getUserFolderQuota,
  getUserFolder,
  listUserFolderObjects,
  listUserFolderObjectVersions,
  listSources,
  listAttachments,
  listDatasetRevisions,
  listDatasetPublications,
  listTransfers,
  restoreUserFolderObject,
  revokeAttachment,
  unpublishDataset,
  archiveSource,
  replaceSourceSharing,
  statUserFolderObject,
  uploadUserFolderFile,
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
  type UserFolderQuota,
  type SourceList,
  updateSource,
} from '../api/contents';
import { useCoreStore, useIAMStore } from '../state';
import { queryKeys } from './useCache';

export type ContentSourceKind = ContentSource['kind'];

export const useDatasetRevisions = (sourceUid?: string) => {
  const token = useIAMStore(state => state.token);
  const contentsUrl = useCoreStore(state => state.configuration.contentsUrl || state.configuration.iamUrl);
  return useQuery<DatasetRevisionList>({
    queryKey: queryKeys.contents.datasetRevisions(sourceUid ?? ''),
    queryFn: () => listDatasetRevisions(token ?? '', sourceUid!, contentsUrl),
    enabled: Boolean(token && contentsUrl && sourceUid),
  });
};

export const useDatasetRevision = (sourceUid?: string, revisionUid?: string) => {
  const token = useIAMStore(state => state.token);
  const contentsUrl = useCoreStore(state => state.configuration.contentsUrl || state.configuration.iamUrl);
  return useQuery<DatasetRevision>({
    queryKey: queryKeys.contents.datasetRevision(sourceUid ?? '', revisionUid ?? ''),
    queryFn: () => getDatasetRevision(token ?? '', sourceUid!, revisionUid!, contentsUrl),
    enabled: Boolean(token && contentsUrl && sourceUid && revisionUid),
  });
};

export const useCreateDatasetRevision = () => {
  const queryClient = useQueryClient();
  const token = useIAMStore(state => state.token);
  const contentsUrl = useCoreStore(state => state.configuration.contentsUrl || state.configuration.iamUrl);
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
  const contentsUrl = useCoreStore(state => state.configuration.contentsUrl || state.configuration.iamUrl);
  return useQuery<DatasetPublicationList>({
    queryKey: queryKeys.contents.datasetPublications(sourceUid ?? ''),
    queryFn: () => listDatasetPublications(token ?? '', sourceUid!, contentsUrl),
    enabled: Boolean(token && contentsUrl && sourceUid),
  });
};

export const useCreateDatasetPublication = () => {
  const queryClient = useQueryClient();
  const token = useIAMStore(state => state.token);
  const contentsUrl = useCoreStore(state => state.configuration.contentsUrl || state.configuration.iamUrl);
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
  const contentsUrl = useCoreStore(state => state.configuration.contentsUrl || state.configuration.iamUrl);
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
    state => state.configuration.contentsUrl || state.configuration.iamUrl,
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
    state => state.configuration.contentsUrl || state.configuration.iamUrl,
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
    state => state.configuration.contentsUrl || state.configuration.iamUrl,
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
    state => state.configuration.contentsUrl || state.configuration.iamUrl,
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
    state => state.configuration.contentsUrl || state.configuration.iamUrl,
  );

  return useQuery<SourceList>({
    queryKey: queryKeys.contents.sourceList(filters),
    queryFn: () => listSources(token ?? '', filters, contentsUrl),
    enabled: Boolean(token && contentsUrl),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
};

/** Query one catalog source, including its ETag and effective permissions. */
export const useContentSource = (sourceUid?: string) => {
  const token = useIAMStore(state => state.token);
  const contentsUrl = useCoreStore(
    state => state.configuration.contentsUrl || state.configuration.iamUrl,
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
    state => state.configuration.contentsUrl || state.configuration.iamUrl,
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
    state => state.configuration.contentsUrl || state.configuration.iamUrl,
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
    state => state.configuration.contentsUrl || state.configuration.iamUrl,
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
    state => state.configuration.contentsUrl || state.configuration.iamUrl,
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
    state => state.configuration.contentsUrl || state.configuration.iamUrl,
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
export const useUserFolder = () => {
  const token = useIAMStore(state => state.token);
  const contentsUrl = useCoreStore(
    state => state.configuration.contentsUrl || state.configuration.iamUrl,
  );

  return useQuery<ConditionalCatalogSource>({
    queryKey: queryKeys.contents.userFolder(),
    queryFn: () => getUserFolder(token ?? '', contentsUrl),
    enabled: Boolean(token && contentsUrl),
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: true,
  });
};

/** Query durable used, reserved and configured User Folder capacity. */
export const useUserFolderQuota = () => {
  const token = useIAMStore(state => state.token);
  const contentsUrl = useCoreStore(
    state => state.configuration.contentsUrl || state.configuration.iamUrl,
  );
  return useQuery<UserFolderQuota>({
    queryKey: queryKeys.contents.userFolderQuota(),
    queryFn: () => getUserFolderQuota(token ?? '', contentsUrl),
    enabled: Boolean(token && contentsUrl),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
};

export type UserFolderObjectListFilters = {
  prefix?: string;
  cursor?: string;
  limit?: number;
  order?: 'path' | 'updated';
};

/** Browse the authenticated user's persistent folder. */
export const useUserFolderObjects = (
  filters: UserFolderObjectListFilters = {},
) => {
  const token = useIAMStore(state => state.token);
  const contentsUrl = useCoreStore(
    state => state.configuration.contentsUrl || state.configuration.iamUrl,
  );
  return useQuery<ObjectList>({
    queryKey: queryKeys.contents.userFolderObjects(filters),
    queryFn: () => listUserFolderObjects(token ?? '', filters, contentsUrl),
    enabled: Boolean(token && contentsUrl),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
};

/** Resolve one User Folder path to its current object metadata. */
export const useUserFolderObject = (path?: string) => {
  const token = useIAMStore(state => state.token);
  const contentsUrl = useCoreStore(
    state => state.configuration.contentsUrl || state.configuration.iamUrl,
  );
  return useQuery<ContentObject>({
    queryKey: queryKeys.contents.userFolderObject(path ?? ''),
    queryFn: () => statUserFolderObject(token ?? '', path!, contentsUrl),
    enabled: Boolean(token && contentsUrl && path),
  });
};

/** List immutable versions for a User Folder object. */
export const useUserFolderObjectVersions = (
  objectUid?: string,
  options: { cursor?: string; limit?: number } = {},
) => {
  const token = useIAMStore(state => state.token);
  const contentsUrl = useCoreStore(
    state => state.configuration.contentsUrl || state.configuration.iamUrl,
  );
  return useQuery<VersionList>({
    queryKey: queryKeys.contents.userFolderObjectVersions(
      objectUid ?? '',
      options.cursor,
    ),
    queryFn: () =>
      listUserFolderObjectVersions(
        token ?? '',
        objectUid!,
        options,
        contentsUrl,
      ),
    enabled: Boolean(token && contentsUrl && objectUid),
  });
};

type ObjectMutation = { objectUid: string; idempotencyKey: string };

/** Soft-delete a User Folder object and invalidate its browse metadata. */
export const useDeleteUserFolderObject = () => {
  const queryClient = useQueryClient();
  const token = useIAMStore(state => state.token);
  const contentsUrl = useCoreStore(
    state => state.configuration.contentsUrl || state.configuration.iamUrl,
  );
  return useMutation<ContentObject, Error, ObjectMutation>({
    mutationFn: ({ objectUid, idempotencyKey }) =>
      deleteUserFolderObject(
        token ?? '',
        objectUid,
        idempotencyKey,
        contentsUrl,
      ),
    onSuccess: object => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.contents.userFolder(),
      });
      queryClient.setQueryData(
        queryKeys.contents.userFolderObject(object.path),
        object,
      );
    },
  });
};

/** Restore an immutable version as the object's new current version. */
export const useRestoreUserFolderObject = () => {
  const queryClient = useQueryClient();
  const token = useIAMStore(state => state.token);
  const contentsUrl = useCoreStore(
    state => state.configuration.contentsUrl || state.configuration.iamUrl,
  );
  return useMutation<
    ContentObject,
    Error,
    ObjectMutation & { versionUid: string }
  >({
    mutationFn: ({ objectUid, versionUid, idempotencyKey }) =>
      restoreUserFolderObject(
        token ?? '',
        objectUid,
        { versionUid },
        idempotencyKey,
        contentsUrl,
      ),
    onSuccess: object => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.contents.userFolder(),
      });
      queryClient.setQueryData(
        queryKeys.contents.userFolderObject(object.path),
        object,
      );
      queryClient.invalidateQueries({
        queryKey: [
          ...queryKeys.contents.userFolder(),
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
    state => state.configuration.contentsUrl || state.configuration.iamUrl,
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
    state => state.configuration.contentsUrl || state.configuration.iamUrl,
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
    state => state.configuration.contentsUrl || state.configuration.iamUrl,
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
    state => state.configuration.contentsUrl || state.configuration.iamUrl,
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
    state => state.configuration.contentsUrl || state.configuration.iamUrl,
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
        queryKey: queryKeys.contents.userFolder(),
      });
    },
  });
};

/** Upload a browser file with resumable verified parts and durable progress. */
export const useUploadUserFolderFile = () => {
  const queryClient = useQueryClient();
  const token = useIAMStore(state => state.token);
  const contentsUrl = useCoreStore(
    state => state.configuration.contentsUrl || state.configuration.iamUrl,
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
      uploadUserFolderFile(token ?? '', path, content, options, contentsUrl),
    onSuccess: transfer => {
      queryClient.setQueryData(
        queryKeys.contents.transfer(transfer.uid),
        transfer,
      );
      queryClient.invalidateQueries({
        queryKey: queryKeys.contents.userFolder(),
      });
    },
  });
};

/** Fetch a complete object version or a resumable HTTP byte range. */
export const useDownloadUserFolderObject = () => {
  const token = useIAMStore(state => state.token);
  const contentsUrl = useCoreStore(
    state => state.configuration.contentsUrl || state.configuration.iamUrl,
  );
  return useMutation<
    DownloadedObject,
    Error,
    { objectUid: string; versionUid?: string; range?: string }
  >({
    mutationFn: ({ objectUid, ...options }) =>
      downloadUserFolderObject(token ?? '', objectUid, options, contentsUrl),
  });
};
