/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { createContext, useState, useContext, ReactNode } from 'react';
import { LayoutScreenshot } from './layouts';

export type ScreenshotContextType = {
  closeScreenshot: () => void;
  displayScreenshot: (nextScreenshot: any) => void;
};

export const ScreenshotContext = createContext<ScreenshotContextType>({
  closeScreenshot: () => {},
  displayScreenshot: (nextScreenshot: any) => {},
});

export function useScreenshot(): ScreenshotContextType {
  const context = useContext(ScreenshotContext);
  if (!context)
    throw new Error('useContext must be inside a provider with a value.');
  return context;
}

/**
 * The type for the Screenshot context provider.
 */
export const ScreenshotContextProvider = ScreenshotContext.Provider;

export type IScreenshotProviderProps = {
  children?: ReactNode;
  zIndex?: number;
  disableDarken?: boolean;
  screenshotSurface?: (qfds: any) => JSX.Element;
};

export function ScreenshotProvider({
  children = null,
  zIndex = 9999,
  disableDarken = false,
  screenshotSurface = undefined,
}: IScreenshotProviderProps) {
  const defaultScreenshotSurface = {
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
  const [screenshot, setScreenshot] = useState({
    open: false,
    render: (closeScreenshot: any) => <></>,
  });
  const displayScreenshot = (nextScreenshot: any) => {
    setScreenshot({
      open: true,
      render: nextScreenshot,
    });
  };
  const closeScreenshot = () => {
    setScreenshot({
      open: false,
      render: (closeScreenshot: any) => <></>,
    });
  };
  return (
    <ScreenshotContextProvider value={{ closeScreenshot, displayScreenshot }}>
      <LayoutScreenshot />
      {children}
      {screenshot.open &&
        (screenshotSurface ? (
          screenshotSurface(screenshot.render(closeScreenshot))
        ) : (
          <div style={defaultScreenshotSurface as any}>
            {screenshot.render(closeScreenshot)}
          </div>
        ))}
    </ScreenshotContextProvider>
  );
}
