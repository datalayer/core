/*
 * Copyright (c) 2021-2024 Datalayer, Inc.
 *
 * Datalayer License
 */

/**
 * Datalayer Jupyter API interface.
 */
import { URLExt } from '@jupyterlab/coreutils';
import { ISessionContext } from '@jupyterlab/apputils';
import { ServiceManager, Kernel, ServerConnection } from '@jupyterlab/services';
import { PromiseDelegate } from '@lumino/coreutils';
import { IDisposable } from '@lumino/disposable';
import { ISignal } from '@lumino/signaling';
import { Upload } from 'tus-js-client';
import { requestRunAPI, type RunResponseError } from '..';
import type { IRuntimeSnapshot, IAPIRuntimeSnapshot, IRuntimeCapabilities} from '../../models';
import { asRuntimeSnapshot, IDatalayerEnvironment, IRuntimePod, IRuntimeType } from '../../models';
import type { IRuntimeModel, RuntimeLocation } from './models';
import { iamStore, runtimesStore } from '../../state';
import { sleep } from '../../utils';

/**
 * 
 */
export interface IDatalayerSessionContext extends ISessionContext {
  get location(): RuntimeLocation;
}

/**
 * Runtime creation options
 */
export interface IRuntimeOptions {
  /**
   * Environment name
   */
  environmentName: string;
  /**
   * Credits limit to be consumed by the kernel
   */
  creditsLimit: number;
  /**
   * Runtime type
   */
  type?: IRuntimeType;
  /**
   * Runtime given name
   */
  givenName?: string;
  /**
   * Kernel capabilities
   */
  capabilities?: IRuntimeCapabilities[];
  /**
   * Kernel snapshot to restore
   */
  snapshot?: string;
}

/**
 * Interface for the Environments Manager
 */
export interface IEnvironmentsManager extends IDisposable {
  /**
   * Signal emitted when the environments changes.
   */
  readonly changed: ISignal<IEnvironmentsManager, readonly IDatalayerEnvironment[]>;

  /**
   * A signal emitted when there is a connection failure.
   */
  readonly connectionFailure: ISignal<IEnvironmentsManager, Error>;

  /**
   * Test whether the manager is ready.
   */
  readonly isReady: boolean;

  /**
   * A promise that fulfills when the manager is ready.
   */
  readonly ready: Promise<void>;

  /**
   * Get the list of environments.
   */
  get(): readonly IDatalayerEnvironment[];

  /**
   * Refresh the environment list.
   */
  refresh(): Promise<void>;

  /**
   * Refresh the environments.
   */
  refreshEnvironments(): Promise<void>;
}

/**
 * Interface for the Remote Runtimes Manager
 */
export interface IRemoteRuntimesManager extends IDisposable {
  /**
   * A signal emitted when there is a connection failure.
   */
  readonly connectionFailure: ISignal<IRemoteRuntimesManager, Error>;

  /**
   * Test whether the manager is ready.
   */
  readonly isReady: boolean;

  /**
   * A promise that fulfills when the manager is ready.
   */
  readonly ready: Promise<void>;

  /**
   * Remote kernels changed
   */
  readonly changed: ISignal<IRemoteRuntimesManager, readonly IRuntimeModel[]>;

  /**
   * The server settings.
   */
  readonly serverSettings: ServerConnection.ISettings;

  /**
   * Get the list of remote kernels.
   */
  get(): readonly IRuntimeModel[];

  /**
   * Get the service manager for a remote server
   *
   * @param serverName Remote kernel server name
   * @returns Service manager for the remote server
   */
  getServices(serverName: string): any | undefined;

  /**
   * Refresh the environment list
   */
  refresh(): Promise<void>;

  /**
   * Launch a Kernel.
   *
   * @param createOptions - The kernel creation options
   *
   * @param connectOptions - The kernel connection options
   *
   * @returns A promise that resolves with the kernel connection.
   */
  startNew(
    createOptions: IRuntimeOptions,
    connectOptions?: Omit<
      Kernel.IKernelConnection.IOptions,
      'model' | 'serverSettings'
    >
  ): Promise<Kernel.IKernelConnection>;

