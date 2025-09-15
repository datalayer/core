/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * @module renderer/utils/notebook
 * @description Notebook content parsing and validation utilities.
 */

import { INotebookContent } from '@jupyterlab/nbformat';

/**
 * Parse notebook content from API response.
 * @param data - Raw API response data
 * @returns Parsed notebook content or null if invalid
 */
export const parseNotebookContent = (responseBody: any): INotebookContent => {
  let content;

  if (typeof responseBody === 'string') {
    try {
      content = JSON.parse(responseBody);
    } catch (parseError) {
      console.error(
        'Failed to parse response as JSON:',
        responseBody.substring(0, 200)
      );
      throw new Error('Invalid JSON response from server');
    }
  } else if (
    Array.isArray(responseBody) &&
    typeof responseBody[0] === 'number'
  ) {
    // Handle case where response.body is a byte array
    try {
      const jsonString = String.fromCharCode(...responseBody);
      content = JSON.parse(jsonString);
    } catch (parseError) {
      console.error('Failed to parse byte array as JSON:', parseError);
      throw new Error('Failed to parse notebook content from byte array');
    }
  } else {
    content = responseBody;
  }

  return content;
};

/**
 * Validate notebook content structure
 */
export const validateNotebookContent = (content: any): boolean => {
  if (
    content &&
    content.cells &&
    Array.isArray(content.cells) &&
    content.nbformat
  ) {
    return true;
  }

  console.error('Invalid notebook content structure. Content:', content);
  console.error('Expected: object with cells (array) and nbformat properties');
  return false;
};

/**
 * Check if runtime was recently terminated
 */
export const isRuntimeTerminated = (notebookId: string): boolean => {
  const wasTerminated = sessionStorage.getItem(
    `notebook-${notebookId}-terminated`
  );
  return wasTerminated === 'true';
};

/**
 * Mark runtime as terminated in session storage
 */
export const markRuntimeTerminated = (notebookId: string): void => {
  sessionStorage.setItem(`notebook-${notebookId}-terminated`, 'true');
};

/**
 * Clear runtime termination flag
 */
export const clearRuntimeTerminationFlag = (notebookId: string): void => {
  sessionStorage.removeItem(`notebook-${notebookId}-terminated`);
};

/**
 * Check if runtime is marked as terminated in global cleanup registry
 */
export const isRuntimeInCleanupRegistry = (runtimeId: string): boolean => {
  const cleanupRegistry = (window as any).__datalayerRuntimeCleanup;

  if (
    cleanupRegistry &&
    runtimeId &&
    cleanupRegistry.has(runtimeId) &&
    cleanupRegistry.get(runtimeId).terminated
  ) {
    return true;
  }

  return false;
};

/**
 * Create a stable notebook key for collaboration
 */
export const createStableNotebookKey = (
  notebookId?: string,
  notebookPath?: string,
  notebookName?: string
): string => {
  // Must use the notebook's UID as the ID when collaboration is enabled
  // This is what gets passed as documentId to the collaboration provider
  if (notebookId) {
    return notebookId;
  }

  // Fallback to path if no ID available
  const path = notebookPath || `${notebookName || 'untitled'}.ipynb`;
  return path;
};

/**
 * Get service manager cache key
 */
export const getServiceManagerCacheKey = (runtimeId: string): string => {
  return `serviceManager-${runtimeId}`;
};

/**
 * Get cached service manager
 */
export const getCachedServiceManager = (runtimeId: string): any => {
  const cacheKey = getServiceManagerCacheKey(runtimeId);
  return (window as Record<string, any>)[cacheKey];
};

/**
 * Cache service manager
 */
export const cacheServiceManager = (runtimeId: string, manager: any): void => {
  const cacheKey = getServiceManagerCacheKey(runtimeId);
  (window as Record<string, any>)[cacheKey] = manager;
};

/**
 * Remove service manager from cache
 */
export const removeCachedServiceManager = (runtimeId: string): void => {
  const cacheKey = getServiceManagerCacheKey(runtimeId);
  delete (window as Record<string, any>)[cacheKey];
};

/**
 * Safely dispose a service manager
 */
export const safelyDisposeServiceManager = (manager: any): void => {
  try {
    if (
      manager &&
      typeof manager.dispose === 'function' &&
      !manager.isDisposed
    ) {
      manager.dispose();
    }
  } catch (e) {
    console.warn('Error disposing service manager:', e);
  }
};

/**
 * Format error message for display
 */
export const formatErrorMessage = (error: Error): string => {
  const errorMessage = error.message;

  if (errorMessage.includes('Failed to create runtime')) {
    return 'Datalayer runtime service is temporarily unavailable. Please try again later.';
  } else if (errorMessage.includes('Server Error')) {
    return 'Datalayer infrastructure is experiencing issues. Please try again later.';
  } else {
    return 'Failed to initialize notebook environment';
  }
};

/**
 * Create notebook props for Notebook2 component
 */
export const createNotebookProps = (
  stableNotebookKey: string,
  notebookContent: INotebookContent,
  serviceManager: any,
  collaborationProvider: any,
  extensions: any[]
) => {
  return {
    id: stableNotebookKey,
    height: '100%' as const,
    nbformat: notebookContent,
    readonly: false,
    serviceManager: serviceManager,
    startDefaultKernel: true,
    collaborative: true,
    collaborationEnabled: true,
    collaborationProvider: collaborationProvider || undefined,
    extensions: extensions,
    cellSidebarMargin: 60,
  };
};

/**
 * Log notebook component information
 */
export const logNotebookInfo = (
  serviceManager: any,
  notebookContent: INotebookContent | null,
  collaborationProvider: any,
  notebookId?: string
) => {
  console.info('[NotebookView] Creating notebook props:', {
    hasServiceManager: !!serviceManager,
    hasNotebookContent: !!notebookContent,
    hasCells: notebookContent?.cells
      ? Array.isArray(notebookContent.cells)
      : false,
    cellsCount: notebookContent?.cells?.length,
    hasCollaborationProvider: !!collaborationProvider,
    notebookId: notebookId,
  });

  if (serviceManager) {
    console.info(
      '[NotebookView] ServiceManager isReady:',
      serviceManager.isReady
    );
    console.info(
      '[NotebookView] ServiceManager isDisposed:',
      serviceManager.isDisposed
    );
  }
};
