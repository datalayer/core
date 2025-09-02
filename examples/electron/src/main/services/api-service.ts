/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { net } from 'electron';
import FormData from 'form-data';
import log from 'electron-log/main';

interface SecureStore {
  credentials?: {
    runUrl: string;
    token: string;
  };
}

// Store instance will be initialized lazily
let store: import('electron-store').default<SecureStore> | null = null;

// Initialize store asynchronously
async function getStore() {
  if (!store) {
    const { default: Store } = await import('electron-store');
    store = new Store<SecureStore>({
      name: 'datalayer-secure',
      encryptionKey: 'datalayer-electron-app', // In production, use a more secure key
    });
  }
  return store;
}

// Whitelist of allowed domains for API requests
const ALLOWED_DOMAINS = [
  'prod1.datalayer.run',
  'localhost', // For development
];

class DatalayerAPIService {
  private baseUrl: string = 'https://prod1.datalayer.run';
  private token: string = '';

  constructor() {
    // Load stored credentials on startup (async)
    this.loadCredentials();
  }

  private async loadCredentials() {
    const storeInstance = await getStore();
    const stored = storeInstance.get('credentials');
    if (stored) {
      this.baseUrl = stored.runUrl;
      this.token = stored.token;
    }
  }

  /**
   * Validate if a URL is allowed based on domain whitelist
   */
  private isAllowedDomain(url: string): boolean {
    try {
      const parsedUrl = new URL(url);
      const hostname = parsedUrl.hostname;

      return ALLOWED_DOMAINS.some(domain => {
        if (domain === 'localhost') {
          return hostname === 'localhost' || hostname === '127.0.0.1';
        }
        return hostname === domain || hostname.endsWith(`.${domain}`);
      });
    } catch {
      return false;
    }
  }

  /**
   * Store credentials securely
   */
  async login(
    runUrl: string,
    token: string
  ): Promise<{ success: boolean; message?: string }> {
    try {
      // Validate the URL
      if (!this.isAllowedDomain(runUrl)) {
        throw new Error(`Domain not allowed: ${runUrl}`);
      }

      // Store credentials
      this.baseUrl = runUrl;
      this.token = token;

      const storeInstance = await getStore();
      storeInstance.set('credentials', { runUrl, token });

      // Test the credentials by fetching environments
      const testResponse = await this.getEnvironments();
      if (!testResponse.success) {
        throw new Error('Invalid credentials');
      }

      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed';
      return { success: false, message };
    }
  }

  /**
   * Clear stored credentials
   */
  async logout(): Promise<{ success: boolean }> {
    this.token = '';
    this.baseUrl = 'https://prod1.datalayer.run';
    const storeInstance = await getStore();
    storeInstance.delete('credentials');
    return { success: true };
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.token;
  }

  /**
   * Get stored credentials (without exposing token to renderer)
   */
  getCredentials(): { runUrl: string; isAuthenticated: boolean } {
    return {
      runUrl: this.baseUrl,
      isAuthenticated: this.isAuthenticated(),
    };
  }

  /**
   * Get credentials with token for collaboration (secure IPC only)
   */
  getCredentialsWithToken(): {
    runUrl: string;
    token?: string;
    isAuthenticated: boolean;
  } {
    return {
      runUrl: this.baseUrl,
      token: this.token,
      isAuthenticated: this.isAuthenticated(),
    };
  }

