/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 *
 * Datalayer License
 */

/**
 * Authentication strategy implementations
 */

import * as authentication from '../../api/iam/authentication';
import * as profile from '../../api/iam/profile';
import type {
  AuthStrategy,
  AuthOptions,
  AuthResult,
  TokenStorage,
} from './types';
import { UserDTO } from '../../models/UserDTO';

/**
 * Base authentication strategy with common functionality
 */
abstract class BaseAuthStrategy implements AuthStrategy {
  constructor(
    protected iamRunUrl: string,
    protected storage?: TokenStorage,
  ) {}

  abstract authenticate(options: AuthOptions): Promise<AuthResult>;
  abstract canHandle(options: AuthOptions): boolean;

  /**
   * Validate a token by calling whoami
   */
  protected async validateToken(token: string): Promise<UserDTO> {
    const response = await profile.whoami(token, this.iamRunUrl);

    if (!response || !response.profile) {
      throw new Error('Invalid response from profile API');
    }

    const userData = {
      id: response.profile.id,
      uid: response.profile.uid,
      handle_s: response.profile.handle_s || response.profile.handle,
      email_s: response.profile.email_s || response.profile.email,
      first_name_t:
        response.profile.first_name_t || response.profile.first_name || '',
      last_name_t:
        response.profile.last_name_t || response.profile.last_name || '',
      avatar_url_s:
        response.profile.avatar_url_s || response.profile.avatar_url,
    };

    return new UserDTO(userData, undefined);
  }
}

/**
 * Token-based authentication strategy
 * Authenticates using an existing token
 */
export class TokenAuthStrategy extends BaseAuthStrategy {
  canHandle(options: AuthOptions): boolean {
    return !!options.token;
  }

  async authenticate(options: AuthOptions): Promise<AuthResult> {
    if (!options.token) {
      throw new Error('Token is required for token authentication');
    }

    // Validate the token
    const user = await this.validateToken(options.token);

    // Store the token if requested
    if (!options.noStore && this.storage) {
      if (this.storage.setToken) {
        await this.storage.setToken(options.token);
      }
      if (this.storage.setUser) {
        await this.storage.setUser(user);
      }
    }

    return { user, token: options.token };
  }
}

/**
 * Credentials-based authentication strategy
 * Authenticates using handle and password
 */
export class CredentialsAuthStrategy extends BaseAuthStrategy {
  canHandle(options: AuthOptions): boolean {
    return !!options.handle && !!options.password;
  }

  async authenticate(options: AuthOptions): Promise<AuthResult> {
    if (!options.handle || !options.password) {
      throw new Error(
        'Handle and password are required for credentials authentication',
      );
    }

    // Call the login API
    const response = await authentication.login(
      { handle: options.handle, password: options.password },
      this.iamRunUrl,
    );

    if (!response || !response.success || !response.token) {
      throw new Error(response?.message || 'Login failed');
    }

    const token = response.token;

    // Get user profile
    const user = await this.validateToken(token);

    // Store the token if requested
    if (!options.noStore && this.storage) {
      this.storage.setToken?.(token);
      this.storage.setUser?.(user);
    }

    return { user, token };
  }
}

/**
 * Storage-based authentication strategy
 * Authenticates using a token from storage
 */
export class StorageAuthStrategy extends BaseAuthStrategy {
  canHandle(options: AuthOptions): boolean {
    // Can handle if:
    // 1. Storage is available
    // 2. No other auth method is provided (this is the fallback strategy)
    if (!this.storage || !this.storage.isAvailable()) {
      return false;
    }

    // Return true if no explicit auth method provided (empty options or noStore only)
    // This allows the authenticate() method to check storage async
    const hasExplicitAuthMethod =
      !!options.token ||
      !!options.handle ||
      !!options.password ||
      !!options.useBrowser;

    return !hasExplicitAuthMethod;
  }

