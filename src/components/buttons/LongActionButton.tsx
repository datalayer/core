/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/*
 * Copyright (c) 2021-2024 Datalayer, Inc.
 *
 * Datalayer License
 */

import { useCallback, useState, type ElementType } from 'react';
import { IconButton, Spinner } from '@primer/react';

type ILongActionButtonProps = {
  /**
   * Button onClick callback
   */
  onClick: () => Promise<void>;
  /**
   * Button icon
   */
  icon: ElementType<any>;
  /**
   * Force displaying button as inProgress
   */
  inProgress?: boolean;
  /**
   * Button label
   */
  label: string;
  /**
   * Button disabled state
   */
  disabled?: boolean;
}

/**
 * Icon button displaying a spinner while its callback is running.
 */
export function LongActionButton(props: ILongActionButtonProps): JSX.Element {
  const { label, disabled, onClick, icon, inProgress } = props;
  const [internalInProgress, setInternalInProgress] = useState(false);
  const handleClick = useCallback(async () => {
    setInternalInProgress(true);
    try {
      await onClick();
    } finally {
      setInternalInProgress(false);
    }
  }, [onClick, setInternalInProgress]);
  return (
    <IconButton
      aria-label={label}
      title={label}
      disabled={disabled || internalInProgress || inProgress}
      icon={internalInProgress || inProgress ? () => <Spinner size="small" /> : icon}
      size="small"
      variant="invisible"
      onClick={handleClick}
    />
  );
}
