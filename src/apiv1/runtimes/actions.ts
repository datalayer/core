/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Runtimes APIs.
 */
import { URLExt } from '@jupyterlab/coreutils';
import { PromiseDelegate } from '@lumino/coreutils';
import { Upload } from 'tus-js-client';
import {
  IRuntimeOptions,
  requestDatalayerAPI,
  type RunResponseError,
} from '..';
import { asRuntimeSnapshot } from '../../models';
import type {
  IRuntimeSnapshot,
  IAPIRuntimeSnapshot,
  IDatalayerEnvironment,
  IRuntimePod,
} from '../../models';
import { iamStore, runtimesStore } from '../../state';
import { sleep } from '../../utils';

/**
 * Get available Environments.
 */
export async function getEnvironments(): Promise<IDatalayerEnvironment[]> {
  const data = await requestDatalayerAPI<{
    success: boolean;
    message: string;
    environments?: IDatalayerEnvironment[];
  }>({
    url: URLExt.join(
      runtimesStore.getState().runtimesRunUrl,
      'api/runtimes/v1/environments',
    ),
    token: iamStore.getState().token,
  });
  if (!data.success) {
    console.error('Failed to fetch available environments.', data);
    return [];
  }
  return data.environments ?? [];
}

/**
 * Create a Runtime.
 */
export async function createRuntime(
  options: IRuntimeOptions,
): Promise<IRuntimePod> {
  const { externalToken, token } = iamStore.getState();
  const body: Record<string, unknown> = {
    environment_name: options.environmentName,
    type: options.type ?? 'notebook',
    given_name: options.givenName,
    credits_limit: options.creditsLimit,
  };
  if (options.capabilities) {
    body['capabilities'] = options.capabilities;
  }
  if (options.snapshot) {
    body['from'] = options.snapshot;
  }
  const data = await requestDatalayerAPI<{
    success: boolean;
    message: string;
    runtime?: IRuntimePod;
  }>({
    url: URLExt.join(
      runtimesStore.getState().runtimesRunUrl,
      `api/runtimes/v1/runtimes`,
    ),
    method: 'POST',
    body,
    token: token,
    // externalToken may be needed for addons (like credits...).
    headers: externalToken
      ? {
          'X-External-Token': externalToken,
        }
      : undefined,
  });
  if (!data.success || !data.runtime) {
    const msg = `Failed to create a kernel for the environment ${options.environmentName}.`;
    console.error(msg, data);
    throw new Error(msg);
  }

  return data.runtime;
}

/**
 * Get the Runtimes.
 */
export async function getRuntimes(): Promise<IRuntimePod[]> {
  const data = await requestDatalayerAPI<{
    success: boolean;
    message: string;
    runtimes?: IRuntimePod[];
  }>({
    url: URLExt.join(
      runtimesStore.getState().runtimesRunUrl,
      'api/runtimes/v1/runtimes',
    ),
    token: iamStore.getState().token,
  });
  if (!data.success) {
    const msg = 'Failed to list the running kernels.';
    console.error(msg, data);
    throw new Error(msg);
  }
  return data.runtimes ?? [];
}

/**
 * Delete a Runtime
 */
export async function deleteRuntime(options: {
  /**
   * Runtime ID
   */
  id: string;
  /**
   * Deletion reason
   */
  reason?: string;
}): Promise<void> {
  const externalToken = iamStore.getState().externalToken;
  await requestDatalayerAPI({
    url:
      URLExt.join(
        runtimesStore.getState().runtimesRunUrl,
        `api/runtimes/v1/runtimes/${options.id}`,
      ) +
      URLExt.objectToQueryString(
        options.reason ? { reason: options.reason } : {},
      ),
    method: 'DELETE',
    token: iamStore.getState().token,
    // externalToken may be needed for addons (like credits...).
    headers: externalToken
      ? {
          'X-External-Token': externalToken,
        }
      : undefined,
  });
}

/**
 * Snapshot a Runtime.
 */
export async function snapshotRuntime(options: {
  /**
   * Runtime ID.
   */
  id: string;
  /**
   * Snapshot name.
   */
  name?: string;
  /**
   * Snapshot description.
   */
  description?: string;
  /**
   * Whether to stop the kernel after the snapshot completion or not.
   */
  stop?: boolean;
}): Promise<IRuntimeSnapshot> {
  const data = await requestDatalayerAPI<{
    success: boolean;
    message: string;
    snapshot?: IAPIRuntimeSnapshot;
  }>({
    url: URLExt.join(
      runtimesStore.getState().runtimesRunUrl,
      'api/runtimes/v1/runtime-snapshots',
    ),
    method: 'POST',
    body: {
      pod_name: options.id,
      name: options.name,
      description: options.description,
      stop: options.stop,
    },
    token: iamStore.getState().token,
  });
  if (!data.success || !data.snapshot) {
    throw new Error(
      `Failed to pause the kernel snapshot ${options.id} - ${data}`,
    );
  }
  return asRuntimeSnapshot(data.snapshot);
}

/**
 * Get Runtime Snapshots.
 */
export async function getRuntimeSnapshots(): Promise<IRuntimeSnapshot[]> {
  const data = await requestDatalayerAPI<{
    success: boolean;
    message: string;
    snapshots?: IAPIRuntimeSnapshot[];
  }>({
    url: URLExt.join(
      runtimesStore.getState().runtimesRunUrl,
      'api/runtimes/v1/runtime-snapshots',
    ),
    token: iamStore.getState().token,
  });
  if (!data.success) {
    console.error('Failed to fetch kernel snapshots.', data);
    return [];
  }
  return (data.snapshots ?? []).map(asRuntimeSnapshot);
}

