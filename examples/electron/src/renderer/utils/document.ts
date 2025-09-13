/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { logger } from './logger';

/**
 * Wait for runtime to be ready by testing Jupyter server connectivity
 */
export async function waitForRuntimeReady(
  runtimeIngress: string,
  runtimeToken: string,
  maxWaitTime = 60000,
  pollInterval = 5000
): Promise<boolean> {
  logger.debug(
    `Starting Jupyter server connectivity test for ${runtimeIngress}`
  );

  // For newly created runtimes, wait a bit before first check
  await new Promise(resolve => setTimeout(resolve, 8000));

  const startTime = Date.now();
  let attempts = 0;

  while (Date.now() - startTime < maxWaitTime) {
    attempts++;
    try {
      logger.debug(
        `Jupyter server connectivity test attempt ${attempts} for ${runtimeIngress}`
      );

      // Test Jupyter server connectivity by trying to access /api/kernelspecs
      const testUrl = `${runtimeIngress}/api/kernelspecs`;

      const response = await (window as any).proxyAPI.httpRequest({
        url: testUrl,
        method: 'GET',
        headers: {
          Authorization: `token ${runtimeToken}`,
        },
      });

      if (response.status === 200) {
        logger.debug(
          `Jupyter server is ready after ${attempts} attempts - kernelspecs accessible`
        );
        return true;
      } else {
        logger.debug(
          `Jupyter server not ready yet - kernelspecs returned ${response.status}`
        );
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    } catch (error) {
      logger.debug(
        `Jupyter server connectivity test error (attempt ${attempts}): ${error} - continuing to wait`
      );
      // For connection errors, continue waiting as Jupyter server might still be starting up
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }
  }

  logger.warn(
    `Jupyter server connectivity timeout after ${attempts} attempts - proceeding anyway`
  );
  // Instead of failing, return true to proceed - the ServiceManager will handle connection issues
  return true;
}

/**
 * Error handler for Lexical editor
 */
export function onLexicalError(error: Error): void {
  console.error('Lexical error:', error);
}

/**
 * Build WebSocket URL for collaboration
 */
export function buildCollaborationWebSocketUrl(
  spacerRunUrl: string | undefined,
  token: string | undefined,
  documentId: string
): string | null {
  if (!spacerRunUrl || !token) return null;

  const spacerWsUrl = spacerRunUrl.replace(/^http/, 'ws');
  return `${spacerWsUrl}/api/spacer/v1/lexical/ws/${documentId}?token=${token}`;
}