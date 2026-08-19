/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * The small pills that qualify an entry.
 *
 * A menu entry, a card, a row of a switcher: what qualifies them is always
 * the same mark — one lowercase word in a semantic tone — and it was written
 * out at every place that needed one. These are that mark, named after what
 * they say, so `alpha` looks the same in the user menu, on an integration and
 * wherever it is needed next.
 *
 * @module components/labels/StatusLabels
 */

import type { ReactNode } from 'react';
import { Label } from '@primer/react';

/** The tones a status pill is read in. */
export type StatusLabelTone = 'accent' | 'attention' | 'success' | 'neutral';

export type StatusLabelProps = {
  /** Word of the pill; each label has one of its own. */
  children?: ReactNode;
  size?: 'small' | 'large';
  sx?: Record<string, unknown>;
};

const TONES: Record<
  StatusLabelTone,
  { bg: string; color: string; borderColor?: string }
> = {
  accent: {
    bg: 'accent.subtle',
    color: 'accent.fg',
    borderColor: 'accent.muted',
  },
  attention: {
    bg: 'attention.subtle',
    color: 'attention.fg',
    borderColor: 'attention.muted',
  },
  success: {
    bg: 'success.subtle',
    color: 'success.fg',
    borderColor: 'success.muted',
  },
  neutral: {
    bg: 'neutral.subtle',
    color: 'fg.muted',
    borderColor: 'border.default',
  },
};

/**
 * The pill the named labels below are made of.
 *
 * Exported for a qualification that has no label of its own yet; prefer one of
 * the named ones, so the same thing is said the same way everywhere.
 */
export function StatusLabel(
  props: StatusLabelProps & { tone: StatusLabelTone },
): JSX.Element {
  const { children, size = 'small', sx, tone } = props;
  return (
    <Label
      variant="secondary"
      size={size}
      sx={{
        textTransform: 'lowercase',
        lineHeight: 1.2,
        /*
         * The tone, under a doubled selector.
         *
         * Primer ships `NavList` and `ActionList` as CSS modules, and the
         * colour they set on the contents of an item ties with the one Emotion
         * generates for `sx` — so the same label came out in the colour of the
         * navigation in one place and in its own colour in another, depending
         * on which stylesheet happened to come last. `&&` raises the
         * specificity enough that the tone always lands, wherever the label is
         * put.
         */
        '&&': {
          ...TONES[tone],
          // The navigation of Primer colours the contents of its items, and
          // its stylesheet is loaded after ours: a doubled selector was not
          // enough on its own, so the colour of the tone is stated as final.
          color: `${TONES[tone].color} !important`,
        },
        ...sx,
      }}
    >
      {children}
    </Label>
  );
}

/**
 * A feature that is being tried out.
 */
export function AlphaLabel(props: StatusLabelProps = {}): JSX.Element {
  const { children = 'alpha', ...rest } = props;
  return (
    <StatusLabel tone="accent" {...rest}>
      {children}
    </StatusLabel>
  );
}

/**
 * Something reserved to the administrators of the platform.
 */
export function AdminLabel(props: StatusLabelProps = {}): JSX.Element {
  const { children = 'admin', ...rest } = props;
  return (
    <StatusLabel tone="attention" {...rest}>
      {children}
    </StatusLabel>
  );
}

/**
 * The one that is taken when none is chosen — the default space of an account.
 */
export function DefaultLabel(props: StatusLabelProps = {}): JSX.Element {
  const { children = 'default', ...rest } = props;
  return (
    <StatusLabel tone="accent" {...rest}>
      {children}
    </StatusLabel>
  );
}

/**
 * Something announced and not there yet.
 *
 * A tone of its own, and deliberately not the accent an alpha wears: one says
 * "you may try this, it may bite", the other "there is nothing to try". Read
 * side by side in a navigation, two labels of one colour say the same thing
 * about two entries that mean different things.
 */
export function SoonLabel(props: StatusLabelProps = {}): JSX.Element {
  const { children = 'soon', ...rest } = props;
  return (
    <StatusLabel tone="neutral" {...rest}>
      {children}
    </StatusLabel>
  );
}

export default StatusLabel;
