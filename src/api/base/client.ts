/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Configuration options for the API client
 * @interface ApiConfig
 */
export interface ApiConfig {
  /**
   * The base URL for all API requests
   * @default 'https://prod1.datalayer.run'
   * @example 'https://staging.datalayer.run'
   */
  baseUrl?: string;

  /**
   * Bearer token for authentication
   * @example 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
   */
  token?: string;

  /**
   * Additional headers to include in all requests
   * @example { 'X-Custom-Header': 'value' }
   */
  headers?: Record<string, string>;

  /**
   * Request timeout in milliseconds
   * @default 30000
   */
  timeout?: number;
}

/**
 * Options for individual API requests
 * @interface RequestOptions
 * @extends RequestInit
 */
export interface RequestOptions extends RequestInit {
  /**
   * Query parameters to append to the URL
   * @example { limit: 10, offset: 20 }
   */
  params?: Record<string, any>;

  /**
   * Request-specific timeout in milliseconds
   * Overrides the client-level timeout
   */
  timeout?: number;
}

/**
 * Standardized API response wrapper
 * @interface ApiResponse
 * @template T - The type of the response data
 */
export interface ApiResponse<T = any> {
  /**
   * The response data
   */
  data: T;

  /**
   * HTTP status code
   */
  status: number;

  /**
   * Response headers
   */
  headers: Headers;

  /**
   * Whether the request was successful (status 2xx)
   */
  ok: boolean;
}

/**
 * Standardized API error structure
 * @interface ApiError
 */
export interface ApiError {
  /**
   * Human-readable error message
   */
  message: string;

  /**
   * HTTP status code if available
   */
  status?: number;

  /**
   * Error code for programmatic handling
   */
  code?: string;

  /**
   * Additional error details
   */
  details?: any;
}

/**
 * HTTP client for making API requests with built-in authentication,
 * error handling, timeout support, and request cancellation.
 *
 * @class ApiClient
 * @example
 * ```typescript
 * const client = new ApiClient({
 *   baseUrl: 'https://api.example.com',
 *   token: 'your-api-token',
 *   timeout: 60000
 * });
 *
 * const response = await client.get('/users');
 * console.log(response.data);
 * ```
 */
export class ApiClient {
  private config: ApiConfig;
  private abortControllers: Map<string, AbortController> = new Map();

  /**
   * Creates a new API client instance
   * @param {ApiConfig} config - Configuration options
   */
  constructor(config: ApiConfig = {}) {
    this.config = {
      baseUrl: config.baseUrl || 'https://prod1.datalayer.run',
      token: config.token,
      headers: config.headers || {},
      timeout: config.timeout || 30000,
    };
  }

