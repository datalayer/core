/*
 * Copyright (c) 2021-2024 Datalayer, Inc.
 *
 * Datalayer License
 */

import { PropsWithChildren } from "react";
import { Link, Tooltip, Button } from "@primer/react";
import { ScreenFullIcon } from "@primer/octicons-react";
import { lazyWithPreload, WithSuspense } from "../../utils";
import { useToast } from "../../hooks";
import { useLayoutStore } from "../../state";

const ScreenCapture = WithSuspense(lazyWithPreload(() => import("../screenshot/ScreenCapture")));

export const ScreenCaptureButton = (props: PropsWithChildren) => {
  const { enqueueToast } = useToast();
  const { setScreenCapture, hideScreenshot } = useLayoutStore();
  const handleScreenCapture = (screenCapture: string) => {
    setScreenCapture(screenCapture);
    hideScreenshot();
    enqueueToast('Screen is captured.', { variant: 'success' });
  };
  return (
    <ScreenCapture onEndCapture={handleScreenCapture}>
      {({ onStartCapture }) => (
        <Tooltip text="Take a screen capture" direction="s">
          <Button variant="invisible">
            <Link href="javascript: return false;"
              sx={{
                color: 'fg.muted',
                ':hover, :focus, &[aria-expanded=true]': {background: 'none !important', color: 'accent.fg'}
              }}
              onClick={e => { e.preventDefault(); onStartCapture(); } }
            >
              <ScreenFullIcon/>
            </Link>
          </Button>
        </Tooltip>
      )}
    </ScreenCapture>
  )
}

export default ScreenCaptureButton;
