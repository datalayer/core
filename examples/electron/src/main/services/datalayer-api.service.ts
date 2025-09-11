/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { net } from 'electron';
import log from 'electron-log/main';
import BaseService from '../models/base.service';
import { CHANNELS } from '../../shared/channels';
import type {
  IDatalayerApiService,
  IDatalayerCredentials,
  IEnvironment,
  IRuntime,
  ICreateRuntimeOptions,
  INotebook,
  ISpace,
  IUser,
} from '../../shared/services/datalayer-api.interface';

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

export default class DatalayerApiService
  extends BaseService
  implements IDatalayerApiService
{
  protected readonly channel = CHANNELS.DATALAYER_API;
  protected readonly allowedMethods = new Set([
    'login',
    'logout',
    'getCredentialsWithToken',
    'getCurrentUser',
    'getEnvironments',
    'listUserRuntimes',
    'createRuntime',
    'deleteRuntime',
    'getRuntimeDetails',
    'isRuntimeActive',
    'listNotebooks',
    'createNotebook',
    'deleteNotebook',
    'getUserSpaces',
    'getSpaceItems',
    'getCollaborationSessionId',
    'getGitHubUser',
    'makeRequest',
  ]);

  private static instance: DatalayerApiService;
  private baseUrl: string = 'https://prod1.datalayer.run';
  private token: string = '';

  public static getInstance(): DatalayerApiService {
    if (!DatalayerApiService.instance) {
      DatalayerApiService.instance = new DatalayerApiService();
    }
    return DatalayerApiService.instance;
  }

  constructor() {
    super();
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
  async login(runUrl: string, token: string): Promise<boolean> {
    log.info('🎯 [LOGIN SERVICE] Login called with:', {
      runUrl,
      token: token ? 'TOKEN_PROVIDED' : 'NO_TOKEN',
    });
    try {
      // Validate the URL
      if (!this.isAllowedDomain(runUrl)) {
        throw new Error(`Domain not allowed: ${runUrl}`);
      }

      log.info('🎯 [LOGIN SERVICE] URL validation passed');

      // Store credentials
      this.baseUrl = runUrl;
      this.token = token;

      log.info('🎯 [LOGIN SERVICE] Storing credentials...');
      const storeInstance = await getStore();
      storeInstance.set('credentials', { runUrl, token });

      // Don't test credentials during login - validation happens when app loads
      // This prevents login failures due to API timing issues
      log.info(
        '🎯 [LOGIN SERVICE] Credentials stored successfully, will validate on app usage'
      );
      return true;
    } catch (error) {
      log.error('🎯 [LOGIN SERVICE] Login failed:', error);
      return false;
    }
  }

  /**
   * Clear stored credentials
   */
  async logout(): Promise<void> {
    this.baseUrl = '';
    this.token = '';

    const storeInstance = await getStore();
    storeInstance.delete('credentials');
    log.info('Logged out successfully');
  }

  /**
   * Get stored credentials with token
   */
  getCredentialsWithToken(): IDatalayerCredentials | null {
    // Return credentials if already loaded, otherwise return null
    // Credentials should be loaded during initialization

    if (!this.baseUrl || !this.token) {
      return null;
    }

    return {
      runUrl: this.baseUrl,
      token: this.token,
      isAuthenticated: true,
    };
  }

  /**
   * Get current user information
   */
  async getCurrentUser(): Promise<IUser> {
    const response = await this.makeRequest('/api/iam/v1/whoami');

    if (!response.success || !response.data) {
      throw new Error('Failed to get current user');
    }

    const userData = response.data.profile || response.data;
    return {
      id: userData.sub || userData.id,
      username: userData.preferred_username || userData.username,
      email: userData.email,
      githubId: userData.origin_s?.split(':').pop() || undefined,
    };
  }

  /**
   * Get available environments
   */
  async getEnvironments(): Promise<IEnvironment[]> {
    const response = await this.makeRequest('/api/runtimes/v1/environments');
    if (!response.success) {
      throw new Error(response.error || 'Failed to get environments');
    }
    return response.data?.environments || [];
  }

  /**
   * List user runtimes
   */
  async listUserRuntimes(): Promise<IRuntime[]> {
    const response = await this.makeRequest('/api/runtimes/v1/runtimes');
    if (!response.success) {
      throw new Error(response.error || 'Failed to list runtimes');
    }
    return response.data || [];
  }

  /**
   * Create a new runtime
   */
  async createRuntime(options: ICreateRuntimeOptions): Promise<any> {
    const requestBody = {
      environment_name: options.environmentId, // API expects environment_name
      type: 'notebook',
      given_name: options.name || `runtime-${Date.now()}`,
      credits_limit: 100,
      capabilities: [],
    };

    log.info('🚀 [RUNTIME CREATION] Starting runtime creation...');
    log.info(
      '🚀 [RUNTIME CREATION] Request body:',
      JSON.stringify(requestBody, null, 2)
    );

    const response = await this.makeRequest('/api/runtimes/v1/runtimes', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });

    if (!response.success) {
      throw new Error(response.error || 'Failed to create runtime');
    }

    log.info(
      '🚀 [RUNTIME CREATION] Raw API response:',
      JSON.stringify(response.data, null, 2)
    );
    return response.data;
  }

  /**
   * Delete a runtime
   */
  async deleteRuntime(podName: string): Promise<void> {
    const response = await this.makeRequest(
      `/api/runtimes/v1/runtimes/${podName}`,
      {
        method: 'DELETE',
      }
    );

    if (!response.success) {
      throw new Error(response.error || 'Failed to delete runtime');
    }
  }

  /**
   * Get runtime details
   */
  async getRuntimeDetails(runtimeId: string): Promise<IRuntime> {
    const response = await this.makeRequest(
      `/api/runtimes/v1/runtimes/${runtimeId}`
    );
    if (!response.success) {
      throw new Error(response.error || 'Failed to get runtime details');
    }
    return response.data;
  }

  /**
   * Check if runtime is active
   */
  async isRuntimeActive(podName: string): Promise<boolean> {
    try {
      const runtime = await this.getRuntimeDetails(podName);
      return runtime.status === 'running';
    } catch {
      return false;
    }
  }

  /**
   * List notebooks - Complex implementation to match original behavior
   */
  async listNotebooks(): Promise<INotebook[]> {
    try {
      log.debug('listNotebooks: Starting notebook fetch...');

      // First get user spaces to find default space
      const spaces = await this.getUserSpaces();
      if (!spaces.length) {
        log.warn('listNotebooks: No spaces found, returning empty array');
        return [];
      }

      // Find default space or first one
      const selectedSpace =
        spaces.find(
          (space: any) =>
            space.handle === 'library' ||
            space.name === 'Library' ||
            space.is_default === true
        ) || spaces[0];

      const spaceId = selectedSpace.id || (selectedSpace as any).uid;
      if (!spaceId) {
        log.warn('listNotebooks: No valid space ID found');
        return [];
      }

      log.debug(`listNotebooks: Using space ${spaceId}...`);

      // Get all items from the space
      const items = await this.getSpaceItems(spaceId);

      // Filter for notebooks only
      const notebooks = items.filter(
        (item: any) =>
          item.type === 'notebook' ||
          item.type_s === 'notebook' ||
          item.item_type === 'notebook'
      );

      log.debug(
        `listNotebooks: Found ${notebooks.length} notebooks out of ${items.length} items`
      );

      return notebooks;
    } catch (error) {
      log.error('listNotebooks: Error fetching notebooks:', error);
      throw error;
    }
  }

  /**
   * Create a new notebook
   */
  async createNotebook(
    spaceId: string,
    name: string,
    description?: string
  ): Promise<INotebook> {
    const response = await this.makeRequest('/api/spacer/v1/notebooks', {
      method: 'POST',
      body: JSON.stringify({ spaceId, name, description }),
    });

    if (!response.success) {
      throw new Error(response.error || 'Failed to create notebook');
    }

    return response.data;
  }

  /**
   * Delete a notebook
   */
  async deleteNotebook(_spaceId: string, itemId: string): Promise<void> {
    const response = await this.makeRequest(
      `/api/spacer/v1/notebooks/${itemId}`,
      {
        method: 'DELETE',
      }
    );

    if (!response.success) {
      throw new Error(response.error || 'Failed to delete notebook');
    }
  }

  /**
   * Get user spaces
   */
  async getUserSpaces(): Promise<ISpace[]> {
    const response = await this.makeRequest('/api/spacer/v1/spaces/users/me');
    if (!response.success) {
      throw new Error(response.error || 'Failed to get user spaces');
    }
    // The original API returns spaces directly in the response, not nested under data
    return response.data?.spaces || response.data || [];
  }

  /**
   * Get space items
   */
  async getSpaceItems(spaceId: string): Promise<any[]> {
    const response = await this.makeRequest(
      `/api/spacer/v1/spaces/${spaceId}/items`
    );
    if (!response.success) {
      throw new Error(response.error || 'Failed to get space items');
    }
    return response.data || [];
  }

  /**
   * Get collaboration session ID for a document
   */
  async getCollaborationSessionId(
    documentId: string
  ): Promise<{ success: boolean; sessionId?: string; error?: string }> {
    try {
      const response = await this.makeRequest(
        `/api/spacer/v1/documents/${documentId}`
      );
      if (!response.success) {
        // For Datalayer, the document UID is often used as the session ID
        log.info(`Using document UID as session ID: ${documentId}`);
        return {
          success: true,
          sessionId: documentId,
        };
      }
      return {
        success: true,
        sessionId: response.data?.sessionId || documentId,
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
   * Get GitHub user information
   */
  async getGitHubUser(githubId: number): Promise<any> {
    return new Promise((resolve, reject) => {
      const url = `https://api.github.com/user/${githubId}`;

      const request = net.request({
        method: 'GET',
        url,
        headers: {
          'User-Agent': 'Datalayer Electron App',
          Accept: 'application/vnd.github.v3+json',
        },
      });

      let responseData = '';

      request.on('response', response => {
        response.on('data', chunk => {
          responseData += chunk.toString();
        });

        response.on('end', () => {
          try {
            if (response.statusCode === 200) {
              const userData = JSON.parse(responseData);
              resolve(userData);
            } else {
              reject(
                new Error(
                  `GitHub API responded with status ${response.statusCode}`
                )
              );
            }
          } catch (parseError) {
            reject(new Error('Failed to parse GitHub API response'));
          }
        });
      });

      request.on('error', error => {
        log.error(`[GitHub API] Request error:`, error);
        reject(error);
      });

      request.end();
    });
  }

  /**
   * Make a generic API request
   */
  async makeRequest(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      // Ensure credentials are loaded if not already present
      if (!this.baseUrl || !this.token) {
        await this.loadCredentials();
      }

      if (!this.baseUrl || !this.token) {
        throw new Error('Not authenticated - please login first');
      }

      const url = `${this.baseUrl}${endpoint}`;

      // Validate the URL
      if (!this.isAllowedDomain(url)) {
        throw new Error(`Domain not allowed: ${url}`);
      }

      return new Promise(resolve => {
        const headers: Record<string, string> = {
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        };

        if (options.headers) {
          Object.assign(headers, options.headers);
        }

        const requestOptions = {
          method: options.method || 'GET',
          url,
          headers,
        };

        const request = net.request(requestOptions);

        let responseData = '';

        request.on('response', response => {
          response.on('data', chunk => {
            responseData += chunk.toString();
          });

          response.on('end', () => {
            try {
              let data = null;
              if (responseData.trim()) {
                data = JSON.parse(responseData);
              }

              if (
                response.statusCode &&
                response.statusCode >= 200 &&
                response.statusCode < 300
              ) {
                resolve({ success: true, data });
              } else {
                resolve({
                  success: false,
                  error: `API request failed with status ${response.statusCode}`,
                });
              }
            } catch (parseError) {
              resolve({
                success: false,
                error: 'Failed to parse API response',
              });
            }
          });
        });

        request.on('error', error => {
          log.error(`[API] Request error:`, error);
          resolve({
            success: false,
            error: error.message || 'Network request failed',
          });
        });

        // Add body if present
        if (options.body) {
          if (typeof options.body === 'string') {
            request.write(options.body);
          } else if (options.body instanceof ArrayBuffer) {
            request.write(Buffer.from(options.body));
          } else if (options.body instanceof Uint8Array) {
            request.write(Buffer.from(options.body));
          } else {
            request.write(JSON.stringify(options.body));
          }
        }

        request.end();
      });
    } catch (error) {
      log.error('[API] Request failed:', error);
      return {
        success: false,
        error: (error as Error).message || 'Request failed',
      };
    }
  }
}
