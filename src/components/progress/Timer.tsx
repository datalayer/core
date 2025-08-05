/*
 * Copyright (c) 2021-2024 Datalayer, Inc.
 *
 * Datalayer License
 */

import { useState, useEffect } from 'react';
import { Text } from '@primer/react';

/**
 * Timer displaying the time as text.
 *
 * Duration should be provided in seconds.
 */
export function Timer(props: { duration: number }): JSX.Element {
  const [remaining, setRemaining] = useState(props.duration);
  useEffect(() => {
    setRemaining(props.duration);
  }, [props.duration]);
  useEffect(() => {
    const timeoutIndex = setTimeout(() => {
      setRemaining(remaining - 1);
    }, 1000);
    return () => {
      clearTimeout(timeoutIndex);
    };
  }, [remaining]);
  return <Text as="span">{remaining.toFixed(0)}s</Text>;
}

export default Timer;
