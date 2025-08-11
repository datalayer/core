/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { createContext, useState, useContext } from 'react';
import styled from 'styled-components';

type JupyterLabBackdropType = {
  open: boolean;
  element?: JSX.Element | JSX.Element[];
};

const JupyterLabBackdropComponent = styled.div`
  position: fixed;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: rgba(0, 0, 0, 0.3);
  height: 100vh;
  width: 100vw;
  right: 0;
  top: 0;
  z-index: 1000000000;
`;

function JupyterLabBackdrop({ open, element }: JupyterLabBackdropType) {
  return open ? <JupyterLabBackdropComponent>{element}</JupyterLabBackdropComponent> : <></>;
}

export default JupyterLabBackdrop;

 
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface JupyterLabBackdropProps {}

type UseJupyterLabBackdropProps = {
  openBackdrop: (element: JSX.Element) => void;
  closeBackdrop: () => void;
};

const JupyterLabBackdropContext = createContext<UseJupyterLabBackdropProps>({
  openBackdrop: (element: JSX.Element) => {
    /* no-op */
  },
  closeBackdrop: () => {
    /* no-op */
  }
});

const JupyterLabBackdropProvider = ({
  children
}: React.PropsWithChildren<JupyterLabBackdropProps>) => {
  const [opened, setOpened] = useState<boolean>(false);
  const [element, setElement] = useState<JSX.Element>();
  const openBackdrop = (element: JSX.Element) => {
    setElement(element);
    setOpened(true);
  };
  const closeBackdrop = () => {
    setElement(undefined);
    setOpened(false);
  };
  return (
    <JupyterLabBackdropContext.Provider
      value={{
        openBackdrop: openBackdrop,
        closeBackdrop: closeBackdrop
      }}
    >
      <JupyterLabBackdrop open={opened} element={element} />
      {children}
    </JupyterLabBackdropContext.Provider>
  );
};

function useJupyterLabBackdrop() {
  return useContext(JupyterLabBackdropContext);
}

export { useJupyterLabBackdrop, JupyterLabBackdropProvider };
