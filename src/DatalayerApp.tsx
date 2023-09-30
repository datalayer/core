import { createRoot } from 'react-dom/client';
import DatalayerJupyterLabHeadless from './DatalayerJupyterLabHeadless';

const div = document.createElement('div');
document.body.appendChild(div);
const root = createRoot(div);

if ((module as any).hot) {
  (module as any).hot.accept('./DatalayerJupyterLabHeadless', () => {
    const DatalayerJupyterLabHeadless = require('./DatalayerJupyterLabHeadless').default;
    root.render(<DatalayerJupyterLabHeadless/>);
  })
}

root.render(<DatalayerJupyterLabHeadless/>);
