/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/*
 * Copyright (c) 2021-2024 Datalayer, Inc.
 *
 * Datalayer License
 */

import React, { useState } from "react";
import { Flash } from '@primer/react';

export const ErrorMessage: React.FC<{ message: Array<string> | string | null }> = ({
  message
}) => {
  if (message instanceof Array) {
    return <div>
      {message.map( (m, i) => <Flash variant="danger" key={i}>{m}</Flash>)}
    </div>
  } else {
    return <Flash variant="danger">{message}</Flash>
  }
};

export const useError = (initialState: string | null) => {
  const [error, setError] = useState(initialState);
  const showError = (errorMessage: string | null) => {
    setError(errorMessage);
    window.setTimeout(() => {
      setError(null);
    }, 3000);
  };
  return { error, showError };
};

export default useError;
