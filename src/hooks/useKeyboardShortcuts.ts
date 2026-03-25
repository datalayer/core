/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { useEffect, useCallback } from 'react';

function isMacOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Mac|iPod|iPhone|iPad/.test(navigator.platform);
}

export interface KeyboardShortcut {
  key: string;
  ctrlOrCmd?: boolean;
  shift?: boolean;
  alt?: boolean;
  handler: () => void;
  description?: string;
  allowInInput?: boolean;
}

export interface UseKeyboardShortcutsOptions {
  enabled?: boolean;
  shortcuts: KeyboardShortcut[];
}

export function useKeyboardShortcuts({
  enabled = true,
  shortcuts,
}: UseKeyboardShortcutsOptions): void {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      const target = event.target as HTMLElement;
      const isInInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'SELECT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;

      for (const shortcut of shortcuts) {
        if (isInInput && !shortcut.allowInInput) {
          if (shortcut.key !== 'Escape') {
            continue;
          }
        }

        if (event.key.toLowerCase() !== shortcut.key.toLowerCase()) {
          continue;
        }

        const ctrlOrCmdPressed = isMacOS() ? event.metaKey : event.ctrlKey;
        if (shortcut.ctrlOrCmd && !ctrlOrCmdPressed) {
          continue;
        }
        if (
          !shortcut.ctrlOrCmd &&
          ctrlOrCmdPressed &&
          shortcut.key !== 'Escape'
        ) {
          continue;
        }
        if (shortcut.shift && !event.shiftKey) {
          continue;
        }
        if (shortcut.alt && !event.altKey) {
          continue;
        }

        event.preventDefault();
        event.stopPropagation();
        shortcut.handler();
        break;
      }
    },
    [enabled, shortcuts],
  );

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, handleKeyDown]);
}

export function useChatKeyboardShortcuts({
  onToggle,
  onNewChat,
  onClear,
  onFocusInput,
  enabled = true,
}: {
  onToggle?: () => void;
  onNewChat?: () => void;
  onClear?: () => void;
  onFocusInput?: () => void;
  enabled?: boolean;
}): void {
  const shortcuts: KeyboardShortcut[] = [];

  if (onToggle) {
    shortcuts.push({
      key: 'k',
      ctrlOrCmd: true,
      handler: onToggle,
      description: 'Toggle chat sidebar',
    });
  }

  if (onNewChat) {
    shortcuts.push({
      key: 'n',
      ctrlOrCmd: true,
      shift: true,
      handler: onNewChat,
      description: 'Start new chat',
    });
  }

  if (onClear) {
    shortcuts.push({
      key: 'Backspace',
      ctrlOrCmd: true,
      shift: true,
      handler: onClear,
      description: 'Clear chat messages',
    });
  }

  if (onFocusInput) {
    shortcuts.push({
      key: '/',
      handler: onFocusInput,
      description: 'Focus chat input',
    });
  }

  if (onToggle) {
    shortcuts.push({
      key: 'Escape',
      handler: onToggle,
      description: 'Close chat sidebar',
      allowInInput: true,
    });
  }

  useKeyboardShortcuts({ enabled, shortcuts });
}

export function getShortcutDisplay(shortcut: KeyboardShortcut): string {
  const parts: string[] = [];
  const isMac = isMacOS();

  if (shortcut.ctrlOrCmd) {
    parts.push(isMac ? '⌘' : 'Ctrl');
  }
  if (shortcut.shift) {
    parts.push(isMac ? '⇧' : 'Shift');
  }
  if (shortcut.alt) {
    parts.push(isMac ? '⌥' : 'Alt');
  }

  let keyDisplay = shortcut.key.toUpperCase();
  if (shortcut.key === 'Escape') keyDisplay = 'Esc';
  if (shortcut.key === 'Backspace') keyDisplay = isMac ? '⌫' : 'Del';

  parts.push(keyDisplay);

  return parts.join(isMac ? '' : '+');
}

export default useKeyboardShortcuts;
