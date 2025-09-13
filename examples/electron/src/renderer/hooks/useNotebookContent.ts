/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { useState, useEffect, useCallback } from 'react';
import { INotebookContent } from '@jupyterlab/nbformat';
import { UseNotebookContentOptions, UseNotebookContentReturn } from '../../shared/types';
import { parseNotebookContent, validateNotebookContent } from '../utils/notebook';

export const useNotebookContent = ({
  selectedNotebook,
}: UseNotebookContentOptions): UseNotebookContentReturn => {
  const [notebookContent, setNotebookContent] = useState<INotebookContent | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNotebookContent = useCallback(async () => {
    if (!selectedNotebook?.cdnUrl) {
      setNotebookContent(null);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Check if proxyAPI is available
      if (!(window as any).proxyAPI) {
        console.error('proxyAPI not available - cannot fetch notebook content');
        throw new Error('proxyAPI not available');
      }

      console.info('[useNotebookContent] Fetching notebook from:', selectedNotebook.cdnUrl);

      // Use the proxy API to fetch the notebook to avoid CORS issues
      const response = await (window as any).proxyAPI.httpRequest({
        url: selectedNotebook.cdnUrl,
        method: 'GET',
      });

      if (response.status === 200 && response.body) {
        // Parse the response body
        const content = parseNotebookContent(response.body);

        // Validate notebook content structure
        if (validateNotebookContent(content)) {
          console.info('[useNotebookContent] Successfully loaded notebook:', {
            name: selectedNotebook.name,
            cellCount: content.cells?.length || 0,
            nbformat: content.nbformat,
          });
          setNotebookContent(content as INotebookContent);
        } else {
          throw new Error('Invalid notebook content structure');
        }
      } else {
        console.error(
          '[useNotebookContent] Failed to fetch notebook:',
          response.statusText || response.status,
          'Response body:',
          response.body
        );
        throw new Error('Failed to fetch notebook from server');
      }
    } catch (fetchError) {
      console.error('[useNotebookContent] Error fetching notebook:', fetchError);
      setError('Failed to load notebook content');
      setNotebookContent(null);
    } finally {
      setLoading(false);
    }
  }, [selectedNotebook?.cdnUrl, selectedNotebook?.name]);

  // Fetch notebook content when selected notebook changes
  useEffect(() => {
    fetchNotebookContent();
  }, [fetchNotebookContent]);

  const refetch = useCallback(() => {
    fetchNotebookContent();
  }, [fetchNotebookContent]);

  return {
    notebookContent,
    loading,
    error,
    refetch,
  };
};