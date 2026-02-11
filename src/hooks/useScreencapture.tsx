/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { createContext, useState, useContext, ReactNode } from 'react';
import { LayoutScreencapture } from './layouts';

export type ScreencaptureContextType = {
  closeScreencapture: () => void;
  displayScreencapture: (nextScreencapture: any) => void;
};

export const ScreencaptureContext = createContext<ScreencaptureContextType>({
  closeScreencapture: () => {},
  displayScreencapture: (nextScreencapture: any) => {},
});

export function useScreencapture(): ScreencaptureContextType {
  const context = useContext(ScreencaptureContext);
  if (!context)
    throw new Error('useContext must be inside a provider with a value.');
  return context;
}

/**
 * The type for the Screencapture context provider.
 */
export const ScreencaptureContextProvider = ScreencaptureContext.Provider;

export type IScreencaptureProviderProps = {
  children?: ReactNode;
  zIndex?: number;
  disableDarken?: boolean;
  screenshotSurface?: (qfds: any) => JSX.Element;
};

export function ScreencaptureProvider({
  children = null,
  zIndex = 9999,
  disableDarken = false,
  screenshotSurface = undefined,
}: IScreencaptureProviderProps) {
  const defaultScreencaptureSurface = {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: disableDarken ? 'initial' : 'rgba(0, 0, 0, 0.5)',
    zIndex,
  };
  const [screenshot, setScreencapture] = useState({
    open: false,
    render: (closeScreencapture: any) => <></>,
  });
  const displayScreencapture = (nextScreencapture: any) => {
    setScreencapture({
      open: true,
      render: nextScreencapture,
    });
  };
  const closeScreencapture = () => {
    setScreencapture({
      open: false,
      render: (closeScreencapture: any) => <></>,
    });
  };
  return (
    <ScreencaptureContextProvider
      value={{ closeScreencapture, displayScreencapture }}
    >
      <LayoutScreencapture />
      {children}
      {screenshot.open &&
        (screenshotSurface ? (
          screenshotSurface(screenshot.render(closeScreencapture))
        ) : (
          <div style={defaultScreencaptureSurface as any}>
            {screenshot.render(closeScreencapture)}
          </div>
        ))}
    </ScreencaptureContextProvider>
  );
}