/**
 * Load a Runtime Snapshot within a kernel.
 */
export async function loadRuntimeSnapshot(options: {
  /**
   * Runtime ID
   */
  id: string;
  /**
   * Snapshot UID
   */
  from: string;
}): Promise<void> {
  const data = await requestDatalayerAPI<{
    success: boolean;
    message: string;
  }>({
    url: URLExt.join(
      runtimesStore.getState().runtimesRunUrl,
      'api/runtimes/v1/runtimes',
      options.id,
    ),
    method: 'PUT',
    body: {
      from: options.from,
    },
    token: iamStore.getState().token,
  });

  if (!data.success) {
    throw new Error(`Failed to load the kernel snapshot; ${data.message}`);
  }
}

/**
 * Returns the Runtime Snapshot download URL.
 *
 * @param id Snapshot UID to download
 * @returns The download URL
 */
export function createRuntimeSnapshotDownloadURL(id: string): string {
  return (
    URLExt.join(
      runtimesStore.getState().runtimesRunUrl,
      `api/runtimes/v1/runtime-snapshots/${id}`,
    ) +
    URLExt.objectToQueryString({
      download: '1',
      token: iamStore.getState().token ?? '',
    })
  );
}

/**
 * Export a Runtime Snapshot.
 *
 * @param id Runtime snapshot UID to download
 */
export function exportRuntimeSnapshot(id: string): void {
  const url = createRuntimeSnapshotDownloadURL(id);
  const element = document.createElement('a');
  element.href = url;
  element.download = '';
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
}

/**
 * Delete a Runtime Snapshot.
 */
export async function deleteRuntimeSnapshot(id: string): Promise<void> {
  await requestDatalayerAPI<{
    success: boolean;
    message: string;
    snapshots?: IAPIRuntimeSnapshot[];
  }>({
    url: URLExt.join(
      runtimesStore.getState().runtimesRunUrl,
      `api/runtimes/v1/runtime-snapshots/${id}`,
    ),
    method: 'DELETE',
    token: iamStore.getState().token,
  });

  // Poll Runtime Snapshot state up-to its deletion
  try {
    let sleepTimeout = 1000;
    while (true) {
      await sleep(sleepTimeout);
      sleepTimeout *= 2;
      const response = await requestDatalayerAPI<{
        success: boolean;
        message: string;
        snapshots?: IAPIRuntimeSnapshot[];
      }>({
        url: URLExt.join(
          runtimesStore.getState().runtimesRunUrl,
          `api/runtimes/v1/runtime-snapshots/${id}`,
        ),
        token: iamStore.getState().token,
      });
      if (response.success === false) {
        throw new Error(response.message);
      }
    }
  } catch (error) {
    if (
      (error as RunResponseError).name === 'RunResponseError' &&
      (error as RunResponseError).response.status === 404
    ) {
      // Expected not found
    } else {
      throw error;
    }
  }
}

/**
 * Update Runtime Snapshot metadata.
 */
export async function updateRuntimeSnapshot(
  id: string,
  metadata: { name?: string; description?: string },
): Promise<void> {
  if (metadata.name || metadata.description) {
    await requestDatalayerAPI<{
      success: boolean;
      message: string;
      snapshot?: IAPIRuntimeSnapshot;
    }>({
      url: URLExt.join(
        runtimesStore.getState().runtimesRunUrl,
        `api/runtimes/v1/runtime-snapshots/${id}`,
      ),
      method: 'PATCH',
      body: { ...metadata },
      token: iamStore.getState().token,
    });
  }
}

/**
 * Upload a Runtime Snapshot.
 *
 * Note: The promise will be rejected if the runtime state is empty.
 */
export async function uploadRuntimeSnapshot(options: {
  file: File | Blob;
  metadata: { filename: string; [key: string]: string };
  onProgress?: (bytesUploaded: number, bytesTotal: number) => void;
}): Promise<void> {
  if (options.file.size === 0) {
    return Promise.reject('Empty Runtime Snapshot.');
  }
  const tracker = new PromiseDelegate<void>();
  // Create a new tus upload.
  const upload = new Upload(options.file, {
    // Endpoint is the upload creation URL from your tus server.
    endpoint: `${runtimesStore.getState().runtimesRunUrl}/api/runtimes/v1/runtime-snapshots/upload`,
    headers: { Authorization: `Bearer ${iamStore.getState().token}` },
    // Retry delays will enable tus-js-client to automatically retry on errors.
    // retryDelays: [0, 3000, 5000, 10000, 20000],
    retryDelays: null,
    // Attach additional meta data about the file for the server.
    metadata: options.metadata,
    // Callback for errors which cannot be fixed using retries.
    onError: error => {
      console.error(`Failed to upload ${options.metadata.filename}.`, error);
      tracker.reject(error);
    },
    // Callback for reporting upload progress.
    onProgress: options.onProgress,
    // Callback for once the upload is completed.
    onSuccess: () => {
      tracker.resolve();
    },
  });
  // Check if there are any previous uploads to continue then start the upload.
  const previousUploads = await upload.findPreviousUploads();
  // Found previous uploads so we select the first one.
  if (previousUploads.length) {
    upload.resumeFromPreviousUpload(previousUploads[0]);
  }
  // Start the upload.
  upload.start();
  return tracker.promise;
}
