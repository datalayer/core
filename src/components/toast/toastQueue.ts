/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * The toasts waiting to be shown outside JupyterLab, in the order they were
 * asked for: `useToast` puts them here, `ToastPanel` shows the first in a
 * sliding panel, and taking it away shows the next.
 *
 * @module components/toast/toastQueue
 */

export type ToastVariant = 'info' | 'success' | 'warning' | 'error';

/** A button on a toast, as JupyterLab's notifications name one. */
export type ToastAction = {
  label: string;
  caption?: string;
  displayType?: 'default' | 'accent' | 'warn' | 'link';
  callback: (event: MouseEvent) => void;
};

export type QueuedToast = {
  id: string;
  variant: ToastVariant;
  message: string;
  actions?: ToastAction[];
  /** Milliseconds before it goes on its own; `false` stays until dismissed. */
  autoClose: number | false;
};

let toasts: readonly QueuedToast[] = [];
const listeners = new Set<() => void>();
let next = 0;

const emit = (): void => {
  for (const listener of listeners) {
    listener();
  }
};

/** Info and success go on their own after five seconds; a warning or an error stays. */
export const defaultAutoClose = (variant: ToastVariant): number | false =>
  variant === 'info' || variant === 'success' ? 5000 : false;

export const toastQueue = {
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  snapshot(): readonly QueuedToast[] {
    return toasts;
  },
  push(toast: Omit<QueuedToast, 'id'>): string {
    next += 1;
    const id = `toast-${next}`;
    toasts = [...toasts, { ...toast, id }];
    emit();
    return id;
  },
  update(id: string, patch: Partial<Omit<QueuedToast, 'id'>>): void {
    toasts = toasts.map(toast =>
      toast.id === id ? { ...toast, ...patch } : toast,
    );
    emit();
  },
  /** Take one toast away, or every toast without an id. */
  dismiss(id?: string): void {
    toasts = id === undefined ? [] : toasts.filter(toast => toast.id !== id);
    emit();
  },
};
