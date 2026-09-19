/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import type { JSX } from 'react';
import { useEffect, useMemo, useState } from 'react';

/**
 * One piece of an animated line.
 *
 * A string is written as it is. An object cycles through its words, and every
 * cycling piece of the same line advances together — so a sentence can name
 * two things that change at once and still read as one sentence rather than
 * two independent slot machines.
 */
export type AnimatedTextPart = string | AnimatedTextWords;

export type AnimatedTextWords = {
  /** The words this piece cycles through. */
  words: string[];
  /**
   * The colour of the words, as a Primer foreground token name — `accent`,
   * `success`, `attention`, `severe`, `done`, `muted` — or any CSS colour.
   * Given a token name the colour follows the theme, light or dark, because
   * it resolves to the CSS variable Primer sets.
   */
  color?: AnimatedTextColor;
};

export type AnimatedTextColor =
  | 'accent'
  | 'success'
  | 'attention'
  | 'severe'
  | 'done'
  | 'muted'
  | 'default'
  | (string & {});

/** The Primer foreground tokens, which carry the theme with them. */
const THEME_COLORS: Record<string, string> = {
  accent: 'var(--fgColor-accent, var(--color-accent-fg))',
  success: 'var(--fgColor-success, var(--color-success-fg))',
  attention: 'var(--fgColor-attention, var(--color-attention-fg))',
  severe: 'var(--fgColor-severe, var(--color-severe-fg))',
  done: 'var(--fgColor-done, var(--color-done-fg))',
  muted: 'var(--fgColor-muted, var(--color-fg-muted))',
  default: 'inherit',
};

/**
 * Resolve a colour: a known token becomes the themed CSS variable, anything
 * else is passed through so a caller can still give a literal colour.
 */
function resolveColor(color?: AnimatedTextColor): string | undefined {
  if (!color) {
    return undefined;
  }
  return THEME_COLORS[color] ?? color;
}

export interface AnimatedTextProps extends Omit<
  React.HTMLAttributes<HTMLSpanElement>,
  'children' | 'color'
> {
  /** Text before the cycling words. Ignored when `parts` is given. */
  prefix?: string;
  /** The words to cycle through. Ignored when `parts` is given. */
  words?: string[];
  /** Text after the cycling words. Ignored when `parts` is given. */
  suffix?: string;
  /**
   * The line, as a sequence of fixed and cycling pieces. Every cycling piece
   * advances on the same tick, so several of them stay in step.
   */
  parts?: AnimatedTextPart[];
  /** Colour applied to cycling pieces that do not name their own. */
  color?: AnimatedTextColor;
  intervalMs?: number;
  transitionMs?: number;
}

/**
 * A line of text in which one or more words change, in step.
 *
 * ```tsx
 * <AnimatedText
 *   parts={[
 *     'Bring ',
 *     { words: ['Claude', 'Codex', 'Cursor'], color: 'accent' },
 *     '. Datalayer gives it a secure endpoint to your ',
 *     { words: ['Notebooks', 'Data', 'Code Sandboxes'], color: 'success' },
 *     '.',
 *   ]}
 * />
 * ```
 */
export function AnimatedText({
  prefix,
  words,
  suffix,
  parts,
  color,
  intervalMs = 1800,
  transitionMs = 240,
  style,
  ...rest
}: AnimatedTextProps): JSX.Element {
  // The older three-prop form is the same thing with one cycling piece.
  const resolvedParts = useMemo<AnimatedTextPart[]>(() => {
    if (parts && parts.length > 0) {
      return parts;
    }
    return [prefix ?? '', { words: words ?? [] }, suffix ?? ''];
  }, [parts, prefix, suffix, words]);

  const cyclingParts = useMemo(
    () =>
      resolvedParts.filter(
        (part): part is AnimatedTextWords =>
          typeof part !== 'string' &&
          part.words.filter(word => word.trim().length > 0).length > 0,
      ),
    [resolvedParts],
  );

  // One index for the whole line: what makes several cycling pieces change
  // together rather than drifting apart.
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(true);

  // The tick has to run until every piece has come back round, so a line
  // pairing three words with four does not repeat after three.
  const cycleLength = useMemo(() => {
    const lengths = cyclingParts.map(
      part => part.words.filter(word => word.trim().length > 0).length,
    );
    return lengths.reduce(
      (total, length) => lowestCommonMultiple(total, length),
      1,
    );
  }, [cyclingParts]);

  useEffect(() => {
    if (cycleLength <= 1) {
      return;
    }
    const timer = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setStep(previous => (previous + 1) % cycleLength);
        setVisible(true);
      }, transitionMs);
    }, intervalMs);
    return () => {
      clearInterval(timer);
    };
  }, [cycleLength, intervalMs, transitionMs]);

  const wordStyle = (part: AnimatedTextWords): React.CSSProperties => ({
    display: 'inline-block',
    color: resolveColor(part.color ?? color),
    transition: `opacity ${transitionMs}ms ease, transform ${transitionMs}ms ease`,
    opacity: visible ? 1 : 0,
    transform: visible ? 'translateY(0)' : 'translateY(0.25em)',
  });

  return (
    <span {...rest} style={style}>
      {resolvedParts.map((part, index) => {
        if (typeof part === 'string') {
          return <span key={`fixed-${index}`}>{part}</span>;
        }
        const available = part.words.filter(word => word.trim().length > 0);
        if (available.length === 0) {
          return null;
        }
        return (
          <span
            key={`words-${index}`}
            // Announced as one changing region rather than a stream of
            // separate updates, so a screen reader is not read a new word
            // every two seconds.
            aria-live="polite"
            style={wordStyle(part)}
          >
            {available[step % available.length]}
          </span>
        );
      })}
    </span>
  );
}

function greatestCommonDivisor(a: number, b: number): number {
  return b === 0 ? a : greatestCommonDivisor(b, a % b);
}

function lowestCommonMultiple(a: number, b: number): number {
  if (a === 0 || b === 0) {
    return Math.max(a, b);
  }
  return Math.abs(a * b) / greatestCommonDivisor(a, b);
}

export default AnimatedText;