  /**
   * Make a generic API request with FormData using the form-data library
   */
  private async requestWithFormData(
    endpoint: string,
    options: {
      method?: string;
      formData: Record<string, string>;
      headers?: Record<string, string>;
    }
  ): Promise<Record<string, unknown>> {
    const url = `${this.baseUrl}${endpoint}`;

    log.debug(`[FormData Request] Starting request to: ${url}`);
    log.debug(`[FormData Request] Method: ${options.method || 'POST'}`);
    log.debug(
      `[FormData Request] Token available: ${this.token ? 'YES' : 'NO'}`
    );

    // Log FormData entries
    log.debug(`[FormData Request] FormData entries:`, options.formData);

    // Validate domain
    if (!this.isAllowedDomain(url)) {
      throw new Error(`Domain not allowed: ${url}`);
    }

    // Create form-data instance
    const form = new FormData();
    Object.entries(options.formData).forEach(([key, value]) => {
      form.append(key, value);
    });

    // Use Electron's net module for requests (bypasses CORS)
    return new Promise((resolve, reject) => {
      const request = net.request({
        method: options.method || 'POST',
        url,
      });

      // Set authorization header
      if (this.token) {
        request.setHeader('Authorization', `Bearer ${this.token}`);
        log.debug(`[FormData Request] Authorization header set`);
      } else {
        log.warn(`[FormData Request] WARNING: No authorization token!`);
      }

      // Set additional headers (excluding Content-Type which will be set by form-data)
      if (options.headers) {
        Object.entries(options.headers).forEach(([key, value]) => {
          if (key.toLowerCase() !== 'content-type') {
            request.setHeader(key, value);
          }
        });
      }

      // Set Content-Type with proper boundary from form-data
      const headers = form.getHeaders();
      Object.entries(headers).forEach(([key, value]) => {
        request.setHeader(key, value);
      });

      log.debug(`[FormData Request] Headers set:`, headers);

      // Handle response
      let responseData = '';

      request.on('response', response => {
        response.on('data', chunk => {
          responseData += chunk.toString();
        });

        response.on('end', () => {
          try {
            // Log response for debugging
            log.debug(
              `[FormData Response] Status: ${response.statusCode} for ${endpoint}`
            );
            log.debug(
              `[FormData Response] Response headers:`,
              response.headers
            );
            log.debug(`[FormData Response] Raw body: ${responseData}`);

            const data = responseData ? JSON.parse(responseData) : {};
            log.debug(
              `[FormData Response] Parsed data:`,
              JSON.stringify(data, null, 2)
            );

            if (
              response.statusCode &&
              response.statusCode >= 200 &&
              response.statusCode < 300
            ) {
              log.debug(`[FormData Response] Success! Resolving with data`);
              resolve(data);
            } else {
              const errorMsg =
                data.message ||
                data.error ||
                data.detail ||
                `HTTP ${response.statusCode}`;
              log.error(`[FormData Response] Error: ${errorMsg}`);
              reject(new Error(errorMsg));
            }
          } catch (error) {
            log.error(`[FormData Response] Parse error:`, error);
            log.debug(`[FormData Response] Raw response was:`, responseData);
            reject(new Error(`Failed to parse response: ${responseData}`));
          }
        });
      });

      request.on('error', error => {
        log.error(`[FormData Request] Request error:`, error);
        reject(error);
      });

      // Get the form data as a buffer and write it to the request
      try {
        const chunks: Buffer[] = [];
        let formEnded = false;

        form.on('data', chunk => {
          log.debug(`[FormData Request] Received chunk: ${chunk.length} bytes`);
          // Ensure chunk is a Buffer
          const buffer = chunk instanceof Buffer ? chunk : Buffer.from(chunk);
          chunks.push(buffer);
        });

        form.on('end', () => {
          log.debug(`[FormData Request] Form stream ended`);
          formEnded = true;
          const body = Buffer.concat(chunks);
          log.debug(`[FormData Request] Form body length: ${body.length}`);
          log.debug(`[FormData Request] Writing body to request...`);
          request.write(body);
          log.debug(`[FormData Request] Ending request...`);
          request.end();
        });

        form.on('error', error => {
          log.error(`[FormData Request] Form error:`, error);
          reject(error);
        });

        // Ensure we start reading from the form
        form.resume();

        // Add a timeout in case the form never ends
        setTimeout(() => {
          if (!formEnded) {
            log.warn(`[FormData Request] Form timeout - forcing end`);
            reject(new Error('FormData timeout'));
          }
        }, 10000); // 10 second timeout
      } catch (error) {
        log.error(`[FormData Request] Error setting up form:`, error);
        reject(error);
      }
    });
  }

