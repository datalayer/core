/*
 * Copyright (c) 2021-2024 Datalayer, Inc.
 *
 * Datalayer License
 */

import { createContext, useState, useContext } from 'react';
import PropTypes from 'prop-types';
import { LayoutBackdrop } from "./layouts";

type BackdropContextType = {
  closeBackdrop: () => void;
  displayBackdrop: (nextBackdrop: any) => void;
};

export const BackdropContext = createContext<BackdropContextType>({
  closeBackdrop: () => {},
  displayBackdrop: (nextBackdrop: any) => {},
});

export function useBackdrop(): BackdropContextType {
  const context = useContext(BackdropContext);
  if (!context)
  throw new Error('useContext must be inside a provider with a value.');
  return context;
}

/**
 * The type for the Backdrop context provider.
 */
export const BackdropContextProvider = BackdropContext.Provider;

type IBackdropProviderProps = {
  children?: JSX.Element | JSX.Element[];
  zIndex?: number;
  disableDarken?: boolean;
  backdropSurface?: any;
}

/*
Example
-------
import React from 'react'
import { BackdropProvider } from 'use-backdrop';
import ExampleComponent from './ExampleComponent'
const renderCustomBackdropSurface = (children) => (
  <div style={{
    // Style your own backdrop surface!
    position: 'fixed',
    top: 0,
    left: 0,
    height: '100vh',
    width: '100vw',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  }}>
    {children}
  </div>
)
const App = () => (
  <BackdropProvider 
    backdropSurface={renderCustomBackdropSurface}
  >
    <ExampleComponent />
  </BackdropProvider>
)
export default App
*/
export function BackdropProvider(props: IBackdropProviderProps) {
  const { children, zIndex, disableDarken, backdropSurface } = props;
  const defaultBackdropSurface = {
    position: "fixed",
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: disableDarken ? 'initial' : 'rgba(0, 0, 0, 0.5)',
    zIndex,
  }
  const [backdrop, setBackdrop] = useState({
    open: false,
    render: (closeBackdrop: any) => <></>
  })
  const displayBackdrop = (nextBackdrop: any) => {
    setBackdrop({
      open: true,
      render: nextBackdrop
    });
  }
  const closeBackdrop = () => {
    setBackdrop({
      open: false,
      render: (closeBackdrop: any) => <></>
    });
  }
  return (
    <BackdropContextProvider value={{ closeBackdrop, displayBackdrop }}>
      <LayoutBackdrop/>
      {children}
      { backdrop.open &&
        (backdropSurface ? (
          backdropSurface(backdrop.render(closeBackdrop))
        ) : (
          <div style={defaultBackdropSurface as any}>
            {backdrop.render(closeBackdrop)}
          </div>
        ))}
    </BackdropContextProvider>
  )
}

BackdropProvider.propTypes = {
  children: PropTypes.element,
  // zIndex of the backdrop surface. Unused if backdropSurface is overridden.
  zIndex: PropTypes.number,
  // If true, backdrop background is transparent.
  disableDarken: PropTypes.bool,
  // A render function that returns a Component that overrides (takes the
  // place of) the default darkened div background.
  // See /example/src/ExampleApp.jsx for proper use.
  backdropSurface: PropTypes.func
}

BackdropProvider.defaultProps = {
  children: undefined,
  disableBackdrop: false,
  zIndex: 9999,
  backdropSurface: null
} as IBackdropProviderProps;
