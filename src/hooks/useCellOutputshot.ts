/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/*
 * Copyright (c) 2021-2024 Datalayer, Inc.
 *
 * Datalayer License
 */

import { useState } from 'react';
import { useCellStore } from '../state';
import { takeHTMLNodeScreenshot } from '../utils/Screenshot';

const useCellOutputshot = () => {
  const [outputshot, setOutputshot] = useState('')
  const [error, setError] = useState()
  const { update } = useCellStore();
  const takeOutputshot = (node: HTMLDivElement) => {
    takeHTMLNodeScreenshot(node as HTMLDivElement).then(outputshotData => {
      setOutputshot(outputshotData);
      update({
        outputshotData,
      });
      return outputshotData;
    })
    .catch(reason => setError(reason));
  }
  return [
    outputshot,
    takeOutputshot,
    { error }
  ]
}

export default useCellOutputshot;
