/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Cross-platform browser-based OAuth authentication.
 * Works in Node.js environments (CLI, VS Code extension, etc.)
 *
 * @module client/auth/browserAuth
 */

import * as http from 'http';
import type { UserDTO } from '../../models/UserDTO';

/**
 * Configuration for browser-based OAuth login
 */
export interface BrowserLoginConfig {
  /** IAM service URL */
  iamUrl: string;
  /** Port for local HTTP server (default: random available port) */
  port?: number;
  /** Timeout in milliseconds (default: 5 minutes) */
  timeout?: number;
  /** Callback to open browser URL (platform-specific) */
  openBrowser?: (url: string) => Promise<void> | void;
}

/**
 * Result from browser OAuth login
 */
export interface BrowserLoginResult {
  /** Authentication token */
  token: string;
  /** User information */
  user: UserDTO;
}

/**
 * HTML page served to handle OAuth callback
 */
const OAUTH_CALLBACK_PAGE = `
<!DOCTYPE html>
<html>
<head>
  <title>Datalayer Authentication</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100vh;
      margin: 0;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }
    .container {
      background: white;
      padding: 2rem;
      border-radius: 8px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      text-align: center;
      max-width: 400px;
    }
    .spinner {
      border: 3px solid #f3f3f3;
      border-top: 3px solid #667eea;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      animation: spin 1s linear infinite;
      margin: 20px auto;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    .success {
      color: #10b981;
      font-size: 48px;
      margin: 20px 0;
    }
    .error {
      color: #ef4444;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Datalayer Authentication</h1>
    <div id="status">
      <div class="spinner"></div>
      <p>Processing authentication...</p>
    </div>
  </div>
  <script>
    const params = new URLSearchParams(window.location.search);
    const user = params.get('user');
    const token = params.get('token');
    const error = params.get('error');

    if (error) {
      document.getElementById('status').innerHTML = \`
        <div class="error">✗</div>
        <p class="error">Authentication failed: \${error}</p>
        <p><small>You can close this window</small></p>
      \`;
    } else if (user && token) {
      // Send token back to local server
      fetch('/callback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user: JSON.parse(decodeURIComponent(user)),
          token: token
        })
      })
      .then(() => {
        const userData = JSON.parse(decodeURIComponent(user));
        document.getElementById('status').innerHTML = \`
          <div class="success">✓</div>
          <p>Successfully logged in as <strong>\${userData.displayName || userData.handle_s}</strong></p>
          <p><small>You can close this window</small></p>
        \`;
        // Auto-close after 2 seconds
        setTimeout(() => window.close(), 2000);
      })
      .catch(err => {
        document.getElementById('status').innerHTML = \`
          <div class="error">✗</div>
          <p class="error">Failed to complete authentication</p>
          <p><small>You can close this window</small></p>
        \`;
      });
    } else {
      // Initial page - redirect to OAuth
      const iamUrl = '{{IAM_URL}}';
      const port = '{{PORT}}';
      const redirectUri = \`http://localhost:\${port}/oauth/callback\`;
      const authUrl = \`\${iamUrl}/api/iam/v1/auth/github?redirect_uri=\${encodeURIComponent(redirectUri)}\`;
      window.location.href = authUrl;
    }
  </script>
</body>
</html>
`;

/**
 * Find an available port for the HTTP server
 */
function findAvailablePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = http.createServer();
    server.listen(0, () => {
      const address = server.address();
      if (address && typeof address !== 'string') {
        const port = address.port;
        server.close(() => resolve(port));
      } else {
        server.close(() => reject(new Error('Failed to find available port')));
      }
    });
    server.on('error', reject);
  });
}

/**
 * Default browser opener using platform-specific commands
 */
