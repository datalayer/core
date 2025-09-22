/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { ApiClient } from '../../base/client';
import { environmentsApi, runtimesApi, runtimeSnapshotsApi } from './api';
import type {
  Environment,
  Runtime,
  CreateRuntimeRequest,
  RuntimeSnapshot,
  CreateRuntimeSnapshotRequest,
  LoadRuntimeSnapshotRequest,
  RuntimesListParams,
  RuntimeSnapshotsListParams,
} from '../../types/runtimes';

export class EnvironmentsClient {
  constructor(private client: ApiClient) {}

  async list(): Promise<Environment[]> {
    const response = await environmentsApi.list(this.client);
    return response.data.environments;
  }

  async get(name: string): Promise<Environment> {
    const response = await environmentsApi.get(this.client, name);
    return response.data;
  }
}

export class RuntimesClient {
  constructor(private client: ApiClient) {}

  async create(data: CreateRuntimeRequest): Promise<Runtime> {
    const response = await runtimesApi.create(this.client, data);
    return response.data.runtime;
  }

  async list(params?: RuntimesListParams): Promise<Runtime[]> {
    const response = await runtimesApi.list(this.client, params);
    return response.data.runtimes;
  }

  async get(podName: string): Promise<Runtime> {
    const response = await runtimesApi.get(this.client, podName);
    return response.data;
  }

  async delete(podName: string): Promise<void> {
    await runtimesApi.delete(this.client, podName);
  }

  async setState(podName: string, state: Runtime['state']): Promise<Runtime> {
    const response = await runtimesApi.setState(this.client, podName, state);
    return response.data;
  }

  async getStatus(podName: string): Promise<Runtime> {
    const response = await runtimesApi.getStatus(this.client, podName);
    return response.data;
  }

  async start(podName: string): Promise<Runtime> {
    return this.setState(podName, 'running');
  }

  async stop(podName: string): Promise<Runtime> {
    return this.setState(podName, 'stopped');
  }
}

export class RuntimeSnapshotsClient {
  constructor(private client: ApiClient) {}

  async create(data: CreateRuntimeSnapshotRequest): Promise<RuntimeSnapshot> {
    const response = await runtimeSnapshotsApi.create(this.client, data);
    return response.data;
  }

  async list(params?: RuntimeSnapshotsListParams): Promise<RuntimeSnapshot[]> {
    const response = await runtimeSnapshotsApi.list(this.client, params);
    return response.data.snapshots;
  }

  async get(snapshotId: string): Promise<RuntimeSnapshot> {
    const response = await runtimeSnapshotsApi.get(this.client, snapshotId);
    return response.data;
  }

  async delete(snapshotId: string): Promise<void> {
    await runtimeSnapshotsApi.delete(this.client, snapshotId);
  }

  async load(data: LoadRuntimeSnapshotRequest): Promise<void> {
    await runtimeSnapshotsApi.load(this.client, data);
  }

  async download(snapshotId: string): Promise<Blob> {
    const response = await runtimeSnapshotsApi.download(
      this.client,
      snapshotId,
    );
    return response.data;
  }

  async upload(
    file: File,
    metadata?: Partial<RuntimeSnapshot>,
  ): Promise<RuntimeSnapshot> {
    const response = await runtimeSnapshotsApi.upload(
      this.client,
      file,
      metadata,
    );
    return response.data;
  }
}

export class RuntimesService {
  public readonly environments: EnvironmentsClient;
  public readonly runtimes: RuntimesClient;
  public readonly snapshots: RuntimeSnapshotsClient;

  constructor(client: ApiClient) {
    this.environments = new EnvironmentsClient(client);
    this.runtimes = new RuntimesClient(client);
    this.snapshots = new RuntimeSnapshotsClient(client);
  }

  // Convenience methods at service level
  async create(data: CreateRuntimeRequest): Promise<Runtime> {
    return this.runtimes.create(data);
  }

  async list(params?: RuntimesListParams): Promise<Runtime[]> {
    return this.runtimes.list(params);
  }

  async get(podName: string): Promise<Runtime> {
    return this.runtimes.get(podName);
  }

  async delete(podName: string): Promise<void> {
    return this.runtimes.delete(podName);
  }

  async setState(podName: string, state: Runtime['state']): Promise<Runtime> {
    return this.runtimes.setState(podName, state);
  }
}
