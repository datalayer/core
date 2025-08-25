import { net } from 'electron';

interface SecureStore {
  credentials?: {
    runUrl: string;
    token: string;
  };
}

// Store instance will be initialized lazily
let store: any = null;

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
   * Make a generic API request
   */
  private async request(
    endpoint: string,
    options: {
      method?: string;
      body?: any;
      headers?: Record<string, string>;
    } = {}
  ): Promise<any> {
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
            const data = JSON.parse(responseData);
            if (
              response.statusCode &&
              response.statusCode >= 200 &&
              response.statusCode < 300
            ) {
              resolve(data);
            } else {
              reject(
                new Error(
                  data.message ||
                    `Request failed with status ${response.statusCode}`
                )
              );
            }
          } catch (error) {
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
    data?: any;
    error?: string;
  }> {
    try {
      const response = await this.request('/api/runtimes/v1/environments');
      return { success: true, data: response.environments || [] };
    } catch (error) {
      console.error('Failed to fetch environments:', error);
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
  }): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const response = await this.request('/api/runtimes/v1/runtimes', {
        method: 'POST',
        body: {
          environment: options.environment,
          name: options.name || `runtime-${Date.now()}`,
          credits: options.credits || 100,
        },
      });
      return { success: true, data: response };
    } catch (error) {
      console.error('Failed to create runtime:', error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to create runtime',
      };
    }
  }

  /**
   * Get user spaces
   */
  async getUserSpaces(): Promise<{
    success: boolean;
    data?: any[];
    error?: string;
  }> {
    try {
      const response = await this.request('/api/spacer/v1/spaces/users/me');
      return { success: true, data: response.spaces || [] };
    } catch (error) {
      console.error('Failed to fetch user spaces:', error);
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
    data?: any[];
    error?: string;
  }> {
    try {
      const response = await this.request(
        `/api/spacer/v1/spaces/${spaceId}/items`
      );
      // The response has items directly or nested in the response
      return { success: true, data: response.items || response || [] };
    } catch (error) {
      console.error('Failed to fetch space items:', error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to fetch items',
      };
    }
  }

  /**
   * List notebooks in a space
   */
  async listNotebooks(spaceId?: string): Promise<{
    success: boolean;
    data?: any[];
    spaceInfo?: any;
    error?: string;
  }> {
    try {
      console.log('listNotebooks: Starting notebook fetch...');
      console.log('listNotebooks: Current token:', this.token ? 'Set' : 'Not set');
      console.log('listNotebooks: Current baseUrl:', this.baseUrl);
      
      // Check if we're authenticated
      if (!this.token) {
        console.log('listNotebooks: No token available, returning mock data');
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
          error: 'Using mock data - not authenticated'
        };
      }
      
      // First get user spaces if no spaceId provided
      let selectedSpace: any;
      
      if (!spaceId) {
        console.log('listNotebooks: No spaceId provided, fetching user spaces...');
        const spacesResponse = await this.getUserSpaces();
        console.log('listNotebooks: Spaces response:', JSON.stringify(spacesResponse, null, 2));
        
        if (spacesResponse.success && spacesResponse.data && spacesResponse.data.length > 0) {
          // Find default space or one called "library"
          selectedSpace = spacesResponse.data.find(
            (space: any) => 
              space.handle === 'library' || 
              space.name === 'Library' ||
              space.is_default === true
          ) || spacesResponse.data[0];
          
          console.log('listNotebooks: Selected space:', selectedSpace);
          
          if (selectedSpace) {
            spaceId = selectedSpace.id || selectedSpace.uid;
          }
        } else {
          console.log('listNotebooks: No spaces found, using mock data');
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
            error: spacesResponse.error || 'No spaces available'
          };
        }
      }

      if (!spaceId) {
        console.log('listNotebooks: No space available, returning mock data');
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
          error: 'No spaces available'
        };
      }

      console.log(`listNotebooks: Fetching items from space ${spaceId}...`);
      
      // Fetch all items from the space
      const itemsResponse = await this.getSpaceItems(spaceId);
      console.log('listNotebooks: Items response:', JSON.stringify(itemsResponse, null, 2));
      
      if (itemsResponse.success && itemsResponse.data && itemsResponse.data.length > 0) {
        // Filter only notebook items - the field is type_s in the actual response
        const notebooks = itemsResponse.data.filter(
          (item: any) => item.type === 'notebook' || item.type_s === 'notebook' || item.item_type === 'notebook'
        );
        
        console.log(`listNotebooks: Found ${notebooks.length} notebooks out of ${itemsResponse.data.length} items`);
        
        if (notebooks.length > 0) {
          return { 
            success: true, 
            data: notebooks,
            spaceInfo: selectedSpace
          };
        }
      }
      
      // Fallback to specific notebook endpoint
      console.log('listNotebooks: Trying fallback notebook endpoint...');
      const response = await this.request(
        `/api/spacer/v1/spaces/${spaceId}/items/types/notebook`
      );
      
      console.log('listNotebooks: Fallback response:', JSON.stringify(response, null, 2));
      
      return { 
        success: true, 
        data: response.items || response || [],
        spaceInfo: selectedSpace
      };
    } catch (error) {
      console.error('listNotebooks: Error fetching notebooks:', error);
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
        error: error instanceof Error ? error.message : 'Failed to fetch notebooks',
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
      body?: any;
      headers?: Record<string, string>;
    } = {}
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const response = await this.request(endpoint, options);
      return { success: true, data: response };
    } catch (error) {
      console.error(`API request failed for ${endpoint}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Request failed',
      };
    }
  }
}

// Export singleton instance
export const apiService = new DatalayerAPIService();
