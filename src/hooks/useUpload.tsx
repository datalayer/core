/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/*
 * Copyright (c) 2021-2024 Datalayer, Inc.
 *
 * Datalayer License
 */

import { useState } from "react";
import axios from "axios";
// import useRun from "./useRun";
import { useIAMStore } from "../state";

// TODO reuse useRun hook.
export const useUploadForm = (url: string) => {
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const { token } = useIAMStore()
//  const { requestRun } = useRun();
  const reset = () => {
    setIsSuccess(false);
    setIsLoading(false);
    setProgress(0);
  }
  const uploadAndSubmit = async (formData: FormData) => {
    setIsLoading(true);
    const { data } = await axios.post(url, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
        Authorization: `Bearer ${token}`
      },
      onUploadProgress: (progressEvent) => {
        const progress = (progressEvent.loaded / progressEvent.total!) * 50;
        setProgress(progress);
      },
      onDownloadProgress: (progressEvent) => {
        const progress = 50 + (progressEvent.loaded / progressEvent.total!) * 50;
        setProgress(progress);
      },
    });
    setProgress(100);
    await new Promise((resolve) => {
      setTimeout(() => resolve("success"), 500);
    });
    setIsSuccess(true);
    setProgress(0);
    return data
  };
  return { uploadAndSubmit, isSuccess, isLoading, progress, reset };
}
