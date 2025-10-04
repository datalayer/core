/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { validateJSON } from '../../api/utils/validation';

/**
 * Represents a health check response from a Datalayer service.
 * Provides standardized health status information across all services.
 */
export class HealthCheck {
  // Properties
  healthy: boolean;
  status: string;
  responseTime: number;
  errors: string[];
  timestamp: Date;

  /**
   * Create a HealthCheck instance.
   * @param data - The health check data
   * @param sdk - Reference to the SDK instance (unused but kept for consistency)
   */
  constructor(data: any, sdk: any) {
    // Initialize properties
    this.healthy = data.healthy || false;
    this.status = data.status || 'unknown';
    this.responseTime = data.responseTime || 0;
    this.errors = data.errors || [];
    this.timestamp = data.timestamp ? new Date(data.timestamp) : new Date();
  }

  /**
   * Check if the service is healthy.
   * @returns True if the service is healthy
   */
  isHealthy(): boolean {
    return this.healthy;
  }

  /**
   * Get the service status.
   * @returns The status string
   */
  getStatus(): string {
    return this.status;
  }

  /**
   * Get the response time in milliseconds.
   * @returns The response time
   */
  getResponseTime(): number {
    return this.responseTime;
  }

  /**
   * Get any errors reported during the health check.
   * @returns Array of error messages
   */
  getErrors(): string[] {
    return this.errors;
  }

  /**
   * Get the timestamp of the health check.
   * @returns The timestamp
   */
  getTimestamp(): Date {
    return this.timestamp;
  }

  /**
   * Check if there are any errors.
   * @returns True if there are errors
   */
  hasErrors(): boolean {
    return this.errors.length > 0;
  }

  /**
   * Get a human-readable summary of the health check.
   * @returns Summary string
   */
  getSummary(): string {
    if (this.healthy) {
      return `Service is healthy (${this.responseTime}ms response time)`;
    } else {
      const errorCount = this.errors.length;
      return `Service is unhealthy: ${this.status} (${errorCount} error${errorCount !== 1 ? 's' : ''})`;
    }
  }

  /**
   * Convert to a plain object.
   * @returns Plain object representation
   */
  async toJSON(): Promise<HealthCheckJSON> {
    const obj = {
      healthy: this.healthy,
      status: this.status,
      responseTime: this.responseTime,
      errors: this.errors,
      timestamp: this.timestamp.toISOString(),
    };
    validateJSON(obj, 'HealthCheck');
    return obj;
  }

  /**
   * Get a string representation.
   * @returns String representation
   */
  toString(): string {
    return `HealthCheck(${this.status}, healthy=${this.healthy}, responseTime=${this.responseTime}ms)`;
  }
}

/**
 * JSON representation of a HealthCheck.
 */
export interface HealthCheckJSON {
  healthy: boolean;
  status: string;
  responseTime: number;
  errors: string[];
  timestamp: string;
}
