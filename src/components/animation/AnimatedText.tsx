/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

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
  /** Overrides the background of this piece alone. */
  background?: string;
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
 * The colours the cycling words are drawn in when none is named.
 *
 * Fixed values rather than Primer's theme tokens, because the plate behind
 * the words is white in either theme: a token would resolve to its light-mode
 * variant in the dark and wash out. Every one of these sits between 4.8 and
 * 5.4 contrast on white — comfortably readable, and none of them the pale or
 * near-black ends of the palette.
 */
const MEDIUM_PALETTE = [
  '#0969da', // blue
  '#1a7f37', // green
  '#8250df', // purple
  '#bc4c00', // orange
  '#cf222e', // red
  '#1b7c83', // teal
  '#bf3989', // pink
];

/**
 * What sits behind the cycling words.
 *
 * A coloured word over a photograph or an illustrated hero is legible only by
 * luck: the contrast changes with whatever the artwork happens to be doing
 * behind that glyph. A solid plate underneath makes it legible by
 * construction, whatever it is laid over.
 */
const DEFAULT_BACKGROUND = '#ffffff';

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

export interface AnimatedTextProps
  extends Omit<React.HTMLAttributes<HTMLSpanElement>, 'children' | 'color'> {
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
  /**
   * The colours to draw cycling words in when neither the piece nor `color`
   * names one. Each word takes a different colour, and changes colour as it
   * changes word.
   */
  palette?: string[];
  /**
   * What sits behind the cycling words. White by default so a coloured word
   * stays readable over artwork; pass `'transparent'` for a plain background
   * where the plate is not wanted.
   */
  background?: string;
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
  palette = MEDIUM_PALETTE,
  background = DEFAULT_BACKGROUND,
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
          part.words.filter(word => word.trim().length > 0).length > 0
      ),
    [resolvedParts]
  );

  // One index for the whole line: what makes several cycling pieces change
  // together rather than drifting apart.
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(true);

  // The tick has to run until every piece has come back round, so a line
  // pairing three words with four does not repeat after three.
  const cycleLength = useMemo(() => {
    const lengths = cyclingParts.map(
      part => part.words.filter(word => word.trim().length > 0).length
    );
    return lengths.reduce(
      (total, length) => lowestCommonMultiple(total, length),
      1
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

  /**
   * The colour of the cycling piece at `ordinal`, for the current step.
   *
   * Derived rather than random so a re-render does not repaint the line, and
   * offset by the ordinal so two words showing at once never take the same
   * colour. The palette length being prime keeps the pairing from settling
   * into a short repeating pattern.
   */
  const paletteColor = (ordinal: number): string | undefined => {
    if (palette.length === 0) {
      return undefined;
    }
    return palette[(step * 2 + ordinal * 3) % palette.length];
  };

  const wordStyle = (
    part: AnimatedTextWords,
    ordinal: number
  ): React.CSSProperties => {
    const plate = part.background ?? background;
    const hasPlate = plate !== 'transparent' && plate !== 'none';
    return {
      display: 'inline-block',
      // An explicitly named colour always wins; otherwise the palette.
      color: resolveColor(part.color ?? color) ?? paletteColor(ordinal),
      backgroundColor: hasPlate ? plate : undefined,
      // Enough to keep the plate clear of the glyphs without the words
      // drifting apart from the fixed text around them.
      padding: hasPlate ? '0 0.25em' : undefined,
      borderRadius: hasPlate ? '0.25em' : undefined,
      transition: `opacity ${transitionMs}ms ease, transform ${transitionMs}ms ease`,
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(0.25em)',
    };
  };

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
        const ordinal = cyclingParts.indexOf(part);
        return (
          <span
            key={`words-${index}`}
            // Announced as one changing region rather than a stream of
            // separate updates, so a screen reader is not read a new word
            // every two seconds.
            aria-live="polite"
            style={wordStyle(part, ordinal)}
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