async function defaultOpenBrowser(url: string): Promise<void> {
  const { exec } = await import('child_process');
  const platform = process.platform;

  let command: string;
  if (platform === 'darwin') {
    command = `open "${url}"`;
  } else if (platform === 'win32') {
    command = `start "" "${url}"`;
  } else {
    // Linux and others
    command = `xdg-open "${url}"`;
  }

  return new Promise((resolve, reject) => {
    exec(command, error => {
      if (error) {
        reject(new Error(`Failed to open browser: ${error.message}`));
      } else {
        resolve();
      }
    });
  });
}

/**
 * Perform browser-based OAuth login
 *
 * @param config - Configuration for browser login
 * @returns Promise resolving to login result with token and user
 * @throws Error if authentication fails or times out
 *
 * @example
 * ```typescript
 * const result = await loginWithBrowser({
 *   iamUrl: 'https://iam.datalayer.run',
 *   port: 8765,
 * });
 * console.log(`Logged in as ${result.user.displayName}`);
 * console.log(`Token: ${result.token}`);
 * ```
 */
export async function loginWithBrowser(
  config: BrowserLoginConfig,
): Promise<BrowserLoginResult> {
  const {
    iamUrl,
    port: requestedPort,
    timeout = 5 * 60 * 1000, // 5 minutes default
    openBrowser = defaultOpenBrowser,
  } = config;

  // Find available port if not specified
  const port = requestedPort || (await findAvailablePort());

  return new Promise<BrowserLoginResult>((resolve, reject) => {
    let resolved = false;

    // Create HTTP server
    const server = http.createServer((req, res) => {
      const url = new URL(req.url || '', `http://localhost:${port}`);

      if (url.pathname === '/' || url.pathname === '/login') {
        // Serve initial page that redirects to OAuth
        res.writeHead(200, { 'Content-Type': 'text/html' });
        const html = OAUTH_CALLBACK_PAGE.replace('{{IAM_URL}}', iamUrl).replace(
          '{{PORT}}',
          port.toString(),
        );
        res.end(html);
      } else if (url.pathname === '/oauth/callback') {
        // OAuth callback - serve same page which will POST token back
        res.writeHead(200, { 'Content-Type': 'text/html' });
        const html = OAUTH_CALLBACK_PAGE.replace('{{IAM_URL}}', iamUrl).replace(
          '{{PORT}}',
          port.toString(),
        );
        res.end(html);
      } else if (url.pathname === '/callback' && req.method === 'POST') {
        // Receive token from browser
        let body = '';
        req.on('data', chunk => {
          body += chunk.toString();
        });
        req.on('end', () => {
          try {
            const data = JSON.parse(body);
            const { user, token } = data;

            if (!token || !user) {
              throw new Error('Invalid callback data');
            }

            // Send success response
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true }));

            // Resolve the promise
            if (!resolved) {
              resolved = true;
              clearTimeout(timeoutHandle);
              server.close();
              resolve({ token, user });
            }
          } catch (error) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(
              JSON.stringify({
                error:
                  error instanceof Error ? error.message : 'Invalid request',
              }),
            );
          }
        });
      } else {
        // 404 for other paths
        res.writeHead(404);
        res.end('Not Found');
      }
    });

    // Set up timeout
    const timeoutHandle = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        server.close();
        reject(new Error('Authentication timeout - no response received'));
      }
    }, timeout);

    // Start server
    server.listen(port, () => {
      const loginUrl = `http://localhost:${port}/login`;
      // eslint-disable-next-line no-console
      console.log(
        `\n🔐 Opening browser for authentication...\n📍 URL: ${loginUrl}\n`,
      );

      // Open browser (ensure we handle promise correctly)
      Promise.resolve(openBrowser(loginUrl)).catch(error => {
        console.error(`Failed to open browser automatically: ${error.message}`);
        // eslint-disable-next-line no-console
        console.log(`\nPlease open this URL manually: ${loginUrl}\n`);
      });
    });

    // Handle server errors
    server.on('error', error => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeoutHandle);
        reject(error);
      }
    });
  });
}
