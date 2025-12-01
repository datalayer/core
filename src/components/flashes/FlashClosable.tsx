/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import {
  AlertIcon,
  CheckIcon,
  InfoIcon,
  StopIcon,
  XIcon,
} from '@primer/octicons-react';
import { Flash as PrimerFlash, FlashProps, IconButton } from '@primer/react';
import { Box } from '@datalayer/primer-addons';
import { useCallback, useState } from 'react';

/**
 * {@link FlashClosable} component properties
 */
export interface IFlashDatalayerProps extends FlashProps {
  /**
   * Actions to display in the flash message
   */
  actions?: React.ReactNode;
  /**
   * Whether the flash component is closable or not (default not)
   */
  closable?: boolean;
}

/**
 * Closable flash component with actions.
 */
export const FlashClosable = ({
  actions,
  children,
  closable = true,
  variant,
  sx,
  ...others
}: IFlashDatalayerProps): JSX.Element => {
  const [open, setOpen] = useState(true);
  const visual =
    variant === 'warning' ? (
      <AlertIcon />
    ) : variant === 'success' ? (
      <CheckIcon />
    ) : variant === 'danger' ? (
      <StopIcon />
    ) : (
      <InfoIcon />
    );

  const onClose = useCallback(() => {
    if (closable) {
      setOpen(false);
    }
  }, [closable]);
  return open ? (
    <PrimerFlash
      {...others}
      variant={variant}
      sx={{
        ...sx,
        margin: 'var(--stack-gap-condensed) 0',
        display: 'grid',
        gridTemplateColumns: 'min-content 1fr minmax(0, auto)',
        gridTemplateRows: 'min-content',
        gridTemplateAreas: "'visual message actions close'",
        '@media screen and (max-width: 544px)': {
          gridTemplateColumns: 'min-content 1fr',
          gridTemplateRows: 'min-content min-content',
          gridTemplateAreas: `
                'visual message close'
                '.      actions actions'
              `,
        },
      }}
    >
      <Box
        sx={{
          display: 'grid',
          paddingBlock: 'var(--base-size-8)',
          alignSelf: 'center',
          gridArea: 'visual',
        }}
      >
        {visual}
      </Box>
      <Box
        sx={{
          alignSelf: 'center',
          display: 'grid',
          gridArea: 'message',
        }}
      >
        {children}
      </Box>
      <Box
        sx={{
          display: 'grid',
          gap: 'var(--stack-gap-condensed)',
          marginLeft: 'actions',
          '@media screen and (max-width: 544px)': {
            alignSelf: 'start',
            margin: 'var(--base-size-8) 0 0 var(--base-size-8)',
          },
        }}
      >
        {actions}
      </Box>
      {closable && (
        <Box
          sx={{
            alignSelf: 'start',
            marginLeft: 'close',
          }}
        >
          <IconButton
            aria-label="Dismiss flash message"
            title="Dismiss"
            onClick={onClose}
            variant="invisible"
            icon={XIcon}
            sx={{
              '& > svg': { marginRight: 0, color: 'var(--fgColor-default)' },
            }}
          />
        </Box>
      )}
    </PrimerFlash>
  ) : (
    <></>
  );
};

export default FlashClosable;
