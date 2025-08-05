/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/*
 * Copyright (c) 2021-2024 Datalayer, Inc.
 *
 * Datalayer License
 */

import React from 'react';
import { type Id, toast } from 'react-toastify';
import { Notification } from '@jupyterlab/apputils';
import { Button } from '@primer/react';
import type { VariantType } from './../components/buttons';
import { isInsideJupyterLab } from '../utils';
import { DatalayerThemeProvider } from '../theme';

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

const TOAST_POSITION = toast.POSITION.BOTTOM_RIGHT;

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
  default: 'default'
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
  actions?: Notification.IAction[]
): React.ReactNode {
  return (
    <>
      <div className="jp-toast-message">
        {message.split('\n').map((part, index) => (
          <React.Fragment key={`part-${index}`}>
            {index > 0 ? <br /> : null}
            {part}
          </React.Fragment>
        ))}
      </div>
      {(actions?.length ?? 0) > 0 && (
        <div className="jp-toast-buttonBar">
          <div className="jp-toast-spacer" />
          {actions!.map((action, idx) => {
            return (
              <DatalayerThemeProvider>
                <ToastButton
                  key={'button-' + idx}
                  action={action}
                  closeToast={closeHandler}
                />
              </DatalayerThemeProvider>
            );
          })}
        </div>
      )}
    </>
  );
}

export const useToast = () => {
  // This CANNOT use React hooks as it is used outside React context.
  const insideJupyterLab = isInsideJupyterLab();
  const enqueueToast = (
    message: string,
    options: ToastProps = { variant: 'info' }
  ) => {
    const { actions, autoClose } = options;
    switch (options.variant) {
      case 'info': {
        return insideJupyterLab
          ? 
            Notification.info(message, {
              autoClose: autoClose ?? 5000,
              actions
            })
          : toast.info(
              ({ closeToast }: { closeToast?: () => void }) =>
                createContent(
                  message,
                  () => {
                    if (closeToast) closeToast();
                  },
                  actions
                ),
              { autoClose, position: TOAST_POSITION }
            );
      }
      case 'success': {
        return insideJupyterLab
          ? Notification.success(message, {
              autoClose: autoClose ?? 5000,
              actions
            })
          : toast.success(
              ({ closeToast }: { closeToast?: () => void }) =>
                createContent(
                  message,
                  () => {
                    if (closeToast) closeToast();
                  },
                  actions
                ),
              { autoClose, position: TOAST_POSITION }
            );
      }
      case 'warning': {
        return insideJupyterLab
          ? Notification.warning(message, {
              autoClose: autoClose ?? false,
              actions
            })
          : toast.warning(
              ({ closeToast }: { closeToast?: () => void }) =>
                createContent(
                  message,
                  () => {
                    if (closeToast) closeToast();
                  },
                  actions
                ),
              { autoClose: autoClose ?? false, position: TOAST_POSITION }
            );
      }
      case 'error': {
        return insideJupyterLab
          ? Notification.error(message, {
              autoClose: autoClose ?? false,
              actions
            })
          : toast.error(
              ({ closeToast }: { closeToast?: () => void }) =>
                createContent(
                  message,
                  () => {
                    if (closeToast) closeToast();
                  },
                  actions
                ),
              { autoClose: autoClose ?? false, position: TOAST_POSITION }
            );
      }
    }
  };

  const trackAsyncTask = (
    promise: Promise<any>,
    options: Notification.IPromiseOptions<any>, 
  ) => {
    return insideJupyterLab
      ? Notification.promise(promise, options)
      : toast.promise(
          promise,
          {
            error: { render: options.error.message, ...options.error.options },
            pending: options.pending.message,
            success: { render: options.success.message, ...options.success.options }
          },
          {
            position: TOAST_POSITION,
            ...options.pending.options
          }
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
      insideJupyterLab
        ? Notification.dismiss(id as string | undefined)
        : toast.dismiss(id);
    },
    /**
     * Track the progress of an asynchronous task
     * and display a message depending on the outcome.
     *
     * @param promise Asynchronous task
     * @param options Task progress options
     * @returns Toast id
     */
    trackAsyncTask
  });
};

export default useToast;