  async authenticate(options: AuthOptions): Promise<AuthResult> {
    if (!this.storage) {
      throw new Error('Storage is required for storage-based authentication');
    }

    // Try async getTokenAsync first (for VS Code async keytar support)
    let token: string | null = null;
    if (
      'getTokenAsync' in this.storage &&
      typeof (this.storage as any).getTokenAsync === 'function'
    ) {
      token = await (this.storage as any).getTokenAsync();
    } else if (this.storage.getToken) {
      token = this.storage.getToken();
    }

    if (!token) {
      throw new Error('No token found in storage');
    }

    // Validate the token
    const user = await this.validateToken(token);

    return { user, token };
  }
}

/**
 * Browser OAuth strategy
 * Authenticates using browser-based OAuth flow with GitHub or LinkedIn
 */
export class BrowserOAuthStrategy extends BaseAuthStrategy {
  canHandle(options: AuthOptions): boolean {
    return !!options.useBrowser;
  }

  async authenticate(options: AuthOptions): Promise<AuthResult> {
    // Import OAuth2 API
    const { getOAuth2AuthzUrl } = await import('../../api/iam/oauth2');

    // Default to GitHub provider
    const provider = options.oauthProvider || 'github';

    if (provider !== 'github' && provider !== 'linkedin') {
      throw new Error(
        `Unsupported OAuth provider: ${provider}. Use 'github' or 'linkedin'.`,
      );
    }

    // Generate callback URI
    const callbackUri =
      options.callbackUri || `${window.location.origin}/auth/callback`;

    try {
      // Step 1: Get OAuth authorization URL
      const authzResponse = await getOAuth2AuthzUrl(
        provider,
        callbackUri,
        this.iamRunUrl,
        options.nonce,
      );

      // Step 2: Open OAuth URL in popup or redirect
      if (options.usePopup !== false) {
        // Use popup window
        const popup = window.open(
          authzResponse.loginURL,
          'oauth-login',
          'width=600,height=700,left=100,top=100',
        );

        if (!popup) {
          throw new Error(
            'Failed to open OAuth popup. Please allow popups for this site.',
          );
        }

        // Wait for callback - Datalayer redirects to our callback with ?user=<json>&token=<token>
        const result = await this.waitForOAuthCallback(popup, callbackUri);

        // Extract token and user from callback result
        const token = result.token;
        const user = result.user;

        if (!token) {
          throw new Error('No token received from OAuth callback');
        }

        if (!user) {
          throw new Error('No user data received from OAuth callback');
        }

        // Store token if requested
        if (!options.noStore && this.storage) {
          this.storage.setToken?.(token);
          this.storage.setUser?.(user);
        }

        return { user, token };
      } else {
        // Redirect to OAuth URL
        window.location.href = authzResponse.loginURL;

        // Return a pending promise (page will redirect)
        return new Promise(() => {
          // This promise never resolves because we redirect
        });
      }
    } catch (error) {
      throw new Error(
        `OAuth authentication failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Wait for OAuth callback in popup window
   * Expects: { user, token, error } from the Datalayer OAuth callback
   */
  private async waitForOAuthCallback(
    popup: Window,
    callbackUri: string,
  ): Promise<{ user?: any; token?: string; error?: string }> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(
        () => {
          popup.close();
          reject(new Error('OAuth authentication timed out'));
        },
        5 * 60 * 1000,
      ); // 5 minute timeout

      // Listen for message from popup
      const handleMessage = (event: MessageEvent) => {
        // Verify origin
        if (event.origin !== new URL(callbackUri).origin) {
          return;
        }

        clearTimeout(timeout);
        window.removeEventListener('message', handleMessage);
        popup.close();

        if (event.data.error) {
          reject(new Error(`OAuth error: ${event.data.error}`));
        } else {
          resolve(event.data);
        }
      };

      window.addEventListener('message', handleMessage);

      // Check if popup was closed manually
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          clearTimeout(timeout);
          window.removeEventListener('message', handleMessage);
          reject(new Error('OAuth popup was closed'));
        }
      }, 1000);
    });
  }
}
