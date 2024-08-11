/// <reference types="webpack-env" />

import { createRoot } from 'react-dom/client';
import { CoreExample } from '@datalayer/run';

import "./../style/index.css";

const div = document.createElement('div');
document.body.appendChild(div);
const root = createRoot(div);
/*
if (module.hot) {
  module.hot.accept('./CoreExample', () => {
    const CoreExample = require('./CoreExample').default;
    root.render(<CoreExample/>);
  })
}
*/
root.render(<CoreExample/>);
