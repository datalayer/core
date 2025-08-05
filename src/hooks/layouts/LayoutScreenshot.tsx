/*
 * Copyright (c) 2021-2024 Datalayer, Inc.
 *
 * Datalayer License
 */


import { useEffect } from "react";
import { Box } from "@primer/react";
import { useScreenshot, useToast } from '..';
import { lazyWithPreload, WithSuspense } from "../../utils";
import { useLayoutStore, ScreenshotDisplay } from '../../state';

const ScreenCapture = WithSuspense(lazyWithPreload(() => import("../../components/screenshot/ScreenCapture")));

type IContentScreenshotProps = {
  screenshotDisplay: ScreenshotDisplay;
}

type ICaptureProps = {
  onStartCapture: () => void,
}

const Capture = (props: ICaptureProps) => {
  const { onStartCapture } = props;
  useEffect(() => {
    onStartCapture();
  }, [])
  return <></>
}

const ScreenshotContent = (props: IContentScreenshotProps) => {
//  const { screenshotDisplay } = props;
  const { enqueueToast } = useToast();
  const { setScreenCapture, hideScreenshot } = useLayoutStore();
  const handleScreenCapture = (screenCapture: string) => {
    setScreenCapture(screenCapture);
    hideScreenshot();
    enqueueToast('Screen is captured.', { variant: 'success' });
  };
  return (
    <Box>
      <ScreenCapture onEndCapture={handleScreenCapture}>
        {({ onStartCapture }) => (
          <Capture onStartCapture={onStartCapture}/>
        )}
      </ScreenCapture>
    </Box>
  )
}

export const LayoutScreenshot = () => {
  const { screenshot } = useLayoutStore();
  const { displayScreenshot, closeScreenshot } = useScreenshot();
  useEffect(() => {
    if (screenshot && screenshot.open) {
      displayScreenshot(() => <ScreenshotContent screenshotDisplay={screenshot}/>);
    } else {
      closeScreenshot();
    }
  }, [screenshot]);
  return <></>
}

export default LayoutScreenshot;
