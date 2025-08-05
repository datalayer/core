/*
 * Copyright (c) 2021-2024 Datalayer, Inc.
 *
 * Datalayer License
 */

/**
 * Runtime snapshot from API.
 */
export interface IAPIRuntimeSnapshot {
  /**
   * Snapshot UID
   */
  uid: string;
  /**
   * Snapshot name
   */
  name: string;
  /**
   * Snapshot description
   */
  description: string;
  /**
   * Snapshot environment
   */
  environment: string;
  /**
   * Snapshot metadata
   */
  metadata: Record<string, any>;
  /**
   * Snapshot size in bytes
   */
  size: number;
  /**
   * Latest update time of the snapshot
   */
  updated_at: string;
  /**
   * Snapshot format
   */
  format: string;
  /**
   * Snapshot format version
   */
  format_version: string;
  /**
   * Snapshot status
   */
  status: string;
}

/**
 * Runtime snapshot model.
 */
export interface IRuntimeSnapshot {
  /**
   * Snapshot UID
   */
  id: string;
  /**
   * Snapshot name
   */
  name: string;
  /**
   * Snapshot description
   */
  description: string;
  /**
   * Snapshot environment
   */
  environment: string;
  /**
   * Snapshot metadata
   */
  metadata: Record<string, any>;
  /**
   * Snapshot size in bytes
   */
  size: number;
  /**
   * Latest update time of the snapshot
   */
  updatedAt: Date;
  /**
   * Snapshot format
   */
  format: string;
  /**
   * Snapshot format version
   */
  formatVersion: string;
  /**
  
   * Snapshot status
   */
  status: string;
}

export function asRuntimeSnapshot(s: IAPIRuntimeSnapshot): IRuntimeSnapshot {
  const { uid, updated_at, format_version, ...others } = s;
  return {
    ...others,
    id: uid,
    updatedAt: new Date(updated_at),
    formatVersion: format_version
  };
}
