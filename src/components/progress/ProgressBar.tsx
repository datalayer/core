/*
 * Copyright (c) 2021-2024 Datalayer, Inc.
 *
 * Datalayer License
 */

import { useState } from 'react';
import { useInterval } from 'usehooks-ts';
import { ProgressBar as PrimerProgressBar } from '@primer/react';

export const ProgressBar = () => {
  const [progress, setProgress] = useState(0);
  useInterval(() => {
    if (progress >= 100) {
      setProgress(0);
    } else {
      setProgress(progress + 1);
    }
  }, 100);
  return <PrimerProgressBar progress={progress} aria-label="" />
};

export default ProgressBar;