  /**
   * Make a generic API request
   */
  private async request(
    endpoint: string,
    options: {
      method?: string;
      body?: Record<string, unknown>;
      headers?: Record<string, string>;
    } = {}
  ): Promise<Record<string, unknown>> {
    const url = `${this.baseUrl}${endpoint}`;

    // Validate domain
    if (!this.isAllowedDomain(url)) {
      throw new Error(`Domain not allowed: ${url}`);
    }

    // Use Electron's net module for requests (bypasses CORS)
    return new Promise((resolve, reject) => {
      const request = net.request({
        method: options.method || 'GET',
        url,
      });

      // Set headers
      request.setHeader('Content-Type', 'application/json');
      if (this.token) {
        request.setHeader('Authorization', `Bearer ${this.token}`);
      }
      if (options.headers) {
        Object.entries(options.headers).forEach(([key, value]) => {
          request.setHeader(key, value);
        });
      }

      // Handle response
      let responseData = '';

      request.on('response', response => {
        response.on('data', chunk => {
          responseData += chunk.toString();
        });

        response.on('end', () => {
          try {
            // Log response for debugging
            log.debug(`[API Request] ${response.statusCode} for ${endpoint}`);
            log.debug(`[API Response] Raw: ${responseData}`);

            const data = responseData ? JSON.parse(responseData) : {};
            log.debug(`[API Response] Parsed:`, JSON.stringify(data, null, 2));

            if (
              response.statusCode &&
              response.statusCode >= 200 &&
              response.statusCode < 300
            ) {
              resolve(data);
            } else {
              const errorMsg =
                data.message ||
                data.error ||
                data.detail ||
                `Request failed with status ${response.statusCode}: ${responseData}`;
              log.error(`[API Error] ${response.statusCode}: ${errorMsg}`);
              reject(new Error(errorMsg));
            }
          } catch {
            reject(new Error(`Failed to parse response: ${responseData}`));
          }
        });
      });

      request.on('error', error => {
        reject(error);
      });

      // Send body if present
      if (options.body) {
        request.write(JSON.stringify(options.body));
      }

      request.end();
    });
  }

  /**
   * Fetch available environments
   */
  async getEnvironments(): Promise<{
    success: boolean;
    data?: Record<string, unknown>[];
    error?: string;
  }> {
    try {
      const response = await this.request('/api/runtimes/v1/environments');
      return {
        success: true,
        data: (response.environments as Record<string, unknown>[]) || [],
      };
    } catch (error) {
      log.error('Failed to fetch environments:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to fetch environments',
      };
    }
  }

  /**
   * Create a runtime
   */
  async createRuntime(options: {
    environment: string;
    name?: string;
    credits?: number;
  }): Promise<{
    success: boolean;
    data?: Record<string, unknown>;
    error?: string;
  }> {
    try {
      const requestBody = {
        environment_name: options.environment,
        type: 'notebook',
        given_name: options.name || `runtime-${Date.now()}`,
        credits_limit: options.credits || 100,
        capabilities: [],
        // Don't include 'from' field if empty
      };

      log.debug(
        '[API] Creating runtime with body:',
        JSON.stringify(requestBody, null, 2)
      );

      const response = await this.request('/api/runtimes/v1/runtimes', {
        method: 'POST',
        body: requestBody,
        headers: {
          // Don't use X-External-Token, just use the regular Bearer auth
        },
      });
      return { success: true, data: response };
    } catch (error) {
      log.error('Failed to create runtime:', error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to create runtime',
      };
    }
  }

  /**
   * Get collaboration session ID for a document
   */
  async getCollaborationSessionId(documentId: string): Promise<{
    success: boolean;
    sessionId?: string;
    error?: string;
  }> {
    try {
      const response = await this.request(
        `/api/spacer/v1/documents/${documentId}`
      );
      return {
        success: true,
        sessionId: (response as { sessionId?: string }).sessionId || documentId,
      };
    } catch (error) {
      log.error('Failed to get collaboration session ID:', error);
      // For Datalayer, the document UID is often used as the session ID
      log.info(`Using document UID as session ID: ${documentId}`);
      return {
        success: true,
        sessionId: documentId,
      };
    }
  }

  /**
   * Get user spaces
   */
  async getUserSpaces(): Promise<{
    success: boolean;
    data?: Record<string, unknown>[];
    error?: string;
  }> {
    try {
      const response = await this.request('/api/spacer/v1/spaces/users/me');
      return {
        success: true,
        data: (response.spaces as Record<string, unknown>[]) || [],
      };
    } catch (error) {
      log.error('Failed to fetch user spaces:', error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to fetch spaces',
      };
    }
  }

