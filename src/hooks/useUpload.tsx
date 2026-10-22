/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { useState } from 'react';
import { requestDatalayerAPI } from '../api/DatalayerApi';
import { useIAMStore } from '../state';

/**
 * Posts a form to `url` through the API transport.
 *
 * `progress` is 0 while the upload is in flight and 100 once the server has
 * answered: `fetch` reports no upload progress, so there is nothing in
 * between to show.
 */
export const useUploadForm = (url: string) => {
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const { token } = useIAMStore();
  const reset = () => {
    setIsSuccess(false);
    setIsLoading(false);
    setProgress(0);
  };
  const uploadAndSubmit = async (formData: FormData) => {
    setIsLoading(true);
    try {
      const data = await requestDatalayerAPI({
        url,
        method: 'POST',
        body: formData,
        token,
      });
      setProgress(100);
      await new Promise(resolve => {
        setTimeout(() => resolve('success'), 500);
      });
      setIsSuccess(true);
      setIsLoading(false);
      setProgress(0);
      return data;
    } catch (error) {
      setIsLoading(false);
      setProgress(0);
      throw error;
    }
  };
  return { uploadAndSubmit, isSuccess, isLoading, progress, reset };
};