  /**
   * Find a kernel by id.
   *
   * @param id - The id of the target kernel.
   *
   * @returns A promise that resolves with the kernel's model, or undefined if not found.
   */
  findById(id: string): Promise<IRuntimeModel | undefined>;

  /**
   * Connect to an existing kernel.
   *
   * @param options - The connection options.
   *
   * @returns A promise that resolves with the new kernel instance.
   */
  connectTo(options: Kernel.IKernelConnection.IOptions): Kernel.IKernelConnection;

  /**
   * Shut down a kernel by id.
   *
   * @param id - The id of the target kernel.
   *
   * @returns A promise that resolves when the operation is complete.
   */
  shutdown(id: string): Promise<void>;

  /**
   * Shut down all kernels.
   *
   * @returns A promise that resolves when all of the kernels are shut down.
   */
  shutdownAll(): Promise<void>;

  /**
   * @deprecated Use {@link refresh} instead.
   */
  refreshKernels(): Promise<void>;

  /**
   * Snapshot a remote kernel
   *
   * The remote kernel may be given by its `id` or `podName`.
   * A custom description for the snapshot can be provided.
   *
   * @returns The snapshot description
   */
  snapshot(options: {
    /**
     * The kernel id to snapshot
     */
    id?: string;
    /**
     * The kernel pod name to snapshot
     */
    podName?: string;
    /**
     * The snapshot name
     */
    name?: string;
    /**
     * The snapshot description
     */
    description?: string;
    /**
     * Whether to stop the kernel after the snapshot completion or not.
     */
    stop?: boolean;
  }): Promise<IRuntimeSnapshot | undefined>;

  /**
   * Load a snapshot within a remote kernel
   *
   * The remote kernel may be given by its `id` or `podName`.
   */
  loadSnapshot(options: {
    /**
     * The kernel id
     */
    id?: string;
    /**
     * The kernel pod name
     */
    podName?: string;
    /**
     * The snapshot UID
     */
    snapshot: string;
  }): Promise<void>;
}

/**
 * Interface for the Remote Services Manager
 */
export interface IRemoteServicesManager extends IDisposable {
  /**
   * The environments manager.
   */
  readonly environments: IEnvironmentsManager;

  /**
   * The remote runtimes manager.
   */
  readonly runtimesManager: IRemoteRuntimesManager;
  
  /**
   * The server settings.
   */
  readonly serverSettings: ServerConnection.ISettings;

  /**
   * A signal emitted when there is a connection failure with the kernel.
   */
  readonly connectionFailure: ISignal<IRemoteServicesManager, Error>;

  /**
   * Test whether the service manager is disposed.
   */
  readonly isDisposed: boolean;

  /**
   * Whether the remote manager is ready or not.
   */
  readonly isReady: boolean;

  /**
   * Wait for the remote manager to be ready.
   */
  readonly ready: Promise<void>;
}

/**
 * Interface for the Service Manager that manages multiple Jupyter service managers.
 */
export interface IMultiServiceManager extends ServiceManager.IManager {
  /**
   * Service manager for browser kernels.
   *
   * The kernels managed by this service manager
   * are fully executed in a service worker with
   * browser.
   */
  browser: ServiceManager.IManager | undefined;

  /**
   * Signal emitted when the browser services changes.
   */
  readonly browserChanged: ISignal<ServiceManager.IManager, ServiceManager.IManager | undefined>;

  /**
   * Classical Service manager on the Local Jupyter server.
   */
  readonly local: ServiceManager.IManager;

  /**
   * Service manager on a Remote Jupyter server.
   */
  remote: IRemoteServicesManager | undefined;

  /**
   * Signal emitted when the remote services changes.
   */
  readonly remoteChanged: ISignal<ServiceManager.IManager, IRemoteServicesManager | undefined>;
}

