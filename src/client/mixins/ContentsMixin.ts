/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/** Contents mixin providing the typed source catalog API. */

import {
  createAttachment,
  createDatasetRevision,
  createDatasetPublication,
  archiveSource,
  cancelOperation,
  cancelTransfer,
  completeTransfer,
  createSource,
  createTransfer,
  downloadHomeFolderObject,
  getSource,
  getHomeFolderQuota,
  getHomeFolder,
  getAttachmentManifest,
  getDatasetRevision,
  getOperation,
  getTransfer,
  getSourcePermissions,
  getSourceSharing,
  listHomeFolderObjects,
  listHomeFolderObjectVersions,
  listSources,
  listTransfers,
  listAttachments,
  listDatasetRevisions,
  listDatasetPublications,
  deleteHomeFolderObject,
  replaceSourceSharing,
  restoreHomeFolderObject,
  revokeAttachment,
  unpublishDataset,
  statHomeFolderObject,
  uploadTransferPart,
  uploadHomeFolderFile,
  updateSource,
  type ConditionalCatalogSource,
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
  type ContentSourceCreate,
  type ContentSourceUpdate,
  type EffectivePermissions,
  type ContentObject,
  type DownloadedObject,
  type ObjectList,
  type OperationView,
  type RestoreRequest,
  type Sharing,
  type SourceList,
  type TransferCreate,
  type TransferList,
  type TransferView,
  type UploadProgress,
  type HomeFolderObjectListOptions,
  type HomeFolderQuota,
  type VersionList,
} from '../../api/contents';
import type { Constructor } from '../utils/mixins';

