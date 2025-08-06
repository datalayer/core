/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { useState } from 'react'
import { useJupyter, JupyterReactTheme, Notebook2 } from '@datalayer/jupyter-react';
import { INotebookContent } from '@jupyterlab/nbformat';
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'

import './App.css'

import nbformat from './examples/NotebookExample1.ipynb.json';

const Notebook2Example = () => {
  const { serviceManager } = useJupyter();
  return (
    serviceManager ?
      <JupyterReactTheme>
        <Notebook2
          nbformat={nbformat as INotebookContent}
          id="notebook-nbformat-id"
          startDefaultKernel
          serviceManager={serviceManager}
          height="calc(100vh - 2.6rem)" // (Height - Toolbar Height).
        />
      </JupyterReactTheme>
    :
      <></>
  )
};


export function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <Notebook2Example/>
      <div>
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React</h1>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
    </>
  )
}

export default App;