/**
 * Get available environments.
 */
export async function getEnvironments(): Promise<IDatalayerEnvironment[]> {
  const data = await requestRunAPI<{
    success: boolean;
    message: string;
    environments?: IDatalayerEnvironment[];
  }>({
    url: URLExt.join(
      runtimesStore.getState().runtimesRunUrl,
      'api/runtimes/v1/environments'
    ),
    token: iamStore.getState().token
  });
  if (!data.success) {
    console.error('Failed to fetch available environments.', data);
    return [];
  }
  return data.environments ?? [];
}

/**
 * Create a Kernel.
 */
export async function createRuntime(options: IRuntimeOptions): Promise<IRuntimePod> {
  const { externalToken, token } = iamStore.getState();
  const body: Record<string, unknown> = {
    environment_name: options.environmentName,
    type: options.type ?? 'notebook',
    given_name: options.givenName,
    credits_limit: options.creditsLimit
  };
  if (options.capabilities) {
    body['capabilities'] = options.capabilities;
  }
  if (options.snapshot) {
    body['from'] = options.snapshot;
  }
  const data = await requestRunAPI<{
    success: boolean;
    message: string;
    runtime?: IRuntimePod;
  }>({
    url: URLExt.join(runtimesStore.getState().runtimesRunUrl, `api/runtimes/v1/runtimes`),
    method: 'POST',
    body,
    token: token,
    // externalToken may be needed for addons (like credits...).
    headers: externalToken ?
      {
        'X-External-Token': externalToken
      }
    : undefined
  });
  if (!data.success || !data.runtime) {
    const msg = `Failed to create a kernel for the environment ${options.environmentName}.`;
    console.error(msg, data);
    throw new Error(msg);
  }
  return data.runtime;
}

/**
 * List Runtimes
 */
export async function getRuntimes(): Promise<IRuntimePod[]> {
  const data = await requestRunAPI<{
    success: boolean;
    message: string;
    runtimes?: IRuntimePod[];
  }>({
    url: URLExt.join(runtimesStore.getState().runtimesRunUrl, 'api/runtimes/v1/runtimes'),
    token: iamStore.getState().token
  });
  if (!data.success) {
    const msg = 'Failed to list the running kernels.';
    console.error(msg, data);
    throw new Error(msg);
  }
  return data.runtimes ?? [];
}

/**
 * Remove a Kernel
 */
export async function deleteRuntime(options: {
  /**
   * Kernel ID
   */
  id: string;
  /**
   * Deletion reason
   */
  reason?: string;
}): Promise<void> {
  const externalToken = iamStore.getState().externalToken;
  await requestRunAPI({
    url:
      URLExt.join(runtimesStore.getState().runtimesRunUrl, `api/runtimes/v1/runtimes/${options.id}`) +
      URLExt.objectToQueryString(options.reason ? { reason: options.reason } : {}),
    method: 'DELETE',
    token: iamStore.getState().token,
    // externalToken may be needed for addons (like credits...).
    headers: externalToken ?
      {
        'X-External-Token': externalToken
      }
    :
      undefined
  });
}

/**
 * Snapshot a Kernel.
 */
