/// <reference types="webpack-env" />

import { createRoot } from 'react-dom/client';
import { DatalayerJupyterLabHeadless } from '@datalayer/run';

import "./../style/index.css";

const div = document.createElement('div');
document.body.appendChild(div);
const root = createRoot(div);

if (module.hot) {
  module.hot.accept('./DatalayerJupyterLabHeadless', () => {
    const DatalayerJupyterLabHeadless = require('./DatalayerJupyterLabHeadless').default;
    root.render(<DatalayerJupyterLabHeadless/>);
  })
}

root.render(<DatalayerJupyterLabHeadless/>);
