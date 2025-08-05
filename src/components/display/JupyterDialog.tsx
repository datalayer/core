/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { JSXElementConstructor, PropsWithChildren, createElement, useState } from 'react';
import { Dialog } from '@jupyterlab/apputils';
import { ReactWidget } from '@jupyterlab/ui-components';
import { PromiseDelegate } from '@lumino/coreutils';
import { Widget } from '@lumino/widgets';
import { FocusKeys } from '@primer/behaviors';
import { Checkbox, FormControl, useFocusZone } from '@primer/react';
import { DialogButtonProps, DialogProps, Dialog as PrimerDialog } from '@primer/react/experimental';

type IDialogFooterProps = React.PropsWithChildren<DialogProps> & {
  checkbox: Partial<Dialog.ICheckbox> | null;
  setChecked: (v: boolean) => void;
}

function DialogFooter(props: IDialogFooterProps): JSX.Element {
  const { checkbox, footerButtons, setChecked } = props;
  const [checked, setLocalChecked] = useState<boolean>();
  const { containerRef: footerRef } = useFocusZone({
    bindKeys: FocusKeys.ArrowHorizontal | FocusKeys.Tab,
    focusInStrategy: 'closest'
  });
  return (
    <PrimerDialog.Footer className="dla-dialog-footer" ref={footerRef as React.RefObject<HTMLDivElement>}>
      {checkbox &&
        <FormControl layout="horizontal">
          <Checkbox
            className={checkbox.className ?? ''}
            checked={checked}
            defaultChecked={checkbox.checked}
            onChange={e => {
              setLocalChecked(e.target.checked);
              setChecked(e.target.checked);
            }}
            title={checkbox.caption ?? ''}
          />
          <FormControl.Label>{checkbox.label ?? ''}</FormControl.Label>
        </FormControl>
      }
      <div className="dla-dialog-footer-spacer"></div>
      {footerButtons &&
        <PrimerDialog.Buttons buttons={footerButtons}></PrimerDialog.Buttons>
      }
    </PrimerDialog.Footer>
  );
}

/**
 * {@link JupyterDialog} options
 */
export interface IDialogWrapperOptions<T> {
  /**
   * Node to which the dialog will be attached
   */
  host: HTMLElement;
  /**
   * React element factory for the dialog body.
   *
   * The body component is receiving two special props:
   * - {@link willClose} A signal emitted when the dialog is closing;
   *   body is expected to call {@link setValue} in reaction.
   * - {@link setValue} A callback to set the dialog body value.
   */
  body: JSXElementConstructor<PropsWithChildren<DialogProps & { setValue: (v: T | Error) => void; }>>;
  /**
   * The checkbox to display in the footer. Default non checkbox.
   */
  checkbox: Partial<Dialog.ICheckbox> | null;
  /**
   * The buttons to display.
   */
  buttons: Dialog.IButton[];
  /**
   * The top level text for the dialog.
   */
  title: string;
}

/**
 * A primer dialog mimicking the JupyterLab dialog interface
 */
export class JupyterDialog<T> extends ReactWidget {
  protected body: JSXElementConstructor<PropsWithChildren<DialogProps & { setValue: (v: T | Error) => void; }>>;
  protected checkbox: Partial<Dialog.ICheckbox> | null;
  protected buttons: Dialog.IButton[];
  protected host: HTMLElement;
  protected dialogTitle?: string;
  private _closing = new PromiseDelegate<void>();
  private _result: Dialog.IResult<T> = {
    button: null as any,
    isChecked: null,
    value: null
  };

  /**
   * Create a dialog instance.
   */
  constructor(options: Partial<IDialogWrapperOptions<T>> = {}) {
    super();
    this.host = options.host ?? document.body;
    this.body = options.body ?? (() => null);
    this.checkbox = options.checkbox ?? null;
    this.buttons = options.buttons ?? [
      Dialog.cancelButton(),
      Dialog.okButton()
    ];
    this.dialogTitle = options.title;
  }

  private _renderBody = (props: PropsWithChildren<DialogProps>) => (
    <PrimerDialog.Body>
      {createElement(this.body, {
        ...props,
        setValue: this.setValue
      })}
    </PrimerDialog.Body>
  )

  private _renderFooter = (props: PropsWithChildren<DialogProps>) => (
    <DialogFooter
      {...props}
      checkbox={this.checkbox}
      setChecked={this.setChecked}
    />
  )

  protected render(): JSX.Element | null {
    return (
      <PrimerDialog
        sx={{
          color: 'var(--fgColor-default)',
          backgroundColor: 'var(--bgColor-default)',
          fontFamily: 'var(--fontStack-system)',
          fontSize: 'var(--text-body-size-medium)',
          lineHeight: 'var(--text-body-lineHeight-medium)',
        }}
        onClose={this.close}
        footerButtons={this.buttons.map((but, idx) => {
          const footerButton: DialogButtonProps = {
            buttonType: but.displayType === 'default'
              ? but.accept ? 'primary' : 'default'
              : 'danger',
            onClick: () => { this.handleButton(idx) },
            content: but.label,
            'aria-label': but.ariaLabel,
            autoFocus: but.accept
          };
          return footerButton;
        })}
        renderBody={this._renderBody}
        renderFooter={this._renderFooter}
        title={this.dialogTitle}
      />
    );
  }

  /**
   * Launch the dialog as a modal window.
   *
   * @returns a promise that resolves with the result of the dialog.
   */
  async launch(): Promise<Dialog.IResult<T>> {
    Widget.attach(this, this.host);
    await this._closing.promise;
    return this._result;
  }

  protected handleButton = (idx: number): void => {
    this.setButton(this.buttons[idx]);
    this.close();
  }

  protected setButton = (button: Dialog.IButton): void => {
    this._result.button = button;
  }

  protected setChecked = (c: boolean): void => {
    this._result.isChecked = c;
  }

  protected setValue = (v: T | Error): void => {
    if (v instanceof Error) {
      this._closing.reject(v);
    } else {
      this._result.value = v;
    }
  }

  close = (): void => {
    Widget.detach(this);
    this._closing.resolve();
  };

}

export default JupyterDialog;
