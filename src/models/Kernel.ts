/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/*
 * Copyright (c) 2021-2023 Datalayer, Inc.
 *
 * MIT License
 */

/**
 * Request structure for creating a Datalayer kernel
 */
export interface IKernelRequest {
  kernel_type: 'notebook';
  kernel_given_name: string;
  credits_limit: number;
  capabilities: string[];
}

/**
 * Response structure from Datalayer kernel API
 */
export interface IKernelResponse {
  success: boolean;
  message: string;
  kernel: {
    burning_rate: number;
    kernel_type: 'notebook';
    kernel_given_name: string;
    environment_name: string;
    environment_display_name: string;
    jupyter_pod_name: string;
    token: string;
    ingress: string;
    reservation_id: string;
    started_at: string;
    expired_at: string;
  };
}

/**
 * Configuration for Datalayer kernel creation
 */
export interface IDatalayerKernelConfig {
  environmentName: string;
  credits: number;
  kernelName?: string;
  capabilities?: string[];
}

/**
 * Kernel reservation information
 */
export interface IKernelReservation {
  reservationId: string;
  environmentName: string;
  jupyterUrl: string;
  token: string;
  startedAt: Date;
  expiredAt: Date;
}