export async function snapshotRuntime(options: {
  /**
   * Kernel ID.
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
  const data = await requestRunAPI<{
    success: boolean;
    message: string;
    snapshot?: IAPIRuntimeSnapshot;
  }>({
    url: URLExt.join(
      runtimesStore.getState().runtimesRunUrl,
      'api/runtimes/v1/runtime-snapshots'
    ),
    method: 'POST',
    body: {
      pod_name: options.id,
      name: options.name,
      description: options.description,
      stop: options.stop
    },
    token: iamStore.getState().token
  });
  if (!data.success || !data.snapshot) {
    throw new Error(`Failed to pause the kernel snapshot ${options.id} - ${data}`);
  }
  return asRuntimeSnapshot(data.snapshot);
}

/**
 * Get Kernel Snapshots.
 */
export async function getRuntimeSnapshots(): Promise<IRuntimeSnapshot[]> {
  const data = await requestRunAPI<{
    success: boolean;
    message: string;
    snapshots?: IAPIRuntimeSnapshot[];
  }>({
    url: URLExt.join(
      runtimesStore.getState().runtimesRunUrl,
      'api/runtimes/v1/runtime-snapshots'
    ),
    token: iamStore.getState().token
  });
  if (!data.success) {
    console.error('Failed to fetch kernel snapshots.', data);
    return [];
  }
  return (data.snapshots ?? []).map(asRuntimeSnapshot);
}

/**
 * Load a kernel snapshot within a kernel.
 */
export async function loadRuntimeSnapshot(options: {
  /**
   * Kernel ID
   */
  id: string;
  /**
   * Snapshot UID
   */
  from: string;
}): Promise<void> {
  const data = await requestRunAPI<{
    success: boolean;
    message: string;
  }>({
    url: URLExt.join(
      runtimesStore.getState().runtimesRunUrl,
      'api/runtimes/v1/runtimes',
      options.id
    ),
    method: 'PUT',
    body: {
      from: options.from
    },
    token: iamStore.getState().token
  });

  if (!data.success) {
    throw new Error(`Failed to load the kernel snapshot; ${data.message}`);
  }
}

/**
 * Returns the runtime snapshot download URL.
 *
 * @param id Snapshot UID to download
 * @returns The download URL
 */
export function createRuntimeSnapshotDownloadURL(id: string): string {
  return (
    URLExt.join(
      runtimesStore.getState().runtimesRunUrl,
      `api/runtimes/v1/runtime-snapshots/${id}`
    ) +
    URLExt.objectToQueryString({
      download: '1',
      token: iamStore.getState().token ?? ''
    })
  );
}

/**
 * Export runtime snapshot.
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
 * Delete runtime snapshot.
 */
export async function deleteRuntimeSnapshot(id: string): Promise<void> {
  await requestRunAPI<{
    success: boolean;
    message: string;
    snapshots?: IAPIRuntimeSnapshot[];
  }>({
    url: URLExt.join(
      runtimesStore.getState().runtimesRunUrl,
      `api/runtimes/v1/runtime-snapshots/${id}`
    ),
    method: 'DELETE',
    token: iamStore.getState().token
  });

  // Poll runtime snapshot state upto its deletion
  try {
    let sleepTimeout = 1000;
    while (true) {
      await sleep(sleepTimeout);
      sleepTimeout *= 2;
      const response = await requestRunAPI<{
        success: boolean;
        message: string;
        snapshots?: IAPIRuntimeSnapshot[];
      }>({
        url: URLExt.join(
          runtimesStore.getState().runtimesRunUrl,
          `api/runtimes/v1/runtime-snapshots/${id}`
        ),
        token: iamStore.getState().token
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
 * Update runtime snapshot metadata.
 */
export async function updateRuntimeSnapshot(
  id: string,
  metadata: { name?: string, description?: string }
): Promise<void> {
  if (metadata.name || metadata.description) {
    await requestRunAPI<{
      success: boolean;
      message: string;
      snapshot?: IAPIRuntimeSnapshot;
    }>({
      url: URLExt.join(
        runtimesStore.getState().runtimesRunUrl,
        `api/runtimes/v1/runtime-snapshots/${id}`
      ),
      method: 'PATCH',
      body: { ...metadata },
      token: iamStore.getState().token
    });
  }
}

/**
 * Upload a runtime snapshot.
 *
 * Note: The promise will be rejected if the runtime state is empty.
 */
export async function uploadRuntimeSnapshot(options: {
  file: File | Blob;
  metadata: { filename: string; [key: string]: string };
  onProgress?: (bytesUploaded: number, bytesTotal: number) => void;
}): Promise<void> {
  if (options.file.size === 0) {
    return Promise.reject('Empty runtime snapshot');
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
    }
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
