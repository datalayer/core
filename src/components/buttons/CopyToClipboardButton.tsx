/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * A button that copies a value, its tooltip saying what it copies, then
 * whether it did.
 *
 * @module components/buttons/CopyToClipboardButton
 */

import { useMemo, useState } from 'react';
import { IconButton, Tooltip } from '@primer/react';
import { CopyIcon } from '@primer/octicons-react';

export type CopyToClipboardButtonProps = {
  value: string;
  ariaLabel?: string;
  successText?: string;
  errorText?: string;
  direction?: 'n' | 's' | 'e' | 'w' | 'nw' | 'ne' | 'sw' | 'se';
  disabled?: boolean;
  size?: 'small' | 'medium';
  variant?: 'default' | 'invisible' | 'primary' | 'danger';
  onResult?: (copied: boolean) => void;
};

const ellipsize = (value: string, max = 96): string => {
  if (!value) {
    return '';
  }
  if (value.length <= max) {
    return value;
  }
  const head = Math.floor((max - 1) / 2);
  const tail = max - head - 1;
  return `${value.slice(0, head)}…${value.slice(-tail)}`;
};

export function CopyToClipboardButton({
  value,
  ariaLabel = 'Copy to clipboard',
  successText = 'Copied',
  errorText = 'Unable to copy',
  direction = 'n',
  disabled = false,
  size = 'small',
  variant = 'invisible',
  onResult,
}: CopyToClipboardButtonProps) {
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const hasValue = Boolean(value && value.trim());

  const tooltip = useMemo(() => {
    if (status === 'success') {
      return successText;
    }
    if (status === 'error') {
      return errorText;
    }
    return hasValue ? `Copy: ${ellipsize(value)}` : 'Nothing to copy';
  }, [status, successText, errorText, hasValue, value]);

  const handleClick = async () => {
    if (!hasValue || disabled) {
      return;
    }
    try {
      if (!navigator?.clipboard?.writeText) {
        throw new Error('Clipboard API unavailable');
      }
      await navigator.clipboard.writeText(value);
      setStatus('success');
      onResult?.(true);
      window.setTimeout(() => setStatus('idle'), 1500);
    } catch {
      setStatus('error');
      onResult?.(false);
      window.setTimeout(() => setStatus('idle'), 1800);
    }
  };

  const isDisabled = disabled || !hasValue;
  const button = (
    <IconButton
      aria-label={ariaLabel}
      icon={CopyIcon}
      size={size}
      variant={variant}
      disabled={isDisabled}
      onClick={handleClick}
    />
  );
  /*
   * A disabled button wears no tooltip.
   *
   * `Tooltip` only takes interactive content — `button:not([disabled])` — and
   * throws on anything else, which is what a disabled button is. Nothing is
   * lost by leaving it out: a disabled element fires no pointer event, so the
   * tooltip would never have shown. `IconButton` does the same with the one
   * it renders of its own.
   */
  if (isDisabled) {
    return button;
  }
  return (
    <Tooltip text={tooltip} direction={direction}>
      {button}
    </Tooltip>
  );
}

export default CopyToClipboardButton;
