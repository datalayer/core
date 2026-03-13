/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { useEffect, useState } from 'react';
import { Text } from '@primer/react';

const DOTS = ['.', '..', '...'] as const;

type PausingDotsProps = {
  color?: string;
  fontSize?: number;
  ml?: number;
  ariaLabel?: string;
  intervalMs?: number;
};

export function PausingDots({
  color = 'fg.muted',
  fontSize = 0,
  ml = 1,
  ariaLabel = 'In progress',
  intervalMs = 450,
}: PausingDotsProps) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setIndex(prev => (prev + 1) % DOTS.length);
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs]);

  return (
    <Text
      as="span"
      sx={{
        ml,
        color,
        fontSize,
        display: 'inline-block',
        position: 'relative',
        fontWeight: 'semibold',
      }}
      aria-label={ariaLabel}
    >
      <Text as="span" sx={{ visibility: 'hidden' }}>
        ...
      </Text>
      <Text
        as="span"
        sx={{
          position: 'absolute',
          left: 0,
          top: 0,
          whiteSpace: 'nowrap',
        }}
      >
        {DOTS[index]}
      </Text>
    </Text>
  );
}

export default PausingDots;
