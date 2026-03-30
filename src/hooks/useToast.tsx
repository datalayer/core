/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import React from 'react';
import { type Id, toast } from 'react-toastify';
import { Notification } from '@jupyterlab/apputils';
import { Button } from '@primer/react';
import type { VariantType } from './../components/buttons';
import { isInsideJupyterLab } from '../utils';

const TOAST_POSITION = 'bottom-right' as const;

export type ToastRenderer = 'auto' | 'jupyterlab' | 'web';

let toastRendererOverride: Exclude<ToastRenderer, 'auto'> | null = null;

export const setToastRendererOverride = (renderer: ToastRenderer = 'auto') => {
  toastRendererOverride = renderer === 'auto' ? null : renderer;
};

export const getToastRendererOverride = () => toastRendererOverride;

const resolveToastRenderer = (
  localRenderer?: ToastRenderer,
): Exclude<ToastRenderer, 'auto'> => {
  if (localRenderer && localRenderer !== 'auto') {
    return localRenderer;
  }
  if (toastRendererOverride) {
    return toastRendererOverride;
  }
  return isInsideJupyterLab() ? 'jupyterlab' : 'web';
};

const getWebToastTheme = (): 'light' | 'dark' => {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return 'light';
  }

  const modeAttr =
    document.documentElement?.getAttribute('data-color-mode') ||
    document.body?.getAttribute('data-color-mode') ||
    '';

  if (modeAttr === 'dark') return 'dark';
  if (modeAttr === 'light') return 'light';

  return window.matchMedia?.('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
};

const getWebToastOptions = (autoClose?: number | false) =>
  ({
    autoClose,
    position: TOAST_POSITION,
    theme: getWebToastTheme(),
  }) as const;

export type ToastProps = {
  /**
   * List of associated actions
   */
  actions?: Notification.IAction[];
  /**
   * Autoclosing behavior - false (not closing automatically) or number (time in milliseconds before hiding the notification)
   */
  autoClose?: number | false;
  /**
   * Notification type
   */
  variant: 'info' | 'success' | 'warning' | 'error';
};

export type UseToastOptions = {
  renderer?: ToastRenderer;
};

interface IToastButtonProps {
  /**
   * User specification for the button
   */
  action: Notification.IAction;

  /**
   * Function closing the notification
   */
  closeToast: () => void;
}

const displayType2Class: Record<Notification.ActionDisplayType, VariantType> = {
  accent: 'primary',
  link: 'invisible',
  warn: 'danger',
  default: 'default',
};

/**
 * Create a button with customized callback in a toast
 */
function ToastButton({ action, closeToast }: IToastButtonProps): JSX.Element {
  const clickHandler = (event: React.MouseEvent): void => {
    action.callback(event as any);
    if (!event.defaultPrevented) {
      closeToast();
    }
  };
  return (
    <Button
      title={action.caption ?? action.label}
      onClick={clickHandler}
      variant={displayType2Class[action.displayType ?? 'default']}
      size="small"
    >
      {action.label}
    </Button>
  );
}

/**
 * Helper function to construct the notification content
 *
 * @param message Message to print in the notification
 * @param closeHandler Function closing the notification
 * @param actions Toast actions
 */
function createContent(
  message: string,
  closeHandler: () => void,
  actions?: Notification.IAction[],
): React.ReactNode {
  return (
    <>
      <div>
        {message.split('\n').map((part, index) => (
          <React.Fragment key={`part-${index}`}>
            {index > 0 ? <br /> : null}
            {part}
          </React.Fragment>
        ))}
      </div>
      {(actions?.length ?? 0) > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginTop: 8,
            justifyContent: 'flex-end',
          }}
        >
          {actions!.map((action, idx) => {
            return (
              <ToastButton
                key={'button-' + idx}
                action={action}
                closeToast={closeHandler}
              />
            );
          })}
        </div>
      )}
    </>
  );
}

export const useToast = (hookOptions?: UseToastOptions) => {
  const enqueueToast = (
    message: string,
    toastOptions: ToastProps = { variant: 'info' },
  ) => {
    const { actions, autoClose } = toastOptions;
    const renderer = resolveToastRenderer(hookOptions?.renderer);
    switch (toastOptions.variant) {
      case 'info': {
        return renderer === 'jupyterlab'
          ? Notification.info(message, {
              autoClose: autoClose ?? 5000,
              actions,
            })
          : toast.info(
              ({ closeToast }: { closeToast?: () => void }) =>
                createContent(
                  message,
                  () => {
                    if (closeToast) closeToast();
                  },
                  actions,
                ),
              getWebToastOptions(autoClose),
            );
      }
      case 'success': {
        return renderer === 'jupyterlab'
          ? Notification.success(message, {
              autoClose: autoClose ?? 5000,
              actions,
            })
          : toast.success(
              ({ closeToast }: { closeToast?: () => void }) =>
                createContent(
                  message,
                  () => {
                    if (closeToast) closeToast();
                  },
                  actions,
                ),
              getWebToastOptions(autoClose),
            );
      }
      case 'warning': {
        return renderer === 'jupyterlab'
          ? Notification.warning(message, {
              autoClose: autoClose ?? false,
              actions,
            })
          : toast.warning(
              ({ closeToast }: { closeToast?: () => void }) =>
                createContent(
                  message,
                  () => {
                    if (closeToast) closeToast();
                  },
                  actions,
                ),
              getWebToastOptions(autoClose ?? false),
            );
      }
      case 'error': {
        return renderer === 'jupyterlab'
          ? Notification.error(message, {
              autoClose: autoClose ?? false,
              actions,
            })
          : toast.error(
              ({ closeToast }: { closeToast?: () => void }) =>
                createContent(
                  message,
                  () => {
                    if (closeToast) closeToast();
                  },
                  actions,
                ),
              getWebToastOptions(autoClose ?? false),
            );
      }
    }
  };

  const trackAsyncTask = (
    promise: Promise<any>,
    options: Notification.IPromiseOptions<any>,
  ) => {
    const renderer = resolveToastRenderer(hookOptions?.renderer);
    return renderer === 'jupyterlab'
      ? Notification.promise(promise, options)
      : toast.promise(
          promise,
          {
            error: { render: options.error.message, ...options.error.options },
            pending: options.pending.message,
            success: {
              render: options.success.message,
              ...options.success.options,
            },
          },
          {
            theme: getWebToastTheme(),
            position: TOAST_POSITION,
            ...options.pending.options,
          },
        );
  };

  return Object.freeze({
    /**
     * Emit a message as a toast.
     *
     * @param message Toast message
     * @param options Toast option
     * @returns Toast id
     */
    enqueueToast,
    /**
     * Dismiss a toast
     *
     * @param id Toast id
     */
    dismiss: (id?: Id) => {
      const renderer = resolveToastRenderer(hookOptions?.renderer);
      if (renderer === 'jupyterlab') {
        Notification.dismiss(id as string | undefined);
      } else {
        toast.dismiss(id);
      }
    },
    /**
     * Track the progress of an asynchronous task
     * and display a message depending on the outcome.
     *
     * @param promise Asynchronous task
     * @param options Task progress options
     * @returns Toast id
     */
    trackAsyncTask,
  });
};

export default useToast;