  /**
   * Get all items in a space
   */
  async getSpaceItems(spaceId: string): Promise<{
    success: boolean;
    data?: Record<string, unknown>[];
    error?: string;
  }> {
    try {
      const response = await this.request(
        `/api/spacer/v1/spaces/${spaceId}/items`
      );
      // The response has items directly or nested in the response
      const items = response.items
        ? (response.items as Record<string, unknown>[])
        : Array.isArray(response)
          ? (response as Record<string, unknown>[])
          : [];
      return { success: true, data: items };
    } catch (error) {
      log.error('Failed to fetch space items:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch items',
      };
    }
  }

  /**
   * Create a new notebook in a space
   */
  async createNotebook(
    spaceId: string,
    name: string,
    description?: string
  ): Promise<{
    success: boolean;
    data?: Record<string, unknown>;
    error?: string;
  }> {
    try {
      log.debug(`[NOTEBOOK CREATION] Starting createNotebook method`);
      log.debug(`[NOTEBOOK CREATION] Space ID: ${spaceId}`);
      log.debug(`[NOTEBOOK CREATION] Name: ${name}`);
      log.debug(`[NOTEBOOK CREATION] Description: ${description}`);

      // Prepare FormData object for the form-data library
      const formDataFields = {
        spaceId,
        notebookType: 'notebook',
        name,
        description: description || '',
      };

      log.debug('Creating notebook with FormData:', formDataFields);

      // Try with JSON first to see if FormData is required
      log.debug(`[NOTEBOOK CREATION] About to try JSON request first...`);
      try {
        const jsonPayload = {
          spaceId,
          notebookType: 'notebook',
          name,
          description: description || '',
        };

        const response = await this.request('/api/spacer/v1/notebooks', {
          method: 'POST',
          body: jsonPayload,
        });
        log.debug(`[NOTEBOOK CREATION] JSON request completed successfully`);
        log.debug(`[NOTEBOOK CREATION] Response:`, response);
        return { success: true, data: response };
      } catch (jsonError) {
        log.debug(
          `[NOTEBOOK CREATION] JSON request failed, trying FormData...`,
          jsonError
        );

        // Fallback to FormData using the form-data library
        const response = await this.requestWithFormData(
          '/api/spacer/v1/notebooks',
          {
            method: 'POST',
            formData: formDataFields,
          }
        );
        log.debug(`[NOTEBOOK CREATION] requestWithFormData completed`);
        log.debug(`[NOTEBOOK CREATION] Response:`, response);
        return { success: true, data: response };
      }
    } catch (error) {
      log.error('Failed to create notebook:', error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to create notebook',
      };
    }
  }

