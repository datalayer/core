/*
 * Copyright (c) 2021-2024 Datalayer, Inc.
 *
 * Datalayer License
 */

import { useCallback, useMemo, useRef } from 'react';
import { Button, IconButton } from '@primer/react';
import { UploadIcon } from '@primer/octicons-react';
import type { VariantType } from './VariantType';

interface IUploadBaseButtonProps {
  /**
   * Button component factory
   */
  buttonFactory: (onClick: () => void) => JSX.Element;
  /**
   * Whether the upload support one or more files
   */
  multiple?: boolean;
  /**
   * Upload callback
   */
  upload: (file: File) => Promise<unknown>;
}

function UploadBaseButton(props: IUploadBaseButtonProps): JSX.Element {
  const { buttonFactory, multiple, upload } = props;
  const inputRef = useRef<HTMLInputElement | null>(null);
  const onInputChanged = useCallback(() => {
    if (inputRef.current && inputRef.current.files) {
      const files = Array.from(inputRef.current.files);
      Promise.all(files.map(file => upload(file))).catch(reason => {
        const msg = 'Failed to upload files.';
        console.error(msg, reason);
      });
    }
  }, [inputRef.current, upload]);
  const onInputClick = useCallback(() => {
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  }, [inputRef.current]);
  return (
    <>
      {buttonFactory(() => {
        inputRef.current?.click();
      })}
      <input
        ref={inputRef}
        style={{ display: 'none' }}
        type="file"
        multiple={multiple}
        onClick={onInputClick}
        onChange={onInputChanged}
      />
    </>
  );
}

export interface IUploadIconButtonProps extends Omit<IUploadBaseButtonProps, 'buttonFactory'> {
  /**
   * Button aria-label
   */
  label: string;
}

export function UploadIconButton(props: IUploadIconButtonProps): JSX.Element {
  const { label, ...others } = props;
  const factory = useMemo(
    () => (onClick: () => void) => (
      <IconButton
        aria-label={label}
        icon={UploadIcon}
        size="small"
        variant="invisible"
        onClick={onClick}
      />
    ), []);
  return <UploadBaseButton buttonFactory={factory} {...others} />;
}

export interface IUploadButtonProps extends Omit<IUploadBaseButtonProps, 'buttonFactory'> {
  /**
   * Button aria-label
   */
  label: string;
  /**
   * Button variant
   */
  variant?: VariantType;
}

export function UploadButton(props: IUploadButtonProps): JSX.Element {
  const { label, variant, ...others } = props;
  const factory = useMemo(
    () => (onClick: () => void) => (
      <Button
        aria-label={label}
        leadingVisual={() => <UploadIcon fill="white" />}
        size="small"
        variant={variant}
        onClick={onClick}
      >
        {label}
      </Button>
    ), []);
  return <UploadBaseButton buttonFactory={factory} {...others} />;
}

UploadButton.defaultProps = {
  variant: "primary",
} as Partial<IUploadButtonProps>;

export default UploadButton;
