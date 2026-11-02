/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Where `useToast` shows its toasts outside JupyterLab: primer-addons'
 * sliding panel, one toast at a time, the next once it is gone. Mount it
 * once, inside the application's theme. JupyterLab keeps its own
 * notifications.
 *
 * @module components/toast/ToastPanel
 */

import type { JSX, MouseEvent } from 'react';
import { useSyncExternalStore } from 'react';
import { Button } from '@primer/react';
import { Box, SlidingPanel } from '@datalayer/primer-addons';
import { toastQueue, type ToastAction } from './toastQueue';

const BUTTON_VARIANTS: Record<
  NonNullable<ToastAction['displayType']>,
  'primary' | 'invisible' | 'danger' | 'default'
> = {
  accent: 'primary',
  link: 'invisible',
  warn: 'danger',
  default: 'default',
};

export const ToastPanel = (): JSX.Element => {
  const toasts = useSyncExternalStore(
    toastQueue.subscribe,
    toastQueue.snapshot,
    toastQueue.snapshot,
  );
  const shown = toasts[0];
  const close = (): void => {
    if (shown) {
      toastQueue.dismiss(shown.id);
    }
  };
  return (
    <SlidingPanel
      // A new toast is a new panel: it slides in, and its own clock runs.
      key={shown?.id ?? 'none'}
      isOpen={Boolean(shown)}
      message={shown?.message ?? ''}
      variant={shown?.variant ?? 'default'}
      position="north"
      durationMs={
        shown && shown.autoClose !== false ? shown.autoClose : undefined
      }
      onDismiss={close}
      details={
        shown?.actions?.length ? (
          <Box display="flex" gap={2} flexWrap="wrap" mt={2}>
            {shown.actions.map(action => (
              <Button
                key={action.label}
                size="small"
                title={action.caption ?? action.label}
                variant={BUTTON_VARIANTS[action.displayType ?? 'default']}
                onClick={(event: MouseEvent) => {
                  action.callback(event.nativeEvent);
                  if (!event.nativeEvent.defaultPrevented) {
                    close();
                  }
                }}
              >
                {action.label}
              </Button>
            ))}
          </Box>
        ) : undefined
      }
    />
  );
};

export default ToastPanel;
