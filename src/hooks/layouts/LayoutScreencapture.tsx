/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { useEffect } from 'react';
import { Box } from '@primer/react';
import { useScreencapture, useToast } from '..';
import { lazyWithPreload, WithSuspense } from '../../utils';
import { useLayoutStore, ScreencaptureDisplay } from '../../state';

import '../../../style/screencapture/index.css';

const Screencapture = WithSuspense(
  lazyWithPreload(() => import('../../components/screencapture/Screencapture')),
);

type IContentScreencaptureProps = {
  screenshotDisplay: ScreencaptureDisplay;
};

type ICaptureProps = {
  onStartCapture: () => void;
};

const Capture = (props: ICaptureProps) => {
  const { onStartCapture } = props;
  useEffect(() => {
    onStartCapture();
  }, []);
  return <></>;
};

const ScreencaptureContent = (props: IContentScreencaptureProps) => {
  //  const { screenshotDisplay } = props;
  const { enqueueToast } = useToast();
  const { setScreencapture, hideScreencapture } = useLayoutStore();
  const handleScreencapture = (screenCapture: string) => {
    setScreencapture(screenCapture);
    hideScreencapture();
    enqueueToast('Screen is captured.', { variant: 'success' });
  };
  return (
    <Box>
      <Screencapture onEndCapture={handleScreencapture}>
        {({ onStartCapture }) => <Capture onStartCapture={onStartCapture} />}
      </Screencapture>
    </Box>
  );
};

export const LayoutScreencapture = () => {
  const { screenshot } = useLayoutStore();
  const { displayScreencapture, closeScreencapture } = useScreencapture();
  useEffect(() => {
    if (screenshot && screenshot.open) {
      displayScreencapture(() => (
        <ScreencaptureContent screenshotDisplay={screenshot} />
      ));
    } else {
      closeScreencapture();
    }
  }, [screenshot]);
  return <></>;
};

export default LayoutScreencapture;
