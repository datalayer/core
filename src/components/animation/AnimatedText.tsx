/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { useEffect, useMemo, useState } from 'react';

export interface AnimatedTextProps extends Omit<
  React.HTMLAttributes<HTMLSpanElement>,
  'children'
> {
  prefix?: string;
  words: string[];
  suffix?: string;
  intervalMs?: number;
  transitionMs?: number;
}

export function AnimatedText({
  prefix,
  words,
  suffix,
  intervalMs = 1800,
  transitionMs = 240,
  style,
  ...rest
}: AnimatedTextProps): JSX.Element {
  const normalizedWords = useMemo(
    () => words.filter(word => word.trim().length > 0),
    [words],
  );

  const [wordIndex, setWordIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (normalizedWords.length <= 1) {
      return;
    }

    const timer = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setWordIndex(prev => (prev + 1) % normalizedWords.length);
        setVisible(true);
      }, transitionMs);
    }, intervalMs);

    return () => {
      clearInterval(timer);
    };
  }, [normalizedWords, intervalMs, transitionMs]);

  const currentWord =
    normalizedWords.length > 0
      ? normalizedWords[wordIndex % normalizedWords.length]
      : '';

  const minWidthCh = useMemo(() => {
    if (normalizedWords.length === 0) {
      return 0;
    }
    return Math.max(...normalizedWords.map(word => word.length));
  }, [normalizedWords]);

  return (
    <span {...rest} style={style}>
      {prefix}
      <span
        aria-live="polite"
        style={{
          display: 'inline-block',
          minWidth: `${minWidthCh}ch`,
          transition: `opacity ${transitionMs}ms ease, transform ${transitionMs}ms ease`,
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(0.25em)',
        }}
      >
        {currentWord}
      </span>
      {suffix}
    </span>
  );
}

export default AnimatedText;
