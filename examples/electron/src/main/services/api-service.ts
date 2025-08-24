import { net } from 'electron';
import Store from 'electron-store';

interface SecureStore {
  credentials?: {
    runUrl: string;
    token: string;
  };
}

// Secure encrypted storage for credentials
const store = new Store<SecureStore>({
  name: 'datalayer-secure',
  encryptionKey: 'datalayer-electron-app', // In production, use a more secure key
});

// Whitelist of allowed domains for API requests
const ALLOWED_DOMAINS = [
  'prod1.datalayer.run',
  'localhost', // For development
];

class DatalayerAPIService {
  private baseUrl: string = 'https://prod1.datalayer.run';
  private token: string = '';

  constructor() {
    // Load stored credentials on startup
    const stored = store.get('credentials');
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

      store.set('credentials', { runUrl, token });

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
    store.delete('credentials');
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