export function ContentsMixin<TBase extends Constructor>(Base: TBase) {
  return class extends Base {
    contentsRequestContext(): { token: string; baseUrl: string } {
      const client = this as any;
      return {
        token: client.getToken() ?? '',
        baseUrl: client.getContentsUrl(),
      };
    }

    async listContentSources(
      options: { kind?: string; spaceUid?: string; cursor?: string; limit?: number } = {},
    ): Promise<SourceList> {
      const { token, baseUrl } = this.contentsRequestContext();
      return listSources(token, options, baseUrl);
    }

    async createContentAttachment(
      request: AttachmentCreate,
      idempotencyKey: string,
    ): Promise<ContentAttachment> {
      const { token, baseUrl } = this.contentsRequestContext();
      return createAttachment(token, request, idempotencyKey, baseUrl);
    }

    async createDatasetRevision(sourceUid: string, request: DatasetRevisionCreate,
      idempotencyKey: string): Promise<DatasetRevision> {
      const { token, baseUrl } = this.contentsRequestContext();
      return createDatasetRevision(token, sourceUid, request, idempotencyKey, baseUrl);
    }

    async listDatasetRevisions(sourceUid: string): Promise<DatasetRevisionList> {
      const { token, baseUrl } = this.contentsRequestContext();
      return listDatasetRevisions(token, sourceUid, baseUrl);
    }

    async getDatasetRevision(sourceUid: string, revisionUid: string): Promise<DatasetRevision> {
      const { token, baseUrl } = this.contentsRequestContext();
      return getDatasetRevision(token, sourceUid, revisionUid, baseUrl);
    }

    async createDatasetPublication(sourceUid: string, request: DatasetPublicationCreate,
      idempotencyKey: string): Promise<DatasetPublication> {
      const { token, baseUrl } = this.contentsRequestContext();
      return createDatasetPublication(token, sourceUid, request, idempotencyKey, baseUrl);
    }

    async listDatasetPublications(sourceUid: string): Promise<DatasetPublicationList> {
      const { token, baseUrl } = this.contentsRequestContext();
      return listDatasetPublications(token, sourceUid, baseUrl);
    }

    async unpublishDataset(sourceUid: string, publicationUid: string): Promise<DatasetPublication> {
      const { token, baseUrl } = this.contentsRequestContext();
      return unpublishDataset(token, sourceUid, publicationUid, baseUrl);
    }

    async listContentAttachments(
      options: { sandboxUid?: string; sourceUid?: string; active?: boolean } = {},
    ): Promise<AttachmentList> {
      const { token, baseUrl } = this.contentsRequestContext();
      return listAttachments(token, options, baseUrl);
    }

    async getContentAttachmentManifest(
      sandboxUid: string,
    ): Promise<ContentAttachmentManifest> {
      const { token, baseUrl } = this.contentsRequestContext();
      return getAttachmentManifest(token, sandboxUid, baseUrl);
    }

    async revokeContentAttachment(
      attachmentUid: string,
    ): Promise<ContentAttachment> {
      const { token, baseUrl } = this.contentsRequestContext();
      return revokeAttachment(token, attachmentUid, baseUrl);
    }

    async createContentSource(
      source: ContentSourceCreate,
      idempotencyKey: string,
    ): Promise<ConditionalCatalogSource> {
      const { token, baseUrl } = this.contentsRequestContext();
      return createSource(token, source, idempotencyKey, baseUrl);
    }

    async getContentSource(sourceUid: string): Promise<ConditionalCatalogSource> {
      const { token, baseUrl } = this.contentsRequestContext();
      return getSource(token, sourceUid, baseUrl);
    }

    async getHomeFolder(): Promise<ConditionalCatalogSource> {
      const { token, baseUrl } = this.contentsRequestContext();
      return getHomeFolder(token, baseUrl);
    }

    async listHomeFolderObjects(
      options: HomeFolderObjectListOptions = {},
    ): Promise<ObjectList> {
      const { token, baseUrl } = this.contentsRequestContext();
      return listHomeFolderObjects(token, options, baseUrl);
    }

    async getHomeFolderQuota(): Promise<HomeFolderQuota> {
      const { token, baseUrl } = this.contentsRequestContext();
      return getHomeFolderQuota(token, baseUrl);
    }

    async statHomeFolderObject(path: string): Promise<ContentObject> {
      const { token, baseUrl } = this.contentsRequestContext();
      return statHomeFolderObject(token, path, baseUrl);
    }

    async listHomeFolderObjectVersions(
      objectUid: string,
      options: { cursor?: string; limit?: number } = {},
    ): Promise<VersionList> {
      const { token, baseUrl } = this.contentsRequestContext();
      return listHomeFolderObjectVersions(token, objectUid, options, baseUrl);
    }

    async deleteHomeFolderObject(
      objectUid: string,
      idempotencyKey: string,
    ): Promise<ContentObject> {
      const { token, baseUrl } = this.contentsRequestContext();
      return deleteHomeFolderObject(token, objectUid, idempotencyKey, baseUrl);
    }

    async restoreHomeFolderObject(
      objectUid: string,
      request: RestoreRequest,
      idempotencyKey: string,
    ): Promise<ContentObject> {
      const { token, baseUrl } = this.contentsRequestContext();
      return restoreHomeFolderObject(
        token,
        objectUid,
        request,
        idempotencyKey,
        baseUrl,
      );
    }

    async createContentTransfer(
      request: TransferCreate,
      idempotencyKey: string,
    ): Promise<TransferView> {
      const { token, baseUrl } = this.contentsRequestContext();
      return createTransfer(token, request, idempotencyKey, baseUrl);
    }

    async getContentTransfer(transferUid: string): Promise<TransferView> {
      const { token, baseUrl } = this.contentsRequestContext();
      return getTransfer(token, transferUid, baseUrl);
    }

    async listContentTransfers(
      options: { active?: boolean; cursor?: string; limit?: number } = {},
    ): Promise<TransferList> {
      const { token, baseUrl } = this.contentsRequestContext();
      return listTransfers(token, options, baseUrl);
    }

    async uploadContentTransferPart(
      transferUid: string,
      partNumber: number,
      content: Uint8Array,
      checksum: string,
    ): Promise<TransferView> {
      const { token, baseUrl } = this.contentsRequestContext();
      return uploadTransferPart(
        token,
        transferUid,
        partNumber,
        content,
        checksum,
        baseUrl,
      );
    }

    async completeContentTransfer(transferUid: string): Promise<TransferView> {
      const { token, baseUrl } = this.contentsRequestContext();
      return completeTransfer(token, transferUid, baseUrl);
    }

    async cancelContentTransfer(transferUid: string): Promise<TransferView> {
      const { token, baseUrl } = this.contentsRequestContext();
      return cancelTransfer(token, transferUid, baseUrl);
    }

    async uploadHomeFolderFile(
      path: string,
      content: Blob | Uint8Array | ArrayBuffer,
      options: {
        idempotencyKey: string;
        mediaType?: string;
        overwrite?: 'reject' | 'replace' | 'new-version';
        chunkSize?: number;
        onProgress?: (progress: UploadProgress) => void;
      },
    ): Promise<TransferView> {
      const { token, baseUrl } = this.contentsRequestContext();
      return uploadHomeFolderFile(token, path, content, options, baseUrl);
    }

    async downloadHomeFolderObject(
      objectUid: string,
      options: { versionUid?: string; range?: string } = {},
    ): Promise<DownloadedObject> {
      const { token, baseUrl } = this.contentsRequestContext();
      return downloadHomeFolderObject(token, objectUid, options, baseUrl);
    }

    async updateContentSource(
      sourceUid: string,
      update: ContentSourceUpdate,
      etag: string,
    ): Promise<ConditionalCatalogSource> {
      const { token, baseUrl } = this.contentsRequestContext();
      return updateSource(token, sourceUid, update, etag, baseUrl);
    }

    async archiveContentSource(
      sourceUid: string,
      etag: string,
    ): Promise<ConditionalCatalogSource> {
      const { token, baseUrl } = this.contentsRequestContext();
      return archiveSource(token, sourceUid, etag, baseUrl);
    }

    async getContentSourcePermissions(
      sourceUid: string,
    ): Promise<EffectivePermissions> {
      const { token, baseUrl } = this.contentsRequestContext();
      return getSourcePermissions(token, sourceUid, baseUrl);
    }

    async getContentSourceSharing(sourceUid: string): Promise<Sharing> {
      const { token, baseUrl } = this.contentsRequestContext();
      return getSourceSharing(token, sourceUid, baseUrl);
    }

    async replaceContentSourceSharing(
      sourceUid: string,
      sharing: Sharing,
      etag: string,
    ): Promise<ConditionalCatalogSource> {
      const { token, baseUrl } = this.contentsRequestContext();
      return replaceSourceSharing(token, sourceUid, sharing, etag, baseUrl);
    }

    async getContentOperation(operationUid: string): Promise<OperationView> {
      const { token, baseUrl } = this.contentsRequestContext();
      return getOperation(token, operationUid, baseUrl);
    }

    async cancelContentOperation(operationUid: string): Promise<OperationView> {
      const { token, baseUrl } = this.contentsRequestContext();
      return cancelOperation(token, operationUid, baseUrl);
    }
  };
}