  /**
   * Builds a complete URL with query parameters
   * @private
   * @param {string} path - The API endpoint path
   * @param {Record<string, any>} params - Query parameters
   * @returns {string} The complete URL
   */
  private buildUrl(path: string, params?: Record<string, any>): string {
    const url = new URL(path, this.config.baseUrl);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            value.forEach(v => url.searchParams.append(key, String(v)));
          } else {
            url.searchParams.append(key, String(value));
          }
        }
      });
    }
    return url.toString();
  }

  /**
   * Merges default headers with custom headers
   * @private
   * @param {HeadersInit} customHeaders - Custom headers for the request
   * @returns {HeadersInit} Merged headers
   */
  private getHeaders(customHeaders?: HeadersInit): HeadersInit {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...this.config.headers,
    };

    if (this.config.token) {
      headers['Authorization'] = `Bearer ${this.config.token}`;
    }

    if (customHeaders) {
      Object.assign(headers, customHeaders);
    }

    return headers;
  }

  /**
   * Makes an HTTP request with automatic error handling and timeout support
   *
   * @template T - The expected response data type
   * @param {string} method - HTTP method (GET, POST, PUT, DELETE, etc.)
   * @param {string} path - API endpoint path
   * @param {RequestOptions} options - Request options
   * @returns {Promise<ApiResponse<T>>} The API response
   * @throws {ApiError} When the request fails
   *
   * @example
   * ```typescript
   * const response = await client.request('POST', '/users', {
   *   body: JSON.stringify({ name: 'John' })
   * });
   * ```
   */
  async request<T = any>(
    method: string,
    path: string,
    options: RequestOptions = {},
  ): Promise<ApiResponse<T>> {
    const { params, timeout = this.config.timeout, ...fetchOptions } = options;

    const url = this.buildUrl(path, params);
    const requestId = `${method}-${url}`;

    let controller: AbortController | undefined;
    let signal: AbortSignal | undefined;

    // Disable AbortController in test environments due to compatibility issues
    const isTestEnv =
      typeof process !== 'undefined' && process.env?.NODE_ENV === 'test';

    // Only use AbortController if available and valid
    if (!isTestEnv && typeof AbortController !== 'undefined') {
      try {
        controller = new AbortController();
        signal = controller.signal;
        // Check if signal is valid
        if (signal && typeof signal === 'object' && 'aborted' in signal) {
          this.abortControllers.set(requestId, controller);
        } else {
          // Signal is not valid, don't use it
          signal = undefined;
          controller = undefined;
        }
      } catch (e) {
        // AbortController not properly supported
        console.warn('AbortController not available in this environment');
        signal = undefined;
        controller = undefined;
      }
    }

    const timeoutId =
      timeout && controller
        ? setTimeout(() => controller.abort(), timeout)
        : undefined;

    try {
      const fetchOptions2 = { ...fetchOptions };
      // Remove signal from fetchOptions if it exists to avoid conflict
      delete (fetchOptions2 as any).signal;

      const fetchConfig: RequestInit = {
        method,
        headers: this.getHeaders(fetchOptions.headers),
        ...fetchOptions2,
      };

      // Only add signal if it's a valid AbortSignal
      if (
        signal &&
        signal.constructor &&
        signal.constructor.name === 'AbortSignal'
      ) {
        (fetchConfig as any).signal = signal;
      }

      const response = await fetch(url, fetchConfig);

      const contentType = response.headers.get('content-type');
      let data: any;

      if (contentType?.includes('application/json')) {
        data = await response.json();
      } else if (contentType?.includes('text')) {
        data = await response.text();
      } else {
        data = await response.blob();
      }

      if (!response.ok) {
        const error: ApiError = {
          message:
            data?.message ||
            data?.detail ||
            `Request failed with status ${response.status}`,
          status: response.status,
          code: data?.code,
          details: data,
        };
        throw error;
      }

      return {
        data,
        status: response.status,
        headers: response.headers,
        ok: response.ok,
      };
    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw {
          message: 'Request timeout',
          code: 'TIMEOUT',
        } as ApiError;
      }
      throw error;
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
      this.abortControllers.delete(requestId);
    }
  }

  /**
   * Makes a GET request
   *
   * @template T - The expected response data type
   * @param {string} path - API endpoint path
   * @param {RequestOptions} options - Request options
   * @returns {Promise<ApiResponse<T>>} The API response
   *
   * @example
   * ```typescript
   * const users = await client.get<User[]>('/users', {
   *   params: { limit: 10 }
   * });
   * ```
   */
  async get<T = any>(
    path: string,
    options?: RequestOptions,
  ): Promise<ApiResponse<T>> {
    return this.request<T>('GET', path, options);
  }

  /**
   * Makes a POST request
   *
   * @template T - The expected response data type
   * @param {string} path - API endpoint path
   * @param {any} data - Request body data
   * @param {RequestOptions} options - Request options
   * @returns {Promise<ApiResponse<T>>} The API response
   *
   * @example
   * ```typescript
   * const newUser = await client.post<User>('/users', {
   *   name: 'John Doe',
   *   email: 'john@example.com'
   * });
   * ```
   */
  async post<T = any>(
    path: string,
    data?: any,
    options?: RequestOptions,
  ): Promise<ApiResponse<T>> {
    return this.request<T>('POST', path, {
      ...options,
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * Makes a PUT request
   *
   * @template T - The expected response data type
   * @param {string} path - API endpoint path
   * @param {any} data - Request body data
   * @param {RequestOptions} options - Request options
   * @returns {Promise<ApiResponse<T>>} The API response
   *
   * @example
   * ```typescript
   * const updated = await client.put<User>('/users/123', {
   *   name: 'Jane Doe'
   * });
   * ```
   */
  async put<T = any>(
    path: string,
    data?: any,
    options?: RequestOptions,
  ): Promise<ApiResponse<T>> {
    return this.request<T>('PUT', path, {
      ...options,
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * Makes a PATCH request
   *
   * @template T - The expected response data type
   * @param {string} path - API endpoint path
   * @param {any} data - Request body data
   * @param {RequestOptions} options - Request options
   * @returns {Promise<ApiResponse<T>>} The API response
   *
   * @example
   * ```typescript
   * const patched = await client.patch<User>('/users/123', {
   *   email: 'newemail@example.com'
   * });
   * ```
   */
  async patch<T = any>(
    path: string,
    data?: any,
    options?: RequestOptions,
  ): Promise<ApiResponse<T>> {
    return this.request<T>('PATCH', path, {
      ...options,
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * Makes a DELETE request
   *
   * @template T - The expected response data type
   * @param {string} path - API endpoint path
   * @param {RequestOptions} options - Request options
   * @returns {Promise<ApiResponse<T>>} The API response
   *
   * @example
   * ```typescript
   * await client.delete('/users/123');
   * ```
   */
  async delete<T = any>(
    path: string,
    options?: RequestOptions,
  ): Promise<ApiResponse<T>> {
    return this.request<T>('DELETE', path, options);
  }

  /**
   * Cancels a specific pending request
   *
   * @param {string} method - HTTP method of the request
   * @param {string} url - Full URL of the request
   *
   * @example
   * ```typescript
   * client.cancelRequest('GET', 'https://api.example.com/users');
   * ```
   */
  cancelRequest(method: string, url: string): void {
    const requestId = `${method}-${url}`;
    const controller = this.abortControllers.get(requestId);
    if (controller) {
      controller.abort();
      this.abortControllers.delete(requestId);
    }
  }

  /**
   * Cancels all pending requests
   *
   * @example
   * ```typescript
   * client.cancelAllRequests();
   * ```
   */
  cancelAllRequests(): void {
    this.abortControllers.forEach(controller => controller.abort());
    this.abortControllers.clear();
  }

  /**
   * Updates the client configuration
   *
   * @param {Partial<ApiConfig>} config - Configuration updates
   *
   * @example
   * ```typescript
   * client.updateConfig({
   *   token: 'new-token',
   *   timeout: 60000
   * });
   * ```
   */
  updateConfig(config: Partial<ApiConfig>): void {
    Object.assign(this.config, config);
  }

  /**
   * Gets the current client configuration
   *
   * @returns {ApiConfig} Current configuration
   *
   * @example
   * ```typescript
   * const config = client.getConfig();
   * console.log(config.baseUrl);
   * ```
   */
  getConfig(): ApiConfig {
    return { ...this.config };
  }
}

/**
 * Factory function to create a new API client instance
 *
 * @param {ApiConfig} config - Configuration options
 * @returns {ApiClient} New API client instance
 *
 * @example
 * ```typescript
 * const client = createApiClient({
 *   baseUrl: 'https://api.example.com',
 *   token: 'your-api-token'
 * });
 * ```
 */
export const createApiClient = (config?: ApiConfig): ApiClient => {
  return new ApiClient(config);
};