  /**
   * List notebooks in a space
   */
  async listNotebooks(spaceId?: string): Promise<{
    success: boolean;
    data?: Record<string, unknown>[];
    spaceInfo?: Record<string, unknown>;
    error?: string;
  }> {
    try {
      log.debug('listNotebooks: Starting notebook fetch...');
      log.debug(
        'listNotebooks: Current token:',
        this.token ? 'Set' : 'Not set'
      );
      log.debug('listNotebooks: Current baseUrl:', this.baseUrl);

      // Check if we're authenticated
      if (!this.token) {
        log.warn('listNotebooks: No token available, returning mock data');
        // Return mock data for demo
        return {
          success: true,
          data: [
            {
              uid: 'mock-1',
              name_t: 'Sample Data Analysis.ipynb',
              creation_ts_dt: new Date(Date.now() - 86400000).toISOString(),
              last_update_ts_dt: new Date().toISOString(),
              type: 'notebook',
            },
            {
              uid: 'mock-2',
              name_t: 'Machine Learning Tutorial.ipynb',
              creation_ts_dt: new Date(Date.now() - 172800000).toISOString(),
              last_update_ts_dt: new Date(Date.now() - 3600000).toISOString(),
              type: 'notebook',
            },
            {
              uid: 'mock-3',
              name_t: 'Data Visualization.ipynb',
              creation_ts_dt: new Date(Date.now() - 259200000).toISOString(),
              last_update_ts_dt: new Date(Date.now() - 7200000).toISOString(),
              type: 'notebook',
            },
          ],
          error: 'Using mock data - not authenticated',
        };
      }

      // First get user spaces if no spaceId provided
      let selectedSpace: Record<string, unknown> | undefined;

      if (!spaceId) {
        log.debug(
          'listNotebooks: No spaceId provided, fetching user spaces...'
        );
        const spacesResponse = await this.getUserSpaces();
        log.debug(
          'listNotebooks: Spaces response:',
          JSON.stringify(spacesResponse, null, 2)
        );

        if (
          spacesResponse.success &&
          spacesResponse.data &&
          spacesResponse.data.length > 0
        ) {
          // Find default space or one called "library"
          selectedSpace =
            spacesResponse.data.find(
              (space: Record<string, unknown>) =>
                space.handle === 'library' ||
                space.name === 'Library' ||
                space.is_default === true
            ) || spacesResponse.data[0];

          log.debug('listNotebooks: Selected space:', selectedSpace);

          if (selectedSpace) {
            spaceId =
              (selectedSpace.id as string) || (selectedSpace.uid as string);
          }
        } else {
          log.warn('listNotebooks: No spaces found, using mock data');
          // Return mock data if no spaces
          return {
            success: true,
            data: [
              {
                uid: 'mock-1',
                name_t: 'Welcome to Datalayer.ipynb',
                creation_ts_dt: new Date().toISOString(),
                last_update_ts_dt: new Date().toISOString(),
                type: 'notebook',
              },
            ],
            error: spacesResponse.error || 'No spaces available',
          };
        }
      }

      if (!spaceId) {
        log.warn('listNotebooks: No space available, returning mock data');
        return {
          success: true,
          data: [
            {
              uid: 'mock-1',
              name_t: 'Getting Started.ipynb',
              creation_ts_dt: new Date().toISOString(),
              last_update_ts_dt: new Date().toISOString(),
              type: 'notebook',
            },
          ],
          error: 'No spaces available',
        };
      }

      log.debug(`listNotebooks: Fetching items from space ${spaceId}...`);

      // Fetch all items from the space
      const itemsResponse = await this.getSpaceItems(spaceId);
      log.debug(
        'listNotebooks: Items response:',
        JSON.stringify(itemsResponse, null, 2)
      );

      if (
        itemsResponse.success &&
        itemsResponse.data &&
        itemsResponse.data.length > 0
      ) {
        // Filter only notebook items - the field is type_s in the actual response
        const notebooks = itemsResponse.data.filter(
          (item: Record<string, unknown>) =>
            item.type === 'notebook' ||
            item.type_s === 'notebook' ||
            item.item_type === 'notebook'
        );

        log.debug(
          `listNotebooks: Found ${notebooks.length} notebooks out of ${itemsResponse.data.length} items`
        );

        if (notebooks.length > 0) {
          return {
            success: true,
            data: notebooks,
            spaceInfo: selectedSpace,
          };
        }
      }

      // Fallback to specific notebook endpoint
      log.debug('listNotebooks: Trying fallback notebook endpoint...');
      const response = await this.request(
        `/api/spacer/v1/spaces/${spaceId}/items/types/notebook`
      );

      log.debug(
        'listNotebooks: Fallback response:',
        JSON.stringify(response, null, 2)
      );

      const items = response.items
        ? (response.items as Record<string, unknown>[])
        : Array.isArray(response)
          ? (response as Record<string, unknown>[])
          : [];
      return {
        success: true,
        data: items,
        spaceInfo: selectedSpace,
      };
    } catch (error) {
      log.error('listNotebooks: Error fetching notebooks:', error);
      // Return mock data on error
      return {
        success: true,
        data: [
          {
            uid: 'error-mock-1',
            name_t: 'Example Notebook.ipynb',
            creation_ts_dt: new Date().toISOString(),
            last_update_ts_dt: new Date().toISOString(),
            type: 'notebook',
          },
        ],
        error:
          error instanceof Error ? error.message : 'Failed to fetch notebooks',
      };
    }
  }

