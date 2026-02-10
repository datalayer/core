/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { PropsWithChildren } from 'react';
import { Link, Tooltip, Button } from '@primer/react';
import { ScreenFullIcon } from '@primer/octicons-react';
import { lazyWithPreload, WithSuspense } from '../../utils';
import { useToast } from '../../hooks';
import { useLayoutStore } from '../../state';

const Screencapture = WithSuspense(
  lazyWithPreload(() => import('./Screencapture')),
);

export const ScreencaptureButton = (props: PropsWithChildren) => {
  const { enqueueToast } = useToast();
  const { setScreencapture, hideScreencapture } = useLayoutStore();
  const handleScreencapture = (screenCapture: string) => {
    setScreencapture(screenCapture);
    hideScreencapture();
    enqueueToast('Screen is captured.', { variant: 'success' });
  };
  return (
    <Screencapture onEndCapture={handleScreencapture}>
      {({ onStartCapture }) => (
        <Tooltip text="Take a screen capture" direction="s">
          <Button variant="invisible">
            <Link
              href="javascript: return false;"
              sx={{
                color: 'fg.muted',
                ':hover, :focus, &[aria-expanded=true]': {
                  background: 'none !important',
                  color: 'accent.fg',
                },
              }}
              onClick={e => {
                e.preventDefault();
                onStartCapture();
              }}
            >
              <ScreenFullIcon />
            </Link>
          </Button>
        </Tooltip>
      )}
    </Screencapture>
  );
};

export default ScreencaptureButton;
