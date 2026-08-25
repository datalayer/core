/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { useRef, useState } from 'react';
import {
  Button,
  Checkbox,
  Heading,
  Label,
  ProgressBar,
  Spinner,
  Text,
} from '@primer/react';
import {
  DownloadIcon,
  FileIcon,
  HistoryIcon,
  SyncIcon,
  TrashIcon,
  UploadIcon,
} from '@primer/octicons-react';
import { Box } from '@datalayer/primer-addons';
import type { ContentObject } from '../../api/contents';
import {
  useDeleteUserFolderObject,
  useDownloadUserFolderObject,
  useRestoreUserFolderObject,
  useUploadUserFolderFile,
  useUserFolderObjects,
  useUserFolderObjectVersions,
} from '../../hooks/useContents';

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
};

const mutationKey = (action: string, uid: string): string => {
  const random =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${action}:${uid}:${random}`;
};

export type UserFolderBrowserProps = {
  prefix?: string;
  selectedObjectUids?: readonly string[];
  onSelectedObjectsChange?: (objects: ContentObject[]) => void;
  selectionDisabled?: boolean;
};

/** Browser for the server-managed Home Folder metadata and version history. */
export const UserFolderBrowser = ({ prefix, selectedObjectUids = [],
  onSelectedObjectsChange, selectionDisabled = false }: UserFolderBrowserProps) => {
  const objects = useUserFolderObjects({ prefix, limit: 100 });
  const [selected, setSelected] = useState<ContentObject>();
  const [uploadProgress, setUploadProgress] = useState<{
    uploaded: number;
    total: number;
  }>();
  const [failedUpload, setFailedUpload] = useState<File>();
  const fileInput = useRef<HTMLInputElement>(null);
  const versions = useUserFolderObjectVersions(selected?.uid);
  const deleteObject = useDeleteUserFolderObject();
  const restoreObject = useRestoreUserFolderObject();
  const uploadObject = useUploadUserFolderFile();
  const downloadObject = useDownloadUserFolderObject();
  const selectable = Boolean(onSelectedObjectsChange);
  const toggleSelection = (object: ContentObject) => {
    if (!onSelectedObjectsChange) return;
    const selectedUids = new Set(selectedObjectUids);
    selectedUids.has(object.uid) ? selectedUids.delete(object.uid) : selectedUids.add(object.uid);
    onSelectedObjectsChange((objects.data?.items ?? []).filter(item => selectedUids.has(item.uid)));
  };

  const onUpload = (
    file?: File,
    overwrite: 'reject' | 'replace' | 'new-version' = 'reject',
  ) => {
    if (!file) return;
    setFailedUpload(undefined);
    setUploadProgress({ uploaded: 0, total: file.size });
    uploadObject.mutate(
      {
        path: prefix ? `${prefix.replace(/\/$/, '')}/${file.name}` : file.name,
        content: file,
        mediaType: file.type || 'application/octet-stream',
        overwrite,
        idempotencyKey: mutationKey('upload', file.name),
        onProgress: progress =>
          setUploadProgress({
            uploaded: progress.uploadedBytes,
            total: progress.totalBytes,
          }),
      },
      {
        onError: () => setFailedUpload(file),
        onSettled: () => setUploadProgress(undefined),
      },
    );
  };

  const onDownload = (object: ContentObject) => {
    downloadObject.mutate(
      { objectUid: object.uid },
      {
        onSuccess: response => {
          const url = URL.createObjectURL(
            new Blob([response.data], { type: object.mediaType }),
          );
          const anchor = document.createElement('a');
          anchor.href = url;
          anchor.download = object.path.split('/').pop() || 'download';
          anchor.click();
          URL.revokeObjectURL(url);
        },
      },
    );
  };

  const onDelete = (object: ContentObject) => {
    if (
      typeof window !== 'undefined' &&
      !window.confirm(`Delete ${object.path}? You can restore an earlier version.`)
    ) {
      return;
    }
    deleteObject.mutate({
      objectUid: object.uid,
      idempotencyKey: mutationKey('delete', object.uid),
    });
  };

  if (objects.isPending) {
    return (
      <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}>
        <Spinner />
      </Box>
    );
  }

  if (objects.isError) {
    return (
      <Box sx={{ p: 3, border: '1px solid', borderColor: 'danger.muted' }}>
        <Text sx={{ color: 'danger.fg' }}>
          {objects.error instanceof Error
            ? objects.error.message
            : 'The Home Folder could not be loaded.'}
        </Text>
        <Button sx={{ ml: 2 }} onClick={() => objects.refetch()}>
          Retry
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      <Box
        sx={{
          mb: 3,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 3,
        }}
      >
        <Text sx={{ color: 'fg.muted' }}>
          {prefix ? `user-folder:///${prefix}` : 'user-folder:///'}
        </Text>
        <>
          <input
            ref={fileInput}
            type="file"
            hidden
            onChange={event => {
              onUpload(event.target.files?.[0]);
              event.target.value = '';
            }}
          />
          <Button
            leadingVisual={UploadIcon}
            disabled={uploadObject.isPending}
            onClick={() => fileInput.current?.click()}
          >
            Upload
          </Button>
        </>
      </Box>
      {uploadProgress && (
        <Box sx={{ mb: 3 }}>
          <ProgressBar
            progress={
              uploadProgress.total
                ? (uploadProgress.uploaded / uploadProgress.total) * 100
                : 100
            }
            aria-label="Upload progress"
          />
          <Text sx={{ color: 'fg.muted', fontSize: 0 }}>
            {formatBytes(uploadProgress.uploaded)} of{' '}
            {formatBytes(uploadProgress.total)}
          </Text>
        </Box>
      )}
      {uploadObject.isError && (
        <Box sx={{ mb: 3 }}>
          <Text as="p" sx={{ color: 'danger.fg', mb: 2 }}>
            {uploadObject.error.message}
          </Text>
          {failedUpload && (
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button size="small" onClick={() => onUpload(failedUpload)}>
                Retry
              </Button>
              <Button
                size="small"
                variant="primary"
                onClick={() => onUpload(failedUpload, 'new-version')}
              >
                Upload as new version
              </Button>
            </Box>
          )}
        </Box>
      )}
      {(objects.data?.items.length ?? 0) === 0 ? (
        <Box
          sx={{
            p: 4,
            textAlign: 'center',
            border: '1px dashed',
            borderColor: 'border.default',
            borderRadius: 2,
          }}
        >
          <FileIcon size={24} />
          <Heading as="h3" sx={{ fontSize: 2, mt: 2 }}>
            Your Home Folder is empty
          </Heading>
          <Text as="p" sx={{ color: 'fg.muted', mb: 0 }}>
            Uploaded and transferred files will appear here.
          </Text>
        </Box>
      ) : (
        <Box
          as="table"
          sx={{
            width: '100%',
            borderCollapse: 'collapse',
            'th, td': {
              px: 3,
              py: 2,
              textAlign: 'left',
              borderBottom: '1px solid',
              borderColor: 'border.muted',
            },
            th: { color: 'fg.muted', fontSize: 0, fontWeight: 600 },
          }}
        >
          <thead>
            <tr>
              {selectable && <th aria-label="Select" />}
              <th>Path</th>
              <th>Size</th>
              <th>Updated</th>
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {objects.data?.items.map(object => (
              <tr key={object.uid}>
                {selectable && (
                  <td>
                    <Checkbox aria-label={`Select ${object.path}`}
                      checked={selectedObjectUids.includes(object.uid)}
                      disabled={selectionDisabled || !object.currentVersionUid}
                      onChange={() => toggleSelection(object)} />
                  </td>
                )}
                <td>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <FileIcon />
                    <Text sx={{ fontFamily: 'mono' }}>{object.path}</Text>
                  </Box>
                </td>
                <td>{formatBytes(object.size)}</td>
                <td>{new Date(object.updatedAt).toLocaleString()}</td>
                <td>
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                    <Button
                      size="small"
                      leadingVisual={HistoryIcon}
                      onClick={() => setSelected(object)}
                    >
                      Versions
                    </Button>
                    <Button
                      size="small"
                      leadingVisual={DownloadIcon}
                      disabled={downloadObject.isPending}
                      onClick={() => onDownload(object)}
                    >
                      Download
                    </Button>
                    <Button
                      size="small"
                      variant="danger"
                      leadingVisual={TrashIcon}
                      disabled={deleteObject.isPending}
                      onClick={() => onDelete(object)}
                    >
                      Delete
                    </Button>
                  </Box>
                </td>
              </tr>
            ))}
          </tbody>
        </Box>
      )}

      {selected && (
        <Box
          sx={{
            mt: 3,
            p: 3,
            border: '1px solid',
            borderColor: 'border.default',
            borderRadius: 2,
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
            <Heading as="h3" sx={{ fontSize: 2 }}>
              Versions of {selected.path}
            </Heading>
            <Button size="small" onClick={() => setSelected(undefined)}>
              Close
            </Button>
          </Box>
          {versions.isPending ? (
            <Spinner size="small" />
          ) : versions.isError ? (
            <Text sx={{ color: 'danger.fg' }}>Version history could not be loaded.</Text>
          ) : (
            <Box as="ul" sx={{ listStyle: 'none', p: 0, mb: 0 }}>
              {versions.data?.items.map(version => {
                const isCurrent = version.uid === selected.currentVersionUid;
                return (
                  <Box
                    as="li"
                    key={version.uid}
                    sx={{
                      py: 2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 3,
                      borderBottom: '1px solid',
                      borderColor: 'border.muted',
                      ':last-child': { borderBottom: 0 },
                    }}
                  >
                    <Box>
                      <Text sx={{ fontFamily: 'mono', fontSize: 0 }}>
                        {version.uid}
                      </Text>
                      <Text as="p" sx={{ color: 'fg.muted', m: 0, fontSize: 0 }}>
                        {new Date(version.createdAt).toLocaleString()} ·{' '}
                        {formatBytes(version.size)}
                      </Text>
                    </Box>
                    {isCurrent ? (
                      <Label variant="success">Current</Label>
                    ) : version.deleted ? (
                      <Label>Deletion marker</Label>
                    ) : (
                      <Button
                        size="small"
                        leadingVisual={SyncIcon}
                        disabled={restoreObject.isPending}
                        onClick={() =>
                          restoreObject.mutate({
                            objectUid: selected.uid,
                            versionUid: version.uid,
                            idempotencyKey: mutationKey('restore', version.uid),
                          })
                        }
                      >
                        Restore
                      </Button>
                    )}
                  </Box>
                );
              })}
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
};

export default UserFolderBrowser;