  /**
   * Generic API request handler for other endpoints
   */
  async makeRequest(
    endpoint: string,
    options: {
      method?: string;
      body?: Record<string, unknown>;
      headers?: Record<string, string>;
    } = {}
  ): Promise<{
    success: boolean;
    data?: Record<string, unknown>;
    error?: string;
  }> {
    try {
      const response = await this.request(endpoint, options);
      return { success: true, data: response };
    } catch (error) {
      log.error(`API request failed for ${endpoint}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Request failed',
      };
    }
  }

  /**
   * Get runtime details including pod information
   */
  async getRuntimeDetails(runtimeId: string): Promise<{
    success: boolean;
    data?: Record<string, unknown>;
    error?: string;
  }> {
    try {
      const response = await this.request(
        `/api/runtimes/v1/runtimes/${runtimeId}`
      );
      return { success: true, data: response };
    } catch (error: unknown) {
      log.error('Failed to get runtime details:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to get runtime details',
      };
    }
  }

  /**
   * Check if a runtime is still running and accessible
   */
  async isRuntimeActive(podName: string): Promise<{
    success: boolean;
    isActive: boolean;
    runtime?: Record<string, unknown>;
    error?: string;
  }> {
    try {
      // Get runtime details to check if it exists and is running
      const response = await this.getRuntimeDetails(podName);

      if (!response.success) {
        return { success: true, isActive: false };
      }

      const runtime = response.data;
      const status = (runtime as Record<string, unknown>)?.status as string;

      // Check if runtime is in a running state
      const isActive =
        status === 'running' || status === 'active' || status === 'ready';

      return {
        success: true,
        isActive,
        runtime: isActive ? runtime : undefined,
      };
    } catch (error: unknown) {
      log.error('Failed to check runtime status:', error);
      return {
        success: false,
        isActive: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to check runtime status',
      };
    }
  }

  /**
   * List all user runtimes to find active ones
   */
  async listUserRuntimes(): Promise<{
    success: boolean;
    data?: Record<string, unknown>[];
    error?: string;
  }> {
    try {
      const response = await this.request('/api/runtimes/v1/runtimes');

      if (Array.isArray(response)) {
        return { success: true, data: response };
      } else if (
        response &&
        typeof response === 'object' &&
        'runtimes' in response
      ) {
        return {
          success: true,
          data: (response as Record<string, unknown>).runtimes as Record<
            string,
            unknown
          >[],
        };
      }

      return { success: true, data: [] };
    } catch (error: unknown) {
      log.error('Failed to list user runtimes:', error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to list runtimes',
      };
    }
  }

  /**
   * Delete a runtime
   */
  async deleteRuntime(
    runtimeId: string
  ): Promise<{ success: boolean; error?: string; message?: string }> {
    try {
      const response = await this.request(
        `/api/runtimes/v1/runtimes/${runtimeId}`,
        {
          method: 'DELETE',
          // The request method already adds Authorization: Bearer header automatically
        }
      );

      // The API returns { success: true, message: "string" }
      if (response && response.success) {
        log.info(
          `Runtime ${runtimeId} deleted successfully:`,
          response.message
        );
        return {
          success: true,
          message:
            (response as { message?: string }).message ||
            'Runtime deleted successfully',
        };
      } else {
        log.error('Delete runtime API returned failure:', response);
        return {
          success: false,
          error:
            (response as { message?: string })?.message ||
            'Failed to delete runtime',
        };
      }
    } catch (error: unknown) {
      log.error('Failed to delete runtime:', error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to delete runtime',
      };
    }
  }

  /**
   * Delete a notebook/item by ID
   */
  async deleteNotebook(
    spaceId: string,
    itemId: string
  ): Promise<{ success: boolean; error?: string; message?: string }> {
    try {
      log.debug(
        `[DELETE NOTEBOOK] Starting deleteNotebook for item ${itemId} in space ${spaceId}`
      );

      const response = await this.request(
        `/api/spacer/v1/spaces/items/${itemId}`,
        {
          method: 'DELETE',
        }
      );

      log.debug(`[DELETE NOTEBOOK] API response:`, response);

      return {
        success: true,
        message:
          (response as { message?: string })?.message ||
          'Notebook deleted successfully',
      };
    } catch (error: unknown) {
      log.error('Failed to delete notebook:', error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to delete notebook',
      };
    }
  }

  /**
   * Get current user information from IAM
   */
  async getCurrentUser(): Promise<{
    success: boolean;
    data?: Record<string, unknown>;
    error?: string;
  }> {
    try {
      log.debug(`[IAM API] Fetching current user info`);
      const response = await this.request('/api/iam/v1/whoami');
      log.debug(`[IAM API] Current user info:`, response);
      // The response contains profile nested, extract it
      const profile = (response as any).profile || response;
      return { success: true, data: profile };
    } catch (error) {
      log.error('Failed to fetch current user:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to fetch current user',
      };
    }
  }

  /**
   * Fetch GitHub user data
   */
  async getGitHubUser(githubId: number): Promise<{
    success: boolean;
    data?: Record<string, unknown>;
    error?: string;
  }> {
    try {
      log.debug(`[GitHub API] Fetching user data for ID: ${githubId}`);

      // Use Electron's net module to fetch from GitHub API
      return new Promise((resolve, reject) => {
        const request = net.request({
          method: 'GET',
          url: `https://api.github.com/user/${githubId}`,
        });

        // Set headers for GitHub API
        request.setHeader('Accept', 'application/vnd.github.v3+json');
        request.setHeader('User-Agent', 'Datalayer-Electron-App');

        let responseData = '';

        request.on('response', response => {
          response.on('data', chunk => {
            responseData += chunk.toString();
          });

          response.on('end', () => {
            try {
              const data = responseData ? JSON.parse(responseData) : {};

              if (
                response.statusCode &&
                response.statusCode >= 200 &&
                response.statusCode < 300
              ) {
                log.debug(`[GitHub API] User data fetched successfully`);
                resolve({ success: true, data });
              } else if (response.statusCode === 404) {
                // User not found, try search API as fallback
                log.debug(
                  `[GitHub API] User not found by ID, trying search API`
                );
                this.searchGitHubUser(githubId)
                  .then(searchResult => resolve(searchResult))
                  .catch(error => reject(error));
              } else {
                const errorMsg = data.message || `HTTP ${response.statusCode}`;
                log.error(`[GitHub API] Error: ${errorMsg}`);
                reject(new Error(errorMsg));
              }
            } catch (error) {
              log.error(`[GitHub API] Parse error:`, error);
              reject(new Error(`Failed to parse response: ${responseData}`));
            }
          });
        });

        request.on('error', error => {
          log.error(`[GitHub API] Request error:`, error);
          reject(error);
        });

        request.end();
      });
    } catch (error) {
      log.error('Failed to fetch GitHub user:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to fetch GitHub user',
      };
    }
  }

  /**
   * Search GitHub user by ID (fallback)
   */
  private async searchGitHubUser(githubId: number): Promise<{
    success: boolean;
    data?: Record<string, unknown>;
    error?: string;
  }> {
    return new Promise(resolve => {
      const request = net.request({
        method: 'GET',
        url: `https://api.github.com/search/users?q=id:${githubId}`,
      });

      request.setHeader('Accept', 'application/vnd.github.v3+json');
      request.setHeader('User-Agent', 'Datalayer-Electron-App');

      let responseData = '';

      request.on('response', response => {
        response.on('data', chunk => {
          responseData += chunk.toString();
        });

        response.on('end', () => {
          try {
            const data = responseData ? JSON.parse(responseData) : {};

            if (
              response.statusCode &&
              response.statusCode >= 200 &&
              response.statusCode < 300
            ) {
              const items = data.items || [];
              if (items.length > 0) {
                log.debug(`[GitHub API] User found via search`);
                resolve({ success: true, data: items[0] });
              } else {
                // Return a default user object if nothing found
                log.debug(`[GitHub API] No user found, returning default`);
                resolve({
                  success: true,
                  data: {
                    login: 'User',
                    name: 'Datalayer User',
                    avatar_url: `https://avatars.githubusercontent.com/u/${githubId}?v=4`,
                    id: githubId,
                  },
                });
              }
            } else {
              log.error(`[GitHub API] Search failed: ${response.statusCode}`);
              resolve({
                success: false,
                error: `GitHub search failed: ${response.statusCode}`,
              });
            }
          } catch (error) {
            log.error(`[GitHub API] Search parse error:`, error);
            resolve({
              success: false,
              error: 'Failed to parse search response',
            });
          }
        });
      });

      request.on('error', error => {
        log.error(`[GitHub API] Search request error:`, error);
        resolve({
          success: false,
          error: error.message || 'GitHub search request failed',
        });
      });

      request.end();
    });
  }
}

// Export singleton instance
export const apiService = new DatalayerAPIService();